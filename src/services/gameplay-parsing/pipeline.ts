import type { GameplayParsingConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { FramePreprocessor } from './frame-preprocessor';
import { FrameSampler } from './frame-sampler';
import { loadCV } from './opencv';
import { TextExtractor } from './text-extractor';
import type { ExtractedParagraph, ParsingProgress } from './types';

export class GameplayParsingPipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameplayParsingPipelineError';
  }
}

export class GameplayParsingPipeline {
  private config: GameplayParsingConfig;
  private frameSampler: FrameSampler;
  private preprocessor: FramePreprocessor;
  private textExtractor: TextExtractor;

  constructor(config: Partial<GameplayParsingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameSampler = new FrameSampler(this.config);
    this.preprocessor = new FramePreprocessor(this.config);
    this.textExtractor = new TextExtractor(this.config);
  }

  async run(
    file: File,
    onProgress?: (progress: ParsingProgress) => void,
  ): Promise<ExtractedParagraph[]> {
    await loadCV();
    await this.textExtractor.initialize();

    try {
      // Step 1: Sample frames from video
      const frames = await this.frameSampler.sample(file, onProgress);

      if (frames.length === 0) {
        throw new GameplayParsingPipelineError(
          'No frames could be extracted from the video.',
        );
      }

      // Step 2: Preprocess frames
      const preprocessedFrames = frames.map((frame) =>
        this.preprocessor.process(frame),
      );

      // Step 3: Extract text via OCR
      const paragraphs = await this.textExtractor.extractAll(
        preprocessedFrames,
        onProgress,
      );

      // Step 4: Deduplicate consecutive identical paragraphs
      const deduplicated = this.deduplicate(paragraphs);

      onProgress?.({
        phase: 'done',
        current: deduplicated.length,
        total: deduplicated.length,
      });

      return deduplicated;
    } finally {
      await this.textExtractor.terminate();
    }
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
