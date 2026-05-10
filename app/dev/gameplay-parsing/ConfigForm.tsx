'use client';

import { InputNumber, Switch } from 'antd';

import type { GameplayParsingConfig } from '@/src/services/gameplay-parsing';
import { DEFAULT_CONFIG } from '@/src/services/gameplay-parsing';

interface ConfigFormProps {
  config: GameplayParsingConfig;
  onChange: (config: GameplayParsingConfig) => void;
  disabled?: boolean;
}

const ConfigForm = ({ config, onChange, disabled }: ConfigFormProps) => {
  const update = (path: string, value: number | boolean) => {
    const next = structuredClone(config);
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = next;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    onChange(next);
  };

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <label>Sample rate (fps)</label>
      <InputNumber
        min={0.1}
        max={30}
        step={0.5}
        value={config.SAMPLE_RATE_PER_SECOND}
        onChange={(v) => update('SAMPLE_RATE_PER_SECOND', v ?? DEFAULT_CONFIG.SAMPLE_RATE_PER_SECOND)}
        disabled={disabled}
      />

      <label>Max frames</label>
      <InputNumber
        min={1}
        max={10000}
        value={config.MAX_FRAMES}
        onChange={(v) => update('MAX_FRAMES', v ?? DEFAULT_CONFIG.MAX_FRAMES)}
        disabled={disabled}
      />

      <label>Batch size</label>
      <InputNumber
        min={1}
        max={200}
        value={config.BATCH_SIZE}
        onChange={(v) => update('BATCH_SIZE', v ?? DEFAULT_CONFIG.BATCH_SIZE)}
        disabled={disabled}
      />

      <label>Worker count</label>
      <InputNumber
        min={1}
        max={8}
        value={config.WORKER_COUNT}
        onChange={(v) => update('WORKER_COUNT', v ?? DEFAULT_CONFIG.WORKER_COUNT)}
        disabled={disabled}
      />

      <label>Grayscale</label>
      <Switch
        checked={config.PREPROCESS.GRAYSCALE}
        onChange={(v) => update('PREPROCESS.GRAYSCALE', v)}
        disabled={disabled}
      />

      <label>Contrast</label>
      <InputNumber
        min={0.1}
        max={5}
        step={0.1}
        value={config.PREPROCESS.CONTRAST}
        onChange={(v) => update('PREPROCESS.CONTRAST', v ?? DEFAULT_CONFIG.PREPROCESS.CONTRAST)}
        disabled={disabled}
      />

      <label>Blur radius</label>
      <InputNumber
        min={0}
        max={10}
        value={config.PREPROCESS.BLUR_RADIUS}
        onChange={(v) => update('PREPROCESS.BLUR_RADIUS', v ?? DEFAULT_CONFIG.PREPROCESS.BLUR_RADIUS)}
        disabled={disabled}
      />

      <label>Min line confidence</label>
      <InputNumber
        min={0}
        max={1}
        step={0.05}
        value={config.SELECTION.MIN_LINE_CONFIDENCE}
        onChange={(v) => update('SELECTION.MIN_LINE_CONFIDENCE', v ?? DEFAULT_CONFIG.SELECTION.MIN_LINE_CONFIDENCE)}
        disabled={disabled}
      />

      <label>Min word confidence</label>
      <InputNumber
        min={0}
        max={1}
        step={0.05}
        value={config.SELECTION.MIN_WORD_CONFIDENCE}
        onChange={(v) => update('SELECTION.MIN_WORD_CONFIDENCE', v ?? DEFAULT_CONFIG.SELECTION.MIN_WORD_CONFIDENCE)}
        disabled={disabled}
      />
    </div>
  );
};

export default ConfigForm;
