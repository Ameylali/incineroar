import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

export interface LLMProgress {
  phase: 'loading' | 'ready';
  text: string;
  progress: number;
}

export type LLMModelSize = 'small' | 'medium' | 'large';

export const LLM_MODELS: Record<
  LLMModelSize,
  { id: string; label: string; description: string }
> = {
  small: {
    id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    label: 'Small (0.5B)',
    description: 'Fastest, lowest VRAM',
  },
  medium: {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    label: 'Medium (1B)',
    description: 'Balanced speed and quality',
  },
  large: {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    label: 'Large (3B)',
    description: 'Best quality, most VRAM',
  },
};

const DEFAULT_MODEL_SIZE: LLMModelSize = 'medium';

export class LLMEngine {
  private engine: MLCEngineInterface | null = null;
  private loadedModel: string | null = null;

  async init(
    onProgress?: (progress: LLMProgress) => void,
    modelSize: LLMModelSize = DEFAULT_MODEL_SIZE,
  ): Promise<MLCEngineInterface> {
    const model = LLM_MODELS[modelSize].id;
    if (this.engine && this.loadedModel === model) {
      onProgress?.({
        phase: 'ready',
        text: 'Model already loaded',
        progress: 1,
      });
      return this.engine;
    }

    this.engine = await CreateMLCEngine(
      model,
      {
        initProgressCallback: (report) => {
          onProgress?.({
            phase: 'loading',
            text: report.text,
            progress: report.progress,
          });
        },
      },
      {
        context_window_size: 1024,
      },
    );

    this.loadedModel = model;
    onProgress?.({ phase: 'ready', text: 'Model ready', progress: 1 });
    return this.engine;
  }

  getEngine(): MLCEngineInterface {
    if (!this.engine) {
      throw new Error('LLM engine not initialized. Call init() first.');
    }
    return this.engine;
  }

  isReady(): boolean {
    return this.engine !== null;
  }
}
