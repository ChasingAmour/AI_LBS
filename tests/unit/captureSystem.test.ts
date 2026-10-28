import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem, countItem } from '../../src/systems/inventorySystem';
import { canCapture, captureSavage } from '../../src/systems/captureSystem';
import type { SavageState } from '../../src/entities/savage';

function stunnedSavage(id = 's1'): SavageState {
  return {
    id,
    x: 100,
    y: 100,
    hp: 20,
    stun: 100,
    stunnedUntil: 8,
    lastHitAgo: 0,
    mode: 'stunned',
  };
}

function laborer(id = 'l1') {
  return {
    id,
    name: '星期五',
    x: 0,
    y: 0,
    loyalty: 1 as const,
    task: null,
    carrying: 0,
    carryingType: null,
  };
}

describe('capture system', () => {
  it('rejects capture when cage full or no vine', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    const savage = stunnedSavage();
    addItem(s, 'vine', 1);
    s.laborers.push(laborer());
    expect(canCapture(s, savage).ok).toBe(false);

    s.laborers = [];
    s.inventory = [];
    expect(canCapture(s, savage).ok).toBe(false);
  });

  it('rejects capture without a cage (camp lv0)', () => {
    const s = createNewGame(1);
    addItem(s, 'vine', 1);
    expect(canCapture(s, stunnedSavage()).ok).toBe(false);
  });

  it('rejects capture when the savage is not stunned', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    addItem(s, 'vine', 1);
    const savage = stunnedSavage();
    savage.mode = 'attack';
    savage.stunnedUntil = null;
    expect(canCapture(s, savage).ok).toBe(false);
  });

  it('captures a stunned savage, consumes one vine and names the first laborer Friday', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    addItem(s, 'vine', 1);
    s.savages.push(stunnedSavage());
    const captured = captureSavage(s, 's1');
    expect(captured).not.toBeNull();
    expect(captured?.name).toBe('星期五');
    expect(captured?.loyalty).toBe(1);
    expect(countItem(s, 'vine')).toBe(0);
    expect(s.savages).toHaveLength(0);
    expect(s.laborers).toHaveLength(1);
  });

  it('returns null when capture preconditions fail', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    s.savages.push(stunnedSavage());
    expect(captureSavage(s, 's1')).toBeNull();
    expect(s.savages).toHaveLength(1);
  });
});
