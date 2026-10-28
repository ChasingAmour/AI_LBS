/**
 * Pure lighting maths shared by the day/night overlay, the low-health vignette
 * and the walk bob. No Phaser import so the curves stay unit-testable.
 */

import { ITEMS } from '../data/items';
import type { ItemStack } from '../core/gameState';

export const NIGHT_MAX_ALPHA = 0.55;
export const LOW_HEALTH_THRESHOLD = 30;
export const VIGNETTE_MAX_ALPHA = 0.2;

/** Minutes from 00:00 to the next 24h clock, tolerant of wrapped values. */
function clockOf(clockMin: number): number {
  return ((clockMin % 1440) + 1440) % 1440;
}

/**
 * Night tint alpha: clear 06:00–17:00, linear dusk 17:00–21:00, full dark
 * 21:00–04:00, linear dawn 04:00–06:00.
 */
export function nightAlpha(clockMin: number): number {
  const m = clockOf(clockMin);
  if (m >= 360 && m < 1020) return 0;
  if (m >= 1020 && m < 1260) return (NIGHT_MAX_ALPHA * (m - 1020)) / 240;
  if (m >= 1260 || m < 240) return NIGHT_MAX_ALPHA;
  return (NIGHT_MAX_ALPHA * (360 - m)) / 120;
}

/** Red edge vignette that only appears below 30 hp and never exceeds 0.2. */
export function lowHealthVignette(hp: number): number {
  if (hp >= LOW_HEALTH_THRESHOLD) return 0;
  const clamped = Math.max(0, hp);
  return VIGNETTE_MAX_ALPHA * (1 - clamped / LOW_HEALTH_THRESHOLD);
}

/** One-pixel walk bob, switching every 160 ms. */
export function bobOffset(elapsedMs: number): number {
  return Math.floor(elapsedMs / 160) % 2;
}

/**
 * The light the player carries, taken from the strongest lit item in the pack.
 * No light item means no light at all.
 */
export function carriedLight(items: ItemStack[]): { radius: number; brightness: number } | null {
  let best: { radius: number; brightness: number } | null = null;
  for (const item of items) {
    const light = ITEMS[item.baseId]?.light;
    if (!light) continue;
    if ((item.durability ?? 0) <= 0) continue;
    if (!best || light.radius > best.radius) best = { ...light };
  }
  return best;
}
