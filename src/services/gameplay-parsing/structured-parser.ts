import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

import BattleParserFactory, {
  type BattleMetadata,
} from '@/src/services/pokemon/battle';
import type { CreateBattleData } from '@/src/types/api';

import type { LLMEngine } from './llm-engine';
import SYSTEM_PROMPT from './structured-parser-prompt.md';
import type { ExtractedParagraph } from './types';

export interface StructuredParsingProgress {
  current: number;
  total: number;
}

export class StructuredParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredParserError';
  }
}

export class StructuredParser {
  private static readonly CHAT_INPUT_TOKEN_BUDGET = 750;
  private static readonly RESPONSE_TOKEN_RESERVE = 512;
  private static readonly SUMMARY_CHUNK_TOKEN_SIZE = 700;
  private static readonly SUMMARY_MAX_TOKENS = 320;

  private llmEngine: LLMEngine;

  constructor(llmEngine: LLMEngine) {
    this.llmEngine = llmEngine;
  }

  /** Max number of recent user/assistant message pairs before token-based pruning */
  private static readonly SLIDING_WINDOW_SIZE = 10;

  async convertToSimProtocol(
    paragraphs: ExtractedParagraph[],
    onProgress?: (progress: StructuredParsingProgress) => void,
  ): Promise<string> {
    if (paragraphs.length === 0) {
      console.error('[StructuredParser] No paragraphs supplied');
      throw new StructuredParserError('No paragraphs to convert.');
    }

    console.debug('[StructuredParser] Starting protocol conversion', {
      paragraphCount: paragraphs.length,
    });
    const engine = this.llmEngine.getEngine();
    const systemMessages = await this.buildSystemMessages();
    console.debug('[StructuredParser] System prompt ready', {
      systemMessageCount: systemMessages.length,
    });
    const history: ChatCompletionMessageParam[] = [];
    const protocolChunks: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const line = this.formatParagraph(paragraphs[i]);
      history.push({ role: 'user', content: line });

      // Keep only the last N pairs (2 messages each) to stay within context window
      const maxMessages = StructuredParser.SLIDING_WINDOW_SIZE * 2;
      const windowedHistory = history.slice(-maxMessages);
      const prunedMessages = await this.llmEngine.pruneMessagesFIFO(
        [...systemMessages, ...windowedHistory],
        {
          maxInputTokens: StructuredParser.CHAT_INPUT_TOKEN_BUDGET,
          reserveOutputTokens: StructuredParser.RESPONSE_TOKEN_RESERVE,
          protectedMessageCount: systemMessages.length,
        },
      );

      console.debug('[StructuredParser] Requesting completion', {
        paragraphIndex: i,
        paragraphCount: paragraphs.length,
        messageCount: prunedMessages.length,
      });
      let response;
      try {
        response = await engine.chat.completions.create({
          messages: prunedMessages,
          temperature: 0.1,
          max_tokens: StructuredParser.RESPONSE_TOKEN_RESERVE,
        });
      } catch (error) {
        console.error('[StructuredParser] Completion failed', {
          paragraphIndex: i,
          paragraphCount: paragraphs.length,
          messageCount: prunedMessages.length,
          error,
        });
        throw error;
      }

      const content = response.choices[0]?.message?.content?.trim() ?? '';
      history.push({ role: 'assistant', content });

      if (content.length > 0) {
        protocolChunks.push(content);
      }

      onProgress?.({ current: i + 1, total: paragraphs.length });
    }

    const result = protocolChunks.join('\n');
    if (result.length === 0) {
      console.error('[StructuredParser] LLM returned no protocol output');
      throw new StructuredParserError(
        'LLM returned empty response for all paragraphs.',
      );
    }

