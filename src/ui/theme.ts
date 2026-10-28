export const FONT_FAMILY = '"Fusion Pixel 12px", monospace';

export const FONT_SIZE = {
  body: 12,
  title: 24,
} as const;

/** Numeric palette for Graphics/Rectangle fills. */
export const TINTS = {
  ink: 0x2b2118,
  inkSoft: 0x5a4630,
  cream: 0xf0e6d2,
  parchment: 0xf0dfb8,
  gold: 0xffd479,
  goldDark: 0xb8792a,
  muted: 0x8d7b5e,
  wood: 0x8a5a2b,
  woodDark: 0x4a2f18,
  hp: 0xc94f4f,
  hunger: 0xe0913f,
  thirst: 0x3f8fd0,
  energy: 0x6fbf4f,
  track: 0x3a2d20,
  night: 0x081a33,
} as const;

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** String palette for Text styles, derived from TINTS so both stay in sync. */
export const COLORS = {
  ink: hex(TINTS.ink),
  inkSoft: hex(TINTS.inkSoft),
  cream: hex(TINTS.cream),
  parchment: hex(TINTS.parchment),
  gold: hex(TINTS.gold),
  goldDark: hex(TINTS.goldDark),
  muted: hex(TINTS.muted),
  wood: hex(TINTS.wood),
  woodDark: hex(TINTS.woodDark),
  hp: hex(TINTS.hp),
  hunger: hex(TINTS.hunger),
  thirst: hex(TINTS.thirst),
  energy: hex(TINTS.energy),
  track: hex(TINTS.track),
  night: hex(TINTS.night),
} as const;

export const DEPTH = {
  world: 0,
  decor: 100,
  canopy: 6000,
  hud: 8000,
  banner: 8500,
  panel: 9000,
  tooltip: 9500,
} as const;
