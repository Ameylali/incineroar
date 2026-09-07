import type {
  ChatCompletionMessageParam,
  MLCEngineInterface,
} from '@mlc-ai/web-llm';
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
  private static readonly OUTPUT_TOKEN_RESERVE = 512;
  private static readonly DEFAULT_INPUT_TOKEN_LIMIT = 750;
  public static readonly CONTEXT_WINDOW_SIZE = 1024;

  private engine: MLCEngineInterface | null = null;
  private loadedModel: string | null = null;

  async init(
    onProgress?: (progress: LLMProgress) => void,
    modelSize: LLMModelSize = DEFAULT_MODEL_SIZE,
  ): Promise<MLCEngineInterface> {
    const model = LLM_MODELS[modelSize].id;
    console.debug('[LLMEngine] Initializing model', {
      model,
      modelSize,
      contextWindowSize: LLMEngine.CONTEXT_WINDOW_SIZE,
    });
    if (this.engine && this.loadedModel === model) {
      console.debug('[LLMEngine] Model already initialized', { model });
      onProgress?.({
        phase: 'ready',
        text: 'Model already loaded',
        progress: 1,
      });
      return this.engine;
    }

    try {
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
          context_window_size: LLMEngine.CONTEXT_WINDOW_SIZE,
        },
      );
    } catch (error) {
      console.error('[LLMEngine] Model initialization failed', {
        model,
        modelSize,
        contextWindowSize: LLMEngine.CONTEXT_WINDOW_SIZE,
        error,
      });
      throw error;
    }

    this.loadedModel = model;
    console.debug('[LLMEngine] Model initialization complete', { model });
    onProgress?.({ phase: 'ready', text: 'Model ready', progress: 1 });
    return this.engine;
  }

  countTextTokens(text: string): Promise<number> {
    return Promise.resolve(this.estimateTokens(text));
  }

  async countMessageTokens(
    messages: ChatCompletionMessageParam[],
  ): Promise<number> {
    console.debug('[LLMEngine] Counting message tokens', {
      messageCount: messages.length,
    });
    const text = messages
      .map((message) => {
        const content = this.getMessageContentText(message.content);
        return `<|${message.role}|>\n${content}`;
      })
      .join('\n');

    return this.countTextTokens(text);
  }

  chunkTextByTokens(
    text: string,
    maxTokensPerChunk: number,
  ): Promise<string[]> {
    console.debug('[LLMEngine] Chunking text', {
      textCharacters: text.length,
      maxTokensPerChunk,
    });
    const safeChunkSize = Math.max(1, maxTokensPerChunk);
    const approxCharsPerToken = 4;
    const chunkSize = safeChunkSize * approxCharsPerToken;
    const chunks: string[] = [];

    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + chunkSize);
      if (end < text.length) {
        const breakAt = this.findChunkBoundary(text, start, end);
        end = breakAt > start ? breakAt : end;
      }

      chunks.push(text.slice(start, end));
      start = end;
    }

    console.debug('[LLMEngine] Text chunking complete', {
      chunkCount: chunks.length,
    });
    return Promise.resolve(chunks);
  }

  async pruneMessagesFIFO(
    messages: ChatCompletionMessageParam[],
    options: {
      maxInputTokens?: number;
      reserveOutputTokens?: number;
      protectedMessageCount?: number;
    } = {},
  ): Promise<ChatCompletionMessageParam[]> {
    const reserveOutputTokens =
      options.reserveOutputTokens ?? LLMEngine.OUTPUT_TOKEN_RESERVE;
    const modelInputLimit = Math.max(
      1,
      LLMEngine.CONTEXT_WINDOW_SIZE - reserveOutputTokens,
    );
    const maxInputTokens =
      options.maxInputTokens ??
      Math.min(LLMEngine.DEFAULT_INPUT_TOKEN_LIMIT, modelInputLimit);
    const protectedMessageCount = Math.min(
      Math.max(0, options.protectedMessageCount ?? 0),
      messages.length,
    );

    const pruned = [...messages];
    let totalTokens = await this.countMessageTokens(pruned);
    const initialMessageCount = pruned.length;
    console.debug('[LLMEngine] Pruning chat history', {
      initialMessageCount,
      initialTokenEstimate: totalTokens,
      maxInputTokens,
      protectedMessageCount,
    });

    while (
      totalTokens > maxInputTokens &&
      pruned.length > protectedMessageCount + 1
    ) {
      pruned.splice(protectedMessageCount, 1);
      totalTokens = await this.countMessageTokens(pruned);
    }

    console.debug('[LLMEngine] Chat history pruning complete', {
      finalMessageCount: pruned.length,
      finalTokenEstimate: totalTokens,
      evictedMessageCount: initialMessageCount - pruned.length,
    });
    return pruned;
  }

  getEngine(): MLCEngineInterface {
    if (!this.engine) {
      console.error('[LLMEngine] Engine requested before initialization');
      throw new Error('LLM engine not initialized. Call init() first.');
    }
    return this.engine;
  }

  isReady(): boolean {
    return this.engine !== null;
  }

  private getMessageContentText(
    content: ChatCompletionMessageParam['content'],
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          }

          if (part && typeof part === 'object' && 'text' in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === 'string' ? text : '';
          }

          return '';
        })
        .filter((text) => text.length > 0)
        .join('\n');
    }

    return '';
  }

  private estimateTokens(text: string): number {
    if (text.length === 0) {
      return 0;
    }

    const charEstimate = Math.ceil(text.length / 4);
    const wordCount =
      text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
    const wordEstimate = Math.ceil(wordCount * 1.3);

    return Math.max(1, charEstimate, wordEstimate);
  }

  private findChunkBoundary(text: string, start: number, end: number): number {
    const window = text.slice(start, end);
    const lastParagraphBreak = window.lastIndexOf('\n\n');
    if (lastParagraphBreak >= 0) {
      return start + lastParagraphBreak + 2;
    }

    const lastLineBreak = window.lastIndexOf('\n');
    if (lastLineBreak >= 0) {
      return start + lastLineBreak + 1;
    }

    const lastSpace = window.lastIndexOf(' ');
    if (lastSpace >= 0) {
      return start + lastSpace + 1;
    }

    return end;
  }
}
