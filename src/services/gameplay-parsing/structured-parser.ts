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
  private llmEngine: LLMEngine;

  constructor(llmEngine: LLMEngine) {
    this.llmEngine = llmEngine;
  }

  /** Max number of recent user/assistant message pairs to keep in context */
  private static readonly SLIDING_WINDOW_SIZE = 10;

  async convertToSimProtocol(
    paragraphs: ExtractedParagraph[],
    onProgress?: (progress: StructuredParsingProgress) => void,
  ): Promise<string> {
    if (paragraphs.length === 0) {
      throw new StructuredParserError('No paragraphs to convert.');
    }

    const engine = this.llmEngine.getEngine();
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: SYSTEM_PROMPT,
    };
    const history: ChatCompletionMessageParam[] = [];
    const protocolChunks: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const line = this.formatParagraph(paragraphs[i]);
      history.push({ role: 'user', content: line });

      // Keep only the last N pairs (2 messages each) to stay within context window
      const maxMessages = StructuredParser.SLIDING_WINDOW_SIZE * 2;
      const windowedHistory = history.slice(-maxMessages);

      const response = await engine.chat.completions.create({
        messages: [systemMessage, ...windowedHistory],
        temperature: 0.1,
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content?.trim() ?? '';
      history.push({ role: 'assistant', content });

      if (content.length > 0) {
        protocolChunks.push(content);
      }

      onProgress?.({ current: i + 1, total: paragraphs.length });
    }

    const result = protocolChunks.join('\n');
    if (result.length === 0) {
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
    const parser = BattleParserFactory.getParser('showdown-sim-protocol');
    return parser.parse(metadata, simProtocolText);
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
}
