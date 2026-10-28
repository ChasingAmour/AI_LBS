export const GAME_CONFIG = {
  type: 0,
  parent: 'app',
  width: 640,
  height: 360,
  zoom: 2,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#101418',
  scale: {
    mode: 3,
    autoCenter: 1,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

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
