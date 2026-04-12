export interface Mask {
  /** X position as a percentage of frame width (0–1) */
  x: number;
  /** Y position as a percentage of frame height (0–1) */
  y: number;
  /** Width as a percentage of frame width (0–1) */
  width: number;
  /** Height as a percentage of frame height (0–1) */
  height: number;
  label: string;
}

export interface FrameData {
  /** Timestamp in the video (seconds) */
  timestamp: number;
  /** Raw image data from the canvas */
  imageData: ImageData;
}

export interface WordResult {
  text: string;
  confidence: number;
}

export interface LineResult {
  text: string;
  confidence: number;
  words: WordResult[];
}

export interface OcrResult {
  lines: LineResult[];
}

export interface MaskExtraction {
  mask: Mask;
  text: string;
  lineConfidences: number[];
}

export interface ExtractedParagraph {
  timestamp: number;
  extractions: MaskExtraction[];
}

export interface ParsingProgress {
  phase: 'sampling' | 'processing' | 'done';
  current: number;
  total: number;
}
