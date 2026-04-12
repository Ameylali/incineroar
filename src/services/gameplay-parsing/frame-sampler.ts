import type { GameplayParsingConfig } from './config';
import type { FrameData, ParsingProgress } from './types';

export class FrameSamplerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrameSamplerError';
  }
}

export class FrameSampler {
  private config: GameplayParsingConfig;

  constructor(config: GameplayParsingConfig) {
    this.config = config;
  }

  async sample(
    file: File,
    onProgress?: (progress: ParsingProgress) => void,
  ): Promise<FrameData[]> {
    const video = await this.createVideoElement(file);
    this.validateDuration(video.duration);
    const timestamps = this.computeTimestamps(video.duration);
    const total = timestamps.length;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new FrameSamplerError('Could not create canvas 2D context');

    const frames: FrameData[] = [];

    for (let i = 0; i < total; i += this.config.BATCH_SIZE) {
      const batchEnd = Math.min(i + this.config.BATCH_SIZE, total);

      for (let j = i; j < batchEnd; j++) {
        await this.seekTo(video, timestamps[j]);
        const imageData = this.captureFrame(video, canvas, ctx);
        frames.push({ timestamp: timestamps[j], imageData });

        onProgress?.({
          phase: 'sampling',
          current: j + 1,
          total,
        });
      }
    }

    URL.revokeObjectURL(video.src);
    return frames;
  }

  private validateDuration(duration: number): void {
    const maxDurationSeconds =
      this.config.MAX_FRAMES / this.config.SAMPLE_RATE_PER_SECOND;
    if (duration > maxDurationSeconds) {
      const maxMinutes = Math.floor(maxDurationSeconds / 60);
      const maxSeconds = Math.round(maxDurationSeconds % 60);
      throw new FrameSamplerError(
        `Video duration exceeds the maximum allowed. Max duration: ${maxMinutes}m ${maxSeconds}s (${this.config.MAX_FRAMES} frames at ${this.config.SAMPLE_RATE_PER_SECOND} fps)`,
      );
    }
  }

  private createVideoElement(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;

      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new FrameSamplerError(
            'Failed to load video. The file may be corrupted or in an unsupported format.',
          ),
        );
      };
    });
  }

  private seekTo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      video.currentTime = time;
      video.onseeked = () => resolve();
      video.onerror = () =>
        reject(new FrameSamplerError(`Failed to seek to ${time}s`));
    });
  }

  private captureFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): ImageData {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private computeTimestamps(duration: number): number[] {
    const interval = 1 / this.config.SAMPLE_RATE_PER_SECOND;
    const timestamps: number[] = [];

    for (let t = 0; t < duration; t += interval) {
      timestamps.push(t);
    }

    return timestamps;
  }
}
