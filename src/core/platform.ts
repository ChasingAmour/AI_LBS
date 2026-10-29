/** Device/platform decisions that do not depend on Phaser. */

export interface ViewportInfo {
  touch: boolean;
  width: number;
  height: number;
}

export function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.maxTouchPoints > 0) return true;
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return true;
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Any touch/coarse-pointer device gets the virtual controls. */
export function prefersTouchLayout(info: ViewportInfo): boolean {
  return info.touch;
}

/** Touch portrait is unplayable at 640×360, so sleep the loop behind a hint. */
export function shouldPauseForPortrait(info: ViewportInfo): boolean {
  return info.touch && info.height > info.width;
}
