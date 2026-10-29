/** Integer-only canvas scaling: 640×360 base, letterboxed when the window is not an exact multiple. */
export const BASE_WIDTH = 640;
export const BASE_HEIGHT = 360;

export interface ScaleResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function integerScale(viewW: number, viewH: number): ScaleResult {
  const fit = Math.min(viewW / BASE_WIDTH, viewH / BASE_HEIGHT);
  const scale = Math.max(1, Math.floor(fit));
  const offsetX = Math.max(0, Math.floor((viewW - BASE_WIDTH * scale) / 2));
  const offsetY = Math.max(0, Math.floor((viewH - BASE_HEIGHT * scale) / 2));
  return { scale, offsetX, offsetY };
}

/** Fractional fit for phones: fills the screen instead of leaving black bars. */
export function fitScale(viewW: number, viewH: number, maxScale = 2.5): ScaleResult {
  const fit = Math.min(viewW / BASE_WIDTH, viewH / BASE_HEIGHT);
  const scale = Math.max(0.5, Math.min(maxScale, fit));
  const offsetX = Math.max(0, Math.floor((viewW - BASE_WIDTH * scale) / 2));
  const offsetY = Math.max(0, Math.floor((viewH - BASE_HEIGHT * scale) / 2));
  return { scale, offsetX, offsetY };
}
