import {
  createScheduler,
  createWorker,
  type Line,
  OEM,
  type Page,
  PSM,
  type Scheduler,
  type Word,
  type Worker,
} from 'tesseract.js';

import type { GameplayParsingConfig } from './config';
import { DEVICE_MASKS } from './config';
import type {
  ExecutionController,
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

interface OcrJob {
  frameIndex: number;
  timestamp: number;
  mask: Mask;
  canvas: HTMLCanvasElement;
}

export class TextExtractor {
  private config: GameplayParsingConfig;
  private scheduler: Scheduler | null = null;
  private workers: Worker[] = [];

  constructor(config: GameplayParsingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.scheduler) return;

    this.scheduler = createScheduler();
    const workerCount = this.config.WORKER_COUNT;

    console.log(`[TextExtractor] Initializing ${workerCount} workers...`);

    const workerPromises = Array.from({ length: workerCount }, async () => {
      const worker = await createWorker('eng', OEM.DEFAULT, {
        workerBlobURL: false,
        workerPath: '/tesseract-worker.min.js',
        logger: (m) =>
          console.log(`[Tesseract Worker] ${m.status} ${m.progress}`),
      });
      // Configure for single block of text (better for game UI)
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !\'"-.,',
      });
      this.workers.push(worker);
      this.scheduler!.addWorker(worker);
      return worker;
    });

    await Promise.all(workerPromises);
    console.log(`[TextExtractor] ${workerCount} workers initialized`);
  }

  async terminate(): Promise<void> {
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
      this.workers = [];
      console.log('[TextExtractor] Workers terminated');
    }
  }

  async extractAll(
    frames: FrameData[],
    onProgress?: (progress: ParsingProgress) => void,
    controller?: ExecutionController,
  ): Promise<ExtractedParagraph[]> {
    await this.initialize();

    const masks = DEVICE_MASKS[this.config.DEVICE_PROFILE];
    const total = frames.length;
    // Use batch size of 1 when pausing is enabled for better control
    const batchSize = controller ? 1 : this.config.BATCH_SIZE;

    const paragraphsMap = new Map<number, ExtractedParagraph>();
    let processedFrames = 0;

    // Process frames in batches
    for (let batchStart = 0; batchStart < total; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, total);
      const batchFrames = frames.slice(batchStart, batchEnd);

      // Create OCR jobs for all masks of all frames in the batch
      const jobs: OcrJob[] = [];
      for (let i = 0; i < batchFrames.length; i++) {
        const frame = batchFrames[i];
        const frameIndex = batchStart + i;
        const canvas = this.imageDataToCanvas(frame.imageData);

        for (const mask of masks) {
          jobs.push({
            frameIndex,
            timestamp: frame.timestamp,
            mask,
            canvas: this.cropToMask(canvas, mask),
          });
        }
      }

      // Process all jobs in parallel using the scheduler
      const results = await Promise.all(
        jobs.map(async (job) => {
          const preprocessed = this.preprocessCanvas(job.canvas);
          const result = await this.scheduler!.addJob(
            'recognize',
            preprocessed,
            {},
            { blocks: true },
          );
          const lines = this.extractLines(result.data);

          // Debug: log raw OCR results before filtering
          if (lines.length > 0) {
            const rawText = lines.map((l) => l.text).join(' | ');
            const avgConf =
              lines.reduce((s, l) => s + l.confidence, 0) / lines.length;
            console.log(
              `[OCR Debug] [${job.mask.label}] Raw: "${rawText}" (avg conf: ${avgConf.toFixed(1)}%)`,
            );
          }

          const extraction = this.applySelection(lines, job.mask);
          return { ...job, extraction };
        }),
      );

      // Aggregate results by frame
      for (const result of results) {
        if (result.extraction) {
          if (!paragraphsMap.has(result.frameIndex)) {
            paragraphsMap.set(result.frameIndex, {
              timestamp: result.timestamp,
              extractions: [],
            });
          }
          paragraphsMap
            .get(result.frameIndex)!
            .extractions.push(result.extraction);
        }
      }

      // Log and report progress for each frame in batch
      for (let i = 0; i < batchFrames.length; i++) {
        const frameIndex = batchStart + i;
        const paragraph = paragraphsMap.get(frameIndex);
        const frame = batchFrames[i];
        processedFrames++;

        // Convert original frame to data URL for UI display
        const frameCanvas = this.imageDataToCanvas(frame.imageData);
        const frameImageUrl = frameCanvas.toDataURL('image/jpeg', 0.7);

        // Create preprocessed version of full frame for display with mask overlays
        const preprocessedCanvas = this.imageDataToCanvas(frame.imageData);
        this.preprocessCanvas(preprocessedCanvas);
        this.drawMasksOnCanvas(preprocessedCanvas, masks);
        const processedFrameImageUrl = preprocessedCanvas.toDataURL(
          'image/jpeg',
          0.7,
        );

        if (paragraph && paragraph.extractions.length > 0) {
          const extractionLog = paragraph.extractions
            .map((e) => `[${e.mask.label}] "${e.text}"`)
            .join(', ');
          console.log(
            `[TextExtractor] Frame ${frameIndex + 1}/${total} (t=${frame.timestamp.toFixed(1)}s): ${extractionLog}`,
          );
        } else {
          console.log(
            `[TextExtractor] Frame ${frameIndex + 1}/${total} (t=${frame.timestamp.toFixed(1)}s): no confident text`,
          );
        }

        onProgress?.({
          phase: 'processing',
          current: processedFrames,
          total,
          frameImageUrl,
          processedFrameImageUrl,
        });

        // Check if we should pause
        if (controller) {
          await controller.checkPause();
        }
      }
    }

    // Return paragraphs sorted by frame index, filtering out empty ones
    return Array.from(paragraphsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, paragraph]) => paragraph)
      .filter((p) => p.extractions.length > 0);
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

  private preprocessCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const { GRAYSCALE, CONTRAST } = this.config.PREPROCESS;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply grayscale
      if (GRAYSCALE) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      // Apply contrast
      if (CONTRAST !== 1) {
        r = this.applyContrast(r, CONTRAST);
        g = this.applyContrast(g, CONTRAST);
        b = this.applyContrast(b, CONTRAST);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private applyContrast(value: number, contrast: number): number {
    const factor =
      (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    return Math.min(255, Math.max(0, factor * (value - 128) + 128));
  }

  private drawMasksOnCanvas(canvas: HTMLCanvasElement, masks: Mask[]): void {
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'red';

    for (const mask of masks) {
      const x = Math.round(mask.x * canvas.width);
      const y = Math.round(mask.y * canvas.height);
      const width = Math.round(mask.width * canvas.width);
      const height = Math.round(mask.height * canvas.height);

      // Draw rectangle border
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const labelPadding = 4;
      const labelHeight = 18;
      const labelWidth = ctx.measureText(mask.label).width + labelPadding * 2;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(mask.label, x + labelPadding, y - labelPadding);

      // Reset fill style for next iteration
      ctx.fillStyle = 'red';
    }
  }
}
