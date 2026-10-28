export interface TooltipPoint {
  x: number;
  y: number;
}

/** Pushes a tooltip back inside the screen without flipping direction. */
export function clampTooltip(
  x: number,
  y: number,
  w: number,
  h: number,
  screenW: number,
  screenH: number,
): TooltipPoint {
  return {
    x: Math.max(0, Math.min(x, screenW - w)),
    y: Math.max(0, Math.min(y, screenH - h)),
  };
}
