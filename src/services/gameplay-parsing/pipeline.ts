import type { GameplayParsingConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { FrameSampler } from './frame-sampler';
import { TextExtractor } from './text-extractor';
import type {
  ExecutionController,
  ExtractedParagraph,
  ParsingProgress,
} from './types';

export class GameplayParsingPipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameplayParsingPipelineError';
  }
}

export class GameplayParsingPipeline {
  private config: GameplayParsingConfig;
  private frameSampler: FrameSampler;
  private textExtractor: TextExtractor;

  constructor(config: Partial<GameplayParsingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameSampler = new FrameSampler(this.config);
    this.textExtractor = new TextExtractor(this.config);
  }

  async run(
    file: File,
    onProgress?: (progress: ParsingProgress) => void,
    controller?: ExecutionController,
  ): Promise<ExtractedParagraph[]> {
    console.log(
      '[GameplayParsing] Starting pipeline with config:',
      this.config,
    );

    // Step 1: Sample frames from video
    console.log('[GameplayParsing] Step 1: Sampling frames...');
    const frames = await this.frameSampler.sample(file, onProgress);
    console.log(`[GameplayParsing] Sampled ${frames.length} frames`);

    if (frames.length === 0) {
      throw new GameplayParsingPipelineError(
        'No frames could be extracted from the video.',
      );
    }

    // Step 2: Extract text via OCR
    console.log('[GameplayParsing] Step 2: Extracting text via OCR...');
    const paragraphs = await this.textExtractor.extractAll(
      frames,
      onProgress,
      controller,
    );
    console.log(`[GameplayParsing] Extracted ${paragraphs.length} paragraphs`);

    // Step 3: Deduplicate consecutive identical paragraphs
    console.log('[GameplayParsing] Step 3: Deduplicating...');
    const deduplicated = this.deduplicate(paragraphs);
    console.log(
      `[GameplayParsing] ${paragraphs.length} → ${deduplicated.length} paragraphs after dedup`,
    );

    onProgress?.({
      phase: 'done',
      current: deduplicated.length,
      total: deduplicated.length,
    });

    console.log('[GameplayParsing] Pipeline complete');
    return deduplicated;
  }

  private deduplicate(paragraphs: ExtractedParagraph[]): ExtractedParagraph[] {
    if (paragraphs.length === 0) return [];

    const result: ExtractedParagraph[] = [paragraphs[0]];

    for (let i = 1; i < paragraphs.length; i++) {
      const prevText = this.paragraphText(result[result.length - 1]);
      const currText = this.paragraphText(paragraphs[i]);

      if (currText !== prevText) {
        result.push(paragraphs[i]);
      }
    }

    return result;
  }

  private paragraphText(paragraph: ExtractedParagraph): string {
    return paragraph.extractions.map((e) => e.text).join('|');
  }
}
