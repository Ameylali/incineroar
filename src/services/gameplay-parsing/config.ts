import type { Mask } from './types';

export type DeviceProfile = 'switch';

const SWITCH_MASKS: Mask[] = [
  // Main text box (bottom of screen)
  {
    x: 0.1203007518796992,
    y: 0.7066666666666667,
    width: 0.7744360902255639,
    height: 0.1866666666666667,
    label: 'main-text-box',
  },
  // Rival's ability/item box (middle right)
  {
    x: 0.6165413533834586,
    y: 0.4133333333333333,
    width: 0.3759398496240602,
    height: 0.1066666666666667,
    label: 'rival-right-box',
  },
  // My ability/item box (middle left)
  {
    x: 0.0592592592592593,
    y: 0.4210526315789474,
    width: 0.2666666666666667,
    height: 0.1052631578947368,
    label: 'my-left-box',
  },
  // {
    // x: 0, y: 0, width: 1, height: 1, label: 'full-frame', // For debugging
  // }
];

export const DEVICE_MASKS: Record<DeviceProfile, Mask[]> = {
  switch: SWITCH_MASKS,
};

export interface GameplayParsingConfig {
  SAMPLE_RATE_PER_SECOND: number;
  MAX_FRAMES: number;
  BATCH_SIZE: number;
  WORKER_COUNT: number;
  DEVICE_PROFILE: DeviceProfile;
  PREPROCESS: {
    GRAYSCALE: boolean;
    CONTRAST: number;
    BLUR_RADIUS: number;
  };
  SELECTION: {
    MIN_LINE_CONFIDENCE: number;
    MIN_WORD_CONFIDENCE: number;
  };
}

export const DEFAULT_CONFIG: GameplayParsingConfig = {
  SAMPLE_RATE_PER_SECOND: 1,
  MAX_FRAMES: 3600,
  BATCH_SIZE: 50,
  WORKER_COUNT: Math.min(navigator.hardwareConcurrency ?? 2, 4),
  DEVICE_PROFILE: 'switch',
  PREPROCESS: {
    GRAYSCALE: true,
    CONTRAST: 3,
    BLUR_RADIUS: 1,
  },
  SELECTION: {
    MIN_LINE_CONFIDENCE: 0.9,
    MIN_WORD_CONFIDENCE: 0.9,
  },
};
