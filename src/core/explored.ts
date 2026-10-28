import { SaveError } from '../systems/saveError';

/** 625/32 = 19.5 and 375/32 = 11.7, so the world is 20×12 chunks. */
export const EXPLORED_COLS = 20;
export const EXPLORED_ROWS = 12;
const EXPLORED_BITS = EXPLORED_COLS * EXPLORED_ROWS;
const EXPLORED_BYTES = EXPLORED_BITS / 8;

/**
 * Packs explored chunk keys ("cx,cy") into 30 bytes of base64. One bit per
 * chunk keeps the save small even after the whole island is mapped.
 */
export function encodeExplored(chunks: Iterable<string>): string {
  const bytes = new Uint8Array(EXPLORED_BYTES);
  for (const key of chunks) {
    const [cx, cy] = key.split(',').map(Number);
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) continue;
    if (cx < 0 || cx >= EXPLORED_COLS || cy < 0 || cy >= EXPLORED_ROWS) continue;
    const index = cy * EXPLORED_COLS + cx;
    bytes[index >> 3] |= 1 << (index & 7);
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Inverse of encodeExplored; throws SaveError on malformed input. */
export function decodeExplored(raw: string): Set<string> {
  if (raw === '') return new Set();
  let binary: string;
  try {
    binary = atob(raw);
  } catch {
    throw new SaveError('探索数据不是合法 base64');
  }
  if (binary.length !== EXPLORED_BYTES) throw new SaveError('探索数据长度不正确');
  const result = new Set<string>();
  for (let index = 0; index < EXPLORED_BITS; index++) {
    if ((binary.charCodeAt(index >> 3) >> (index & 7)) & 1) {
      result.add(`${index % EXPLORED_COLS},${Math.floor(index / EXPLORED_COLS)}`);
    }
  }
  return result;
}
