import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng';
import { ITEMS } from '../../src/data/items';
import { RECIPES } from '../../src/data/recipes';
import {
  FISHING_ROD_ID,
  rollCatch,
  startFishing,
  tapFishing,
  tickFishing,
  type FishingSession,
} from '../../src/systems/fishingSystem';
import { itemIcon } from '../../src/ui/itemIcons';

function cast(): FishingSession {
  return startFishing(createRng(7));
}

function toBite(session: FishingSession): void {
  tickFishing(session, 0.6);
  tickFishing(session, session.timer);
}

describe('fishing state machine', () => {
  it('starts with a 0.6s cast then waits 1.2-3s', () => {
    const session = cast();
    expect(session.phase).toBe('casting');
    expect(session.timer).toBeCloseTo(0.6);
    tickFishing(session, 0.6);
    expect(session.phase).toBe('waiting');
    expect(session.timer).toBeGreaterThanOrEqual(1.2);
    expect(session.timer).toBeLessThanOrEqual(3);
  });

  it('bites after the wait and fails if the player misses', () => {
    const session = cast();
    toBite(session);
    expect(session.phase).toBe('bite');
    tickFishing(session, 1.3);
    expect(session.phase).toBe('failed');
    expect(session.result).toBe('fail');
  });

  it('starts reeling on a timely tap and lands after three taps', () => {
    const session = cast();
    toBite(session);
    tapFishing(session);
    expect(session.phase).toBe('reeling');
    expect(session.needed).toBe(3);
    tapFishing(session);
    tapFishing(session);
    tapFishing(session);
    tapFishing(session);
    expect(session.phase).toBe('done');
    expect(session.result).toBe('success');
  });

  it('fails when the reel window expires', () => {
    const session = cast();
    toBite(session);
    tapFishing(session);
    tickFishing(session, 2.6);
    expect(session.phase).toBe('failed');
  });

  it('ignores taps outside the bite/reel phases', () => {
    const session = cast();
    tapFishing(session);
    expect(session.phase).toBe('casting');
    expect(session.taps).toBe(0);
  });
});

describe('fishing loot', () => {
  it('returns 1-2 valid items and mostly fish', () => {
    const rng = createRng(3);
    let fish = 0;
    for (let i = 0; i < 40; i++) {
      const items = rollCatch(rng);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(2);
      for (const item of items) {
        expect(['raw_fish', 'tropical_fish', 'seaweed', 'flint', 'cloth']).toContain(item.baseId);
        expect(item.count).toBeGreaterThan(0);
      }
      if (items.some((item) => item.baseId === 'raw_fish')) fish += 1;
    }
    expect(fish).toBeGreaterThan(0);
  });

  it('defines the rod, recipe and icons', () => {
    expect(FISHING_ROD_ID).toBe('fishing_rod');
    expect(ITEMS.fishing_rod.maxDurability).toBe(60);
    expect(ITEMS.tropical_fish.food?.hunger).toBe(12);
    expect(RECIPES.fishing_rod.output).toBe('fishing_rod');
    expect(itemIcon('fishing_rod')).not.toBeNull();
    expect(itemIcon('tropical_fish')).not.toBeNull();
    expect(itemIcon('seaweed')).not.toBeNull();
  });
});
