import type { GameplayParsingConfig } from '@/src/services/gameplay-parsing';
import {
  DEFAULT_CONFIG,
  DEVICE_MASKS,
  type ExecutionController,
  type ExtractedParagraph,
  GameplayParsingPipeline,
  LLMEngine,
  type ParsingProgress,
  StructuredParser,
  type StructuredParsingProgress,
  TextExtractor,
} from '@/src/services/gameplay-parsing';
import type { BattleMetadata } from '@/src/services/pokemon/battle';
import type { CreateBattleData } from '@/src/types/api';

export interface ExperimentConfig {
  id: number;
  label: string;
  config: GameplayParsingConfig;
}

export interface ExperimentResult {
  id: number;
  label: string;
  config: GameplayParsingConfig;
  paragraphs: ExtractedParagraph[];
  totalText: string;
  avgConfidence: number;
  durationMs: number;
  error?: string;
}

export const EXPERIMENT_PRESETS: {
  label: string;
  overrides: Partial<GameplayParsingConfig>;
}[] = [
  { label: 'Default', overrides: {} },
  {
    label: 'High contrast',
    overrides: {
      PREPROCESS: { ...DEFAULT_CONFIG.PREPROCESS, CONTRAST: 3.0 },
    },
  },
  {
    label: 'No preprocessing',
    overrides: {
      PREPROCESS: { GRAYSCALE: false, CONTRAST: 1, BLUR_RADIUS: 0 },
    },
  },
  {
    label: 'Grayscale only',
    overrides: {
      PREPROCESS: { GRAYSCALE: true, CONTRAST: 1, BLUR_RADIUS: 0 },
    },
  },
  {
    label: 'Strict confidence',
    overrides: {
      SELECTION: { MIN_LINE_CONFIDENCE: 0.8, MIN_WORD_CONFIDENCE: 0.7 },
    },
  },
  {
    label: 'Loose confidence',
    overrides: {
      SELECTION: { MIN_LINE_CONFIDENCE: 0.3, MIN_WORD_CONFIDENCE: 0.2 },
    },
  },
];

let nextExperimentId = 1;

export const createExperiment = (
  overrides?: Partial<GameplayParsingConfig>,
): ExperimentConfig => ({
  id: nextExperimentId++,
  label: `Experiment ${nextExperimentId - 1}`,
  config: { ...DEFAULT_CONFIG, ...overrides },
});

export const parseStructuredInput = (input: string): ExtractedParagraph[] =>
  input
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^\[(\d+(?:\.\d+)?)s\]\s*(.*)$/);
      const timestamp = match ? parseFloat(match[1]) : 0;
      const textPart = match ? match[2] : line;
      const parts = textPart.split(' | ');

      return {
        timestamp,
        extractions: parts.map((text, index) => ({
          mask: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            label:
              ['main-text-box', 'rival-right-box', 'my-left-box'][index] ??
              `mask-${index}`,
          },
          text: text.trim(),
          lineConfidences: [1],
        })),
      };
    });

export const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

export const createBattleMetadata = (
  name: string,
  playerTag: string,
): BattleMetadata => ({
  name,
  notes: '',
  playerTag: playerTag as 'p1' | 'p2',
});

export const runStructuredParsing = async (
  paragraphs: ExtractedParagraph[],
  engine: LLMEngine,
  metadata: BattleMetadata,
  onProgress?: (progress: StructuredParsingProgress) => void,
): Promise<{ simProtocol: string; battleData: CreateBattleData }> => {
  const parser = new StructuredParser(engine);
  const simProtocol = await parser.convertToSimProtocol(paragraphs, onProgress);
  const battleData = parser.parseSimProtocol(simProtocol, metadata);
  return { simProtocol, battleData };
};

export const runGameplayPipeline = async (
  file: File,
  config: GameplayParsingConfig,
  onProgress: (progress: ParsingProgress) => void,
  controller: ExecutionController,
): Promise<ExtractedParagraph[]> => {
  const pipeline = new GameplayParsingPipeline(config);
  return pipeline.run(file, onProgress, controller);
};

export const loadImageData = async (file: File): Promise<ImageData> => {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create a 2D canvas context.');
    }
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
};

