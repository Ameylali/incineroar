import BattleParserFactory, {
  type BattleMetadata,
} from '@/src/services/pokemon/battle';
import type { CreateBattleData } from '@/src/types/api';

import type { LLMEngine } from './llm-engine';
import SYSTEM_PROMPT from './structured-parser-prompt.md';
import type { ExtractedParagraph } from './types';

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

  async convertToSimProtocol(
    paragraphs: ExtractedParagraph[],
  ): Promise<string> {
    if (paragraphs.length === 0) {
      throw new StructuredParserError('No paragraphs to convert.');
    }

    const engine = this.llmEngine.getEngine();
    const userContent = this.formatParagraphsForPrompt(paragraphs);

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new StructuredParserError(
        'LLM returned empty response when converting to sim-protocol.',
      );
    }

    return content.trim();
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
  ): Promise<{ simProtocol: string; battleData: CreateBattleData }> {
    const simProtocol = await this.convertToSimProtocol(paragraphs);
    const battleData = this.parseSimProtocol(simProtocol, metadata);
    return { simProtocol, battleData };
  }

  private formatParagraphsForPrompt(paragraphs: ExtractedParagraph[]): string {
    return paragraphs
      .map((p) => {
        const texts = p.extractions
          .map((e) => e.text)
          .filter((t) => t.trim().length > 0);
        if (texts.length === 0) return null;
        return `[${p.timestamp.toFixed(1)}s] ${texts.join(' | ')}`;
      })
      .filter(Boolean)
      .join('\n');
  }
}