    return result;
  }

  parseSimProtocol(
    simProtocolText: string,
    metadata: BattleMetadata,
  ): CreateBattleData {
    console.debug('[StructuredParser] Parsing sim protocol', {
      protocolCharacters: simProtocolText.length,
      battleName: metadata.name,
    });
    const parser = BattleParserFactory.getParser('showdown-sim-protocol');
    try {
      return parser.parse(metadata, simProtocolText);
    } catch (error) {
      console.error('[StructuredParser] Sim protocol parsing failed', {
        protocolCharacters: simProtocolText.length,
        battleName: metadata.name,
        error,
      });
      throw error;
    }
  }

  async parse(
    paragraphs: ExtractedParagraph[],
    metadata: BattleMetadata,
    onProgress?: (progress: StructuredParsingProgress) => void,
  ): Promise<{ simProtocol: string; battleData: CreateBattleData }> {
    const simProtocol = await this.convertToSimProtocol(paragraphs, onProgress);
    const battleData = this.parseSimProtocol(simProtocol, metadata);
    return { simProtocol, battleData };
  }

  private formatParagraph(paragraph: ExtractedParagraph): string {
    const texts = paragraph.extractions
      .map((e) => e.text)
      .filter((t) => t.trim().length > 0);
    if (texts.length === 0)
      return `[${paragraph.timestamp.toFixed(1)}s] (empty)`;
    return `[${paragraph.timestamp.toFixed(1)}s] ${texts.join(' | ')}`;
  }

  private async buildSystemMessages(): Promise<ChatCompletionMessageParam[]> {
    const promptTokens = await this.llmEngine.countTextTokens(SYSTEM_PROMPT);
    console.debug('[StructuredParser] Measured system prompt', {
      promptTokens,
      inputTokenBudget: StructuredParser.CHAT_INPUT_TOKEN_BUDGET,
    });
    if (promptTokens <= StructuredParser.CHAT_INPUT_TOKEN_BUDGET) {
      return [{ role: 'system', content: SYSTEM_PROMPT }];
    }

    const summarizedPrompt = await this.summarizeLargePrompt(SYSTEM_PROMPT);
    return [{ role: 'system', content: summarizedPrompt }];
  }

  private async summarizeLargePrompt(text: string): Promise<string> {
    console.debug('[StructuredParser] Summarizing large system prompt', {
      textCharacters: text.length,
    });
    const engine = this.llmEngine.getEngine();
    const chunks = await this.llmEngine.chunkTextByTokens(
      text,
      StructuredParser.SUMMARY_CHUNK_TOKEN_SIZE,
    );

    const mapSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.debug('[StructuredParser] Summarizing prompt chunk', {
        chunkIndex: i,
        chunkCount: chunks.length,
        chunkCharacters: chunks[i].length,
      });
      const chunkSummary = await this.summarizeChunk(
        engine,
        chunks[i],
        i + 1,
        chunks.length,
      );
      mapSummaries.push(chunkSummary);
    }

    let rollingSummary = mapSummaries[0] ?? '';
    for (let i = 1; i < mapSummaries.length; i++) {
      console.debug('[StructuredParser] Reducing prompt summary', {
        summaryIndex: i,
        summaryCount: mapSummaries.length,
      });
      const combined = [
        `Current consolidated summary:\n${rollingSummary}`,
        `New chunk summary:\n${mapSummaries[i]}`,
      ].join('\n\n');

      rollingSummary = await this.summarizeChunk(
        engine,
        combined,
        i + 1,
        mapSummaries.length,
        true,
      );
    }

    return [
      'You are a Pokemon battle log converter.',
      'Follow these compressed rules exactly:',
      rollingSummary,
    ].join('\n\n');
  }

  private async summarizeChunk(
    engine: ReturnType<LLMEngine['getEngine']>,
    chunk: string,
    index: number,
    total: number,
    isRolling = false,
  ): Promise<string> {
    const summarizerSystem =
      'You compress prompt instructions while preserving all mandatory rules, output formats, and constraints. Keep only actionable instructions and remove duplicates.';
    const taskLabel = isRolling ? 'rolling-reduce' : 'map';
    const summarizerUser = [
      `Phase: ${taskLabel}`,
      `Chunk: ${index}/${total}`,
      'Summarize this content as concise, lossless instructions for another LLM.',
      'Preserve all format requirements, protocol details, and behavioral constraints.',
      'Return plain text only, no markdown fences.',
      '',
      chunk,
    ].join('\n');

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: summarizerSystem },
      { role: 'user', content: summarizerUser },
    ];

    const pruned = await this.llmEngine.pruneMessagesFIFO(messages, {
      maxInputTokens: StructuredParser.CHAT_INPUT_TOKEN_BUDGET,
      reserveOutputTokens: StructuredParser.RESPONSE_TOKEN_RESERVE,
      protectedMessageCount: 1,
    });

    console.debug('[StructuredParser] Requesting summary completion', {
      phase: taskLabel,
      chunkIndex: index,
      chunkCount: total,
      messageCount: pruned.length,
    });
    let response;
    try {
      response = await engine.chat.completions.create({
        messages: pruned,
        temperature: 0,
        max_tokens: StructuredParser.SUMMARY_MAX_TOKENS,
      });
    } catch (error) {
      console.error('[StructuredParser] Summary completion failed', {
        phase: taskLabel,
        chunkIndex: index,
        chunkCount: total,
        error,
      });
      throw error;
    }

    const summary = response.choices[0]?.message?.content?.trim() ?? '';
    if (!summary) {
      console.error(
        '[StructuredParser] Summary completion returned empty output',
        {
          phase: taskLabel,
          chunkIndex: index,
          chunkCount: total,
        },
      );
    }
    return summary;
  }
}