export const createMaskPreviewUrl = (
  imageData: ImageData,
  config: GameplayParsingConfig,
): string => {
  const masks = DEVICE_MASKS[config.DEVICE_PROFILE];
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a 2D canvas context.');
  }

  context.putImageData(imageData, 0, 0);
  context.strokeStyle = 'red';
  context.lineWidth = 3;
  context.font = '14px sans-serif';

  for (const mask of masks) {
    const x = Math.round(mask.x * canvas.width);
    const y = Math.round(mask.y * canvas.height);
    const width = Math.round(mask.width * canvas.width);
    const height = Math.round(mask.height * canvas.height);
    context.strokeRect(x, y, width, height);

    const labelPadding = 4;
    const labelHeight = 18;
    const labelWidth = context.measureText(mask.label).width + labelPadding * 2;
    context.fillStyle = 'rgba(255, 0, 0, 0.7)';
    context.fillRect(x, y - labelHeight, labelWidth, labelHeight);
    context.fillStyle = 'white';
    context.fillText(mask.label, x + labelPadding, y - labelPadding);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
};

export const runImageOcr = async (
  imageFile: File,
  config: GameplayParsingConfig,
): Promise<{ imageData: ImageData; paragraphs: ExtractedParagraph[] }> => {
  const imageData = await loadImageData(imageFile);
  const extractor = new TextExtractor(config);
  try {
    const paragraphs = await extractor.extractAll([{ timestamp: 0, imageData }]);
    return { imageData, paragraphs };
  } finally {
    await extractor.terminate();
  }
};

export const countExtractedLines = (
  paragraphs: ExtractedParagraph[],
): number =>
  paragraphs.reduce(
    (paragraphTotal, paragraph) =>
      paragraphTotal +
      paragraph.extractions.reduce(
        (extractionTotal, extraction) =>
          extractionTotal + extraction.lineConfidences.length,
        0,
      ),
    0,
  );

export const summarizeExtraction = (paragraphs: ExtractedParagraph[]) => {
  const confidences = paragraphs.flatMap((paragraph) =>
    paragraph.extractions.flatMap((extraction) => extraction.lineConfidences),
  );
  const totalText = paragraphs
    .flatMap((paragraph) => paragraph.extractions.map((extraction) => extraction.text))
    .join('\n');

  return {
    totalText,
    avgConfidence:
      confidences.length > 0
        ? confidences.reduce((sum, confidence) => sum + confidence, 0) /
          confidences.length
        : 0,
  };
};

export const runExperiments = async (
  imageFile: File,
  experiments: ExperimentConfig[],
  onProgress: (current: number, results: ExperimentResult[]) => void,
): Promise<ExperimentResult[]> => {
  const imageData = await loadImageData(imageFile);
  const results: ExperimentResult[] = [];

  for (let index = 0; index < experiments.length; index++) {
    const experiment = experiments[index];
    const start = performance.now();

    try {
      const extractor = new TextExtractor(experiment.config);
      let paragraphs: ExtractedParagraph[];
      try {
        paragraphs = await extractor.extractAll([{ timestamp: 0, imageData }]);
      } finally {
        await extractor.terminate();
      }
      const summary = summarizeExtraction(paragraphs);

      results.push({
        id: experiment.id,
        label: experiment.label,
        config: experiment.config,
        paragraphs,
        ...summary,
        durationMs: performance.now() - start,
      });
    } catch (error) {
      results.push({
        id: experiment.id,
        label: experiment.label,
        config: experiment.config,
        paragraphs: [],
        totalText: '',
        avgConfidence: 0,
        durationMs: performance.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    onProgress(index + 1, [...results]);
  }

  return results;
};

export interface ExperimentComparison {
  lineCount: number;
  bestAvgConfidence: number;
  mostLines: number;
}

export const getExperimentComparison = (
  result: ExperimentResult,
  results: ExperimentResult[],
): ExperimentComparison => {
  const successfulResults = results.filter((item) => !item.error);
  return {
    lineCount: countExtractedLines(result.paragraphs),
    bestAvgConfidence: Math.max(
      0,
      ...successfulResults.map((item) => item.avgConfidence),
    ),
    mostLines: Math.max(
      0,
      ...successfulResults.map((item) => countExtractedLines(item.paragraphs)),
    ),
  };
};