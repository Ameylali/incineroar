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
    console.log('[FrameSampler] Loading video...');
    const video = await this.createVideoElement(file);
    console.log(`[FrameSampler] Video loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
    this.validateDuration(video.duration);
    const timestamps = this.computeTimestamps(video.duration);
    const total = timestamps.length;
    console.log(`[FrameSampler] Will sample ${total} frames`);

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
    const url = URL.createObjectURL(file);
    console.log(
      `[FrameSampler] Video blob URL created, file size: ${(file.size / 1024 / 1024).toFixed(1)}MB, type: ${file.type}`,
    );

    // Defer to a clean macrotask so any WASM background work
    // on the event loop drains before the browser starts loading the video.
    return new Promise<HTMLVideoElement>((resolve, reject) => {
      setTimeout(() => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.style.display = 'none';

        const timeout = setTimeout(() => {
          console.error(
            `[FrameSampler] Timeout. readyState: ${video.readyState}, networkState: ${video.networkState}`,
          );
          URL.revokeObjectURL(url);
          video.remove();
          reject(
            new FrameSamplerError(
              'Timed out loading video metadata (30s).',
            ),
          );
        }, 30_000);

        video.addEventListener('loadstart', () =>
          console.log('[FrameSampler] Video event: loadstart'),
        );
        video.addEventListener('progress', () =>
          console.log('[FrameSampler] Video event: progress'),
        );
        video.addEventListener('stalled', () =>
          console.log('[FrameSampler] Video event: stalled'),
        );

        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          console.log(
            `[FrameSampler] Metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`,
          );
          resolve(video);
        });

        video.addEventListener('error', () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          video.remove();
          const err = video.error;
          console.error(
            '[FrameSampler] Video error:',
            err?.code,
            err?.message,
          );
          reject(
            new FrameSamplerError(
              `Failed to load video: ${err?.message ?? 'unknown error'}`,
            ),
          );
        });

        document.body.appendChild(video);
        video.src = url;
        video.load();
        console.log(
          `[FrameSampler] video.load() called, readyState: ${video.readyState}, networkState: ${video.networkState}`,
        );
      }, 0);
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
