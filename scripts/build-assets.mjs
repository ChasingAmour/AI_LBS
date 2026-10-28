#!/usr/bin/env node
/**
 * Validates the runtime pixel assets copied from the Kenney packs and the
 * Fusion Pixel font. Idempotent: it never rewrites files, only checks them.
 *
 * Run with `npm run assets`. Exits non-zero when a required asset is missing
 * or has unexpected dimensions, so CI fails before the build produces a
 * broken bundle.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'public', 'assets');

const PNG_SIGNATURE = '89504e470d0a1a0a';

function pngSize(path) {
  const buf = readFileSync(path);
  if (buf.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error(`${path} is not a PNG file`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const EXPECTED = [
  ['tiles/town.png', 192, 176],
  ['tiles/battle.png', 288, 176],
  ['tiles/dungeon.png', 192, 176],
  ['tiles/farm.png', 192, 176],
  ['ui/ui-large.png', 416, 224],
  ['ui/ui-small.png', 368, 112],
];

const errors = [];

for (const [rel, width, height] of EXPECTED) {
  const path = join(assets, rel);
  if (!existsSync(path)) {
    errors.push(`missing ${rel}`);
    continue;
  }
  const size = pngSize(path);
  if (size.width !== width || size.height !== height) {
    errors.push(`${rel} is ${size.width}x${size.height}, expected ${width}x${height}`);
  }
}

for (const rel of ['fonts/fusion-pixel-12px.woff2', 'fonts/OFL.txt']) {
  if (!existsSync(join(assets, rel))) errors.push(`missing ${rel}`);
}

if (errors.length > 0) {
  console.error('Asset check failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Asset check passed (${EXPECTED.length} sheets + font).`);
