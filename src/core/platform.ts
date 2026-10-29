/** Device/platform decisions that do not depend on Phaser. */

export interface ViewportInfo {
  touch: boolean;
  width: number;
  height: number;
}

export function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.maxTouchPoints > 0) return true;
  return typeof window !== 'undefined' && 'ontouchstart' in window;
}

/** Phones and small tablets get the virtual controls; desktops do not. */
export function prefersTouchLayout(info: ViewportInfo): boolean {
  return info.touch && Math.min(info.width, info.height) < 900;
}

/** Touch portrait is unplayable at 640×360, so sleep the loop behind a hint. */
export function shouldPauseForPortrait(info: ViewportInfo): boolean {
  return info.touch && info.height > info.width;
}
