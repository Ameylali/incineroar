import type { CV } from '@techstark/opencv-js';
import cvModule from '@techstark/opencv-js';

export type { Mat } from '@techstark/opencv-js';

let cvInstance: CV | null = null;

export async function loadCV(): Promise<CV> {
  if (cvInstance) return cvInstance;

  let cv: CV;
  if (cvModule instanceof Promise) {
    cv = (await cvModule) as CV;
  } else {
    await new Promise<void>((resolve) => {
      cvModule.onRuntimeInitialized = () => resolve();
    });
    cv = cvModule as unknown as CV;
  }

  cvInstance = cv;
  return cv;
}

export function getCV(): CV {
  if (!cvInstance)
    throw new Error('OpenCV.js is not loaded. Call loadCV() first.');
  return cvInstance;
}
