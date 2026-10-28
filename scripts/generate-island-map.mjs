import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 96;
const H = 96;
const TILE = 16;
const T = { deep: 1, shallow: 2, sand: 3, grass: 4, forest: 5, rock: 6, stream: 7, clay: 8 };

const COLORS = {
  0: [27, 58, 75],
  1: [47, 111, 126],
  2: [217, 197, 143],
  3: [111, 155, 82],
  4: [77, 122, 63],
  5: [122, 117, 104],
  6: [63, 127, 155],
  7: [154, 111, 79],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function makePng(width, height, pixelAt) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function tilePixel(x, y) {
  const index = Math.floor(x / TILE);
  const base = COLORS[index] ?? [255, 0, 255];
  const lx = x % TILE;
  const ly = y % TILE;
  const edge = lx === 0 || ly === 0 ? 0.9 : lx === TILE - 1 || ly === TILE - 1 ? 0.82 : 1;
  const noise = ((x * 13 + y * 7) % 11 === 0) ? 0.94 : 1;
  return [
    Math.round(base[0] * edge * noise),
    Math.round(base[1] * edge * noise),
    Math.round(base[2] * edge * noise),
    255,
  ];
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = lcg(20261028);

function dist(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}

function insideIsland(x, y) {
  const angle = Math.atan2(y - 48, x - 48);
  const radius = 34 + 3 * Math.sin(angle * 3) + 2 * Math.cos(angle * 5);
  return dist(x, y, 48, 48) <= radius;
}

function groundAt(x, y) {
  const angle = Math.atan2(y - 48, x - 48);
  const radius = 34 + 3 * Math.sin(angle * 3) + 2 * Math.cos(angle * 5);
  const d = dist(x, y, 48, 48);
  if (d > radius + 4) return T.deep;
  if (d > radius) return T.shallow;
  if (d > radius - 2) return T.sand;
  if (dist(x, y, 48, 48) < 6) return T.grass;
  if (dist(x, y, 34, 58) < 3) return T.clay;
  if (dist(x, y, 66, 38) < 7) return T.rock;
  if (y >= 30 && y <= 62 && Math.abs(x - (30 + Math.sin(y * 0.2) * 3)) < 1.2) return T.stream;
  if (dist(x, y, 72, 50) < 3) return T.sand;
  if (dist(x, y, 12, 48) < 4) return T.sand;
  const forestNoise =
    Math.sin(x * 0.31) + Math.cos(y * 0.27) + Math.sin((x + y) * 0.13);
  if (forestNoise > 1.2) return T.forest;
  return T.grass;
}

const ground = [];
const collision = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const gid = groundAt(x, y);
    ground.push(gid);
    collision.push(gid === T.deep ? 8 : 0);
  }
}

const objects = [];
let objectId = 0;
const occupied = new Set();

function addObject(name, type, tileX, tileY, properties = []) {
  objectId += 1;
  objects.push({
    id: objectId,
    name,
    type,
    x: tileX * 16,
    y: tileY * 16,
    width: 16,
    height: 16,
    rotation: 0,
    visible: true,
    properties,
  });
  occupied.add(`${tileX},${tileY}`);
}

addObject('spawn_wreck', 'spawn', 12, 48);
addObject('camp_center', 'camp', 48, 48);
addObject('chest_wreck', 'chest', 14, 50);
addObject('chest_cave', 'chest', 66, 38);
addObject('dungeon_entrance', 'dungeon', 72, 50);

let tree = 0, rock = 0, vine = 0, berry = 0, palm = 0, tide = 0, clay = 0;
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const key = `${x},${y}`;
    if (occupied.has(key)) continue;
    if (dist(x, y, 48, 48) < 7) continue;
    const g = ground[y * W + x];
    if (g === T.forest && rng() < 0.18 && tree < 45) {
      tree += 1;
      addObject(`tree_${String(tree).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'tree' },
      ]);
    } else if (g === T.rock && rng() < 0.35 && rock < 15) {
      rock += 1;
      addObject(`rock_${String(rock).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'rock' },
      ]);
    } else if (g === T.forest && rng() < 0.05 && vine < 8) {
      vine += 1;
      addObject(`vine_${String(vine).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'vine' },
      ]);
    } else if ((g === T.grass || g === T.forest) && rng() < 0.04 && berry < 8) {
      berry += 1;
      addObject(`berry_${String(berry).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'berry' },
      ]);
    } else if (g === T.sand && rng() < 0.1 && dist(x, y, 12, 48) > 3 && dist(x, y, 72, 50) > 3 && palm < 6) {
      palm += 1;
      addObject(`palm_${String(palm).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'palm' },
      ]);
    } else if (g === T.shallow && rng() < 0.05 && tide < 5) {
      tide += 1;
      addObject(`tide_${String(tide).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'tide' },
      ]);
    } else if (g === T.clay && rng() < 0.4 && clay < 4) {
      clay += 1;
      addObject(`clay_${String(clay).padStart(3, '0')}`, 'node', x, y, [
        { name: 'nodeType', type: 'string', value: 'clay' },
      ]);
    }
  }
}

const map = {
  compressionlevel: -1,
  height: H,
  width: W,
  infinite: false,
  layers: [
    {
      data: ground,
      height: H,
      id: 1,
      name: 'ground',
      opacity: 1,
      type: 'tilelayer',
      visible: true,
      width: W,
      x: 0,
      y: 0,
    },
    {
      data: collision,
      height: H,
      id: 2,
      name: 'collision',
      opacity: 1,
      type: 'tilelayer',
      visible: false,
      width: W,
      x: 0,
      y: 0,
    },
    {
      draworder: 'topdown',
      id: 3,
      name: 'objects',
      objects,
      opacity: 1,
      type: 'objectgroup',
      visible: true,
      x: 0,
      y: 0,
    },
  ],
  nextlayerid: 4,
  nextobjectid: objectId + 1,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tilesets: [
    {
      columns: 8,
      firstgid: 1,
      image: '../tiles/placeholder.png',
      imageheight: 16,
      imagewidth: 128,
      margin: 0,
      name: 'placeholder',
      spacing: 0,
      tilecount: 8,
      tileheight: 16,
      tilewidth: 16,
    },
  ],
  tilewidth: 16,
  tileheight: 16,
  type: 'map',
  version: '1.10',
};

mkdirSync('public/assets/maps', { recursive: true });
mkdirSync('public/assets/tiles', { recursive: true });
writeFileSync('public/assets/tiles/placeholder.png', makePng(128, 16, tilePixel));
writeFileSync('public/assets/maps/island.tmj', JSON.stringify(map, null, 2));
console.log(`generated island: ${tree} trees, ${rock} rocks, ${objects.length} objects`);
