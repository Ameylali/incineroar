import type { GameplayParsingConfig } from './config';
import type { Mat } from './opencv';
import { getCV } from './opencv';
import type { FrameData } from './types';

export class FramePreprocessor {
  private config: GameplayParsingConfig;

  constructor(config: GameplayParsingConfig) {
    this.config = config;
  }

  process(frame: FrameData): FrameData {
    const cv = getCV();
    const src = cv.matFromImageData(frame.imageData);
    let current = src;

    try {
      if (this.config.PREPROCESS.GRAYSCALE) {
        current = this.applyGrayscale(current);
      }

      if (this.config.PREPROCESS.CONTRAST !== 1) {
        current = this.applyContrast(current, this.config.PREPROCESS.CONTRAST);
      }

      if (this.config.PREPROCESS.BLUR_RADIUS > 0) {
        current = this.applyGaussianBlur(
          current,
          this.config.PREPROCESS.BLUR_RADIUS,
        );
      }

      // Convert back to RGBA if we're in grayscale
      if (this.config.PREPROCESS.GRAYSCALE) {
        const rgba = current.clone();
        cv.cvtColor(current, rgba, cv.COLOR_GRAY2RGBA as number);
        current.delete();
        current = rgba;
      }

      const resultData = new ImageData(
        new Uint8ClampedArray(current.data),
        frame.imageData.width,
        frame.imageData.height,
      );

      return { timestamp: frame.timestamp, imageData: resultData };
    } finally {
      current.delete();
      if (current !== src) src.delete();
    }
  }

  private applyGrayscale(src: Mat): Mat {
    const cv = getCV();
    const dst = src.clone();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY as number);
    src.delete();
    return dst;
  }

  private applyContrast(src: Mat, factor: number): Mat {
    const dst = src.clone();
    const beta = 128 * (1 - factor);
    src.convertTo(dst, -1, factor, beta);
    src.delete();
    return dst;
  }

  private applyGaussianBlur(src: Mat, radius: number): Mat {
    const cv = getCV();
    const dst = src.clone();
    const kernelSize = radius * 2 + 1;
    cv.GaussianBlur(src, dst, new cv.Size(kernelSize, kernelSize), 0);
    src.delete();
    return dst;
  }
}
