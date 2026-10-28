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

  it('贴身敌人每秒都能再次攻击', () => {
    const enemy = createDungeonEnemy('crab', 0, 0, 'e1');
    const player = { x: 10, y: 0 };
    expect(enemyAttack(enemy, 10)).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) tickDungeonEnemy(enemy, player, 0.1, i * 0.1);
    expect(enemyAttack(enemy, 10)).toBe(0);
    for (let i = 0; i < 10; i++) tickDungeonEnemy(enemy, player, 0.1, 1 + i * 0.1);
    expect(enemyAttack(enemy, 10)).toBeGreaterThan(0);
  });

  it('怪物不会穿墙', () => {
    const enemy = createDungeonEnemy('crab', 40, 40, 'e1');
    const player = { x: 200, y: 40 };
    // wall column at tile x = 3 (pixels 48..64)
    const walkable = (tx: number) => tx !== 3;
    for (let i = 0; i < 120; i++) tickDungeonEnemy(enemy, player, 0.1, i * 0.1, walkable);
    expect(enemy.x).toBeLessThan(48);
  });

  it('视野外不会发现玩家', () => {
    const enemy = createDungeonEnemy('crab', 0, 0, 'e1');
    const player = { x: 400, y: 0 };
    for (let i = 0; i < 60; i++) tickDungeonEnemy(enemy, player, 0.1, i * 0.1);
    expect(enemy.alerted).toBe(false);
    expect(enemy.x).toBe(0);
  });

  it('走进视野才会追', () => {
    const enemy = createDungeonEnemy('crab', 0, 0, 'e1');
    const player = { x: 60, y: 0 };
    for (let i = 0; i < 10; i++) tickDungeonEnemy(enemy, player, 0.1, i * 0.1);
    expect(enemy.alerted).toBe(true);
    expect(enemy.x).toBeGreaterThan(0);
  });

  it('墙挡住视线时不追', () => {
    const enemy = createDungeonEnemy('crab', 0, 0, 'e1');
    const player = { x: 60, y: 0 };
    const blocked = () => false;
    for (let i = 0; i < 20; i++) tickDungeonEnemy(enemy, player, 0.1, i * 0.1, undefined, blocked);
    expect(enemy.alerted).toBe(false);
    expect(enemy.x).toBe(0);
  });

  it('挨打后会立刻警觉', () => {
    const enemy = createDungeonEnemy('crab', 0, 0, 'e1');
    damageDungeonEnemy(enemy, 1, 0);
    expect(enemy.alerted).toBe(true);
  });
});
