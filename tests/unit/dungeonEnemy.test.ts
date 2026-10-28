import { describe, it, expect } from 'vitest';
import {
  applyPoison,
  applySlow,
  createDungeonEnemy,
  damageDungeonEnemy,
  enemyAttack,
  enemySpeed,
  hazardEffect,
  isShelled,
  tickDungeonEnemy,
} from '../../src/entities/dungeonEnemy';

describe('dungeon enemies', () => {
  it('hermit shells for 2s every 6s and halves incoming damage', () => {
    const hermit = createDungeonEnemy('hermit', 0, 0, 'h1');
    tickDungeonEnemy(hermit, { x: 100, y: 0 }, 0.1, 6);
    expect(isShelled(hermit, 6)).toBe(true);
    expect(damageDungeonEnemy(hermit, 10, 6)).toBe('hit');
    expect(hermit.hp).toBe(80 - Math.max(1, Math.ceil((10 - 2) / 2)));
    expect(isShelled(hermit, 8.1)).toBe(false);
  });

  it('snake lunges at close range then retreats', () => {
    const snake = createDungeonEnemy('snake', 0, 0, 's1');
    tickDungeonEnemy(snake, { x: 40, y: 0 }, 0.1, 2);
    expect(enemySpeed(snake, 2)).toBeGreaterThan(80);
    expect(enemySpeed(snake, 2.5)).toBeLessThan(80);
  });

  it('slow and poison affect speed and health', () => {
    const crab = createDungeonEnemy('crab', 0, 0, 'c1');
    applySlow(crab, 1, 2);
    expect(enemySpeed(crab, 2)).toBeLessThan(45);
    applyPoison(crab, 1, 2);
    applyPoison(crab, 1, 2);
    const damage = 0.5 * 2 * 3;
    expect(crab.poisonStacks).toBe(2);
    expect(damage).toBe(3);
  });

  it('attacks on cooldown at melee range', () => {
    const crab = createDungeonEnemy('crab', 0, 0, 'c2');
    expect(enemyAttack(crab, 10)).toBe(5);
    expect(enemyAttack(crab, 10)).toBe(0);
  });

  it('flooded rooms drain energy and slow movement', () => {
    expect(hazardEffect({ x: 0, y: 0, kind: 'flooded' })).toEqual({
      damage: 0,
      energyPerSec: 1,
      slow: true,
    });
    expect(hazardEffect({ x: 0, y: 0, kind: 'collapse' }).damage).toBe(20);
  });
});
