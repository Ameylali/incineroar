import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

export interface LLMProgress {
  phase: 'loading' | 'ready';
  text: string;
  progress: number;
}

const DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

export class LLMEngine {
  private engine: MLCEngineInterface | null = null;
  private loadedModel: string | null = null;

  async init(
    onProgress?: (progress: LLMProgress) => void,
    model: string = DEFAULT_MODEL,
  ): Promise<MLCEngineInterface> {
    if (this.engine && this.loadedModel === model) {
      onProgress?.({
        phase: 'ready',
        text: 'Model already loaded',
        progress: 1,
      });
      return this.engine;
    }

    this.engine = await CreateMLCEngine(model, {
      initProgressCallback: (report) => {
        onProgress?.({
          phase: 'loading',
          text: report.text,
          progress: report.progress,
        });
      },
    });

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
