export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  state(): number;
  restore(state: number): void;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const rng: Rng = {
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min: number, max: number): number {
      return Math.floor(rng.next() * (max - min + 1)) + min;
    },
    state(): number {
      return a >>> 0;
    },
    restore(state: number): void {
      a = state >>> 0;
    },
  };
  return rng;
}
