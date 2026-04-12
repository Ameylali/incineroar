import {
  createScheduler,
  createWorker,
  type Line,
  type Page,
  type Scheduler,
  type Word,
} from 'tesseract.js';

import type { GameplayParsingConfig } from './config';
import { DEVICE_MASKS } from './config';
import type {
  ExtractedParagraph,
  FrameData,
  Mask,
  MaskExtraction,
  ParsingProgress,
} from './types';

export class TextExtractorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextExtractorError';
  }
}

export class TextExtractor {
  private config: GameplayParsingConfig;
  private scheduler: Scheduler | null = null;

  constructor(config: GameplayParsingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.scheduler = createScheduler();

    for (let i = 0; i < this.config.WORKER_COUNT; i++) {
      const worker = await createWorker('eng');
      this.scheduler.addWorker(worker);
    }
  }

  async terminate(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
    }
  }

  async extractAll(
    frames: FrameData[],
    onProgress?: (progress: ParsingProgress) => void,
  ): Promise<ExtractedParagraph[]> {
    if (!this.scheduler)
      throw new TextExtractorError(
        'TextExtractor not initialized. Call initialize() first.',
      );

    const masks = DEVICE_MASKS[this.config.DEVICE_PROFILE];
    const total = frames.length;
    const paragraphs: ExtractedParagraph[] = [];

    for (let i = 0; i < total; i++) {
      const frame = frames[i];
      const extractions = await this.extractFromFrame(frame, masks);

      if (extractions.length > 0) {
        paragraphs.push({ timestamp: frame.timestamp, extractions });
      }

      onProgress?.({ phase: 'processing', current: i + 1, total });
    }

    return paragraphs;
  }

  private async extractFromFrame(
    frame: FrameData,
    masks: Mask[],
  ): Promise<MaskExtraction[]> {
    const canvas = this.imageDataToCanvas(frame.imageData);
    const extractions: MaskExtraction[] = [];

    for (const mask of masks) {
      const cropped = this.cropToMask(canvas, mask);
      const result = await this.scheduler!.addJob('recognize', cropped);
      const lines = this.extractLines(result.data);
      const extraction = this.applySelection(lines, mask);

      if (extraction) {
        extractions.push(extraction);
      }
    }

    return extractions;
  }

  private extractLines(page: Page): Line[] {
    if (!page.blocks) return [];
    return page.blocks.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines),
    );
  }

  private applySelection(lines: Line[], mask: Mask): MaskExtraction | null {
    const confidentLines: { text: string; confidence: number }[] = [];

    for (const line of lines) {
      if (line.confidence < this.config.SELECTION.MIN_LINE_CONFIDENCE * 100)
        continue;

      const selectedText = this.longestConfidentSubsequence(line.words);
      if (selectedText) {
        confidentLines.push({
          text: selectedText,
          confidence: line.confidence,
        });
      }
    }

    if (confidentLines.length === 0) return null;

    return {
      mask,
      text: confidentLines.map((l) => l.text).join('\n'),
      lineConfidences: confidentLines.map((l) => l.confidence),
    };
  }

  private longestConfidentSubsequence(words: Word[]): string | null {
    const minConfidence = this.config.SELECTION.MIN_WORD_CONFIDENCE * 100;
    let bestStart = -1;
    let bestLength = 0;
    let currentStart = -1;
    let currentLength = 0;

    for (let i = 0; i < words.length; i++) {
      if (words[i].confidence >= minConfidence) {
        if (currentStart === -1) currentStart = i;
        currentLength++;

        if (currentLength > bestLength) {
          bestStart = currentStart;
          bestLength = currentLength;
        }
      } else {
        currentStart = -1;
        currentLength = 0;
      }
    }

    if (bestLength === 0) return null;

    return words
      .slice(bestStart, bestStart + bestLength)
      .map((w) => w.text)
      .join(' ');
  }

  private imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private cropToMask(source: HTMLCanvasElement, mask: Mask): HTMLCanvasElement {
    const x = Math.round(mask.x * source.width);
    const y = Math.round(mask.y * source.height);
    const width = Math.round(mask.width * source.width);
    const height = Math.round(mask.height * source.height);

    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = height;
    const ctx = cropped.getContext('2d')!;
    ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
    return cropped;
  }
}
