export const GAME_CONFIG = {
  type: 0,
  parent: 'app',
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#101418',
  scale: {
    mode: 0,
    autoCenter: 0,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

/** World size in pixels and tiles. 16px tiles, 625×375 tiles. */
export const WORLD = {
  widthPx: 10000,
  heightPx: 6000,
  tile: 16,
  widthTiles: 625,
  heightTiles: 375,
} as const;

export const CONFIG = {
  tileSize: 16,
  daySeconds: 900,
  daySegmentSeconds: 600,
  nightSegmentSeconds: 300,
  startClockMin: 360,
  raidHour: 18,
  warnHour: 17,
  campRadiusTiles: 12,
  inventorySlots: 24,
  hotbarSlots: 8,
  stackMax: 99,
};
