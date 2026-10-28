import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { EventBus } from '../../src/core/eventBus';
import {
  applyDamage,
  applySleepRecovery,
  consumeFood,
  drinkFreshWater,
  respawnAfterDeath,
  spendEnergy,
  tickNeeds,
} from '../../src/systems/needsSystem';

describe('needs system', () => {
  it('drains hunger and thirst at spec rates', () => {
    const s = createNewGame(1);
    tickNeeds(s, 100);
    expect(s.player.hunger).toBeCloseTo(95);
    expect(s.player.thirst).toBeCloseTo(92);
  });

  it('zero hunger drains hp at 0.5 per second', () => {
    const s = createNewGame(1);
    s.player.hunger = 0;
    tickNeeds(s, 10);
    expect(s.player.hp).toBeCloseTo(95);
  });

  it('cooked fish restores 35 hunger and consumes one item', () => {
    const s = createNewGame(1);
    s.player.hunger = 40;
    s.inventory = [{ baseId: 'cooked_fish', count: 2 }];
    expect(consumeFood(s, 'cooked_fish')).toBe(true);
    expect(s.player.hunger).toBe(75);
    expect(s.inventory[0].count).toBe(1);
  });

  it('bandage heals 30 over 8 seconds', () => {
    const s = createNewGame(1);
    s.player.hp = 50;
    s.inventory = [{ baseId: 'bandage', count: 1 }];
    consumeFood(s, 'bandage');
    tickNeeds(s, 8);
    expect(s.player.hp).toBeCloseTo(80);
    expect(s.inventory).toHaveLength(0);
  });

  it('fresh water restores 40 thirst and caps at 100', () => {
    const s = createNewGame(1);
    s.player.thirst = 80;
    drinkFreshWater(s);
    expect(s.player.thirst).toBe(100);
  });

  it('spendEnergy refuses when energy is insufficient', () => {
    const s = createNewGame(1);
    s.player.energy = 4;
    expect(spendEnergy(s, 5)).toBe(false);
    expect(s.player.energy).toBe(4);
    expect(spendEnergy(s, 4)).toBe(true);
    expect(s.player.energy).toBe(0);
  });

  it('sleep restores energy and 20 hp', () => {
    const s = createNewGame(1);
    s.player.energy = 10;
    s.player.hp = 50;
    applySleepRecovery(s);
    expect(s.player.energy).toBe(100);
    expect(s.player.hp).toBe(70);
  });

  it('death clears backpack but keeps equipped gear', () => {
    const s = createNewGame(1);
    s.inventory = [{ baseId: 'wood', count: 5 }];
    s.hotbar[0] = 'stone_axe';
    s.equipment.weapon = 'eq_1';
    s.equipmentInstances = [{ instanceId: 'eq_1', baseId: 'club', slot: 'weapon', rarity: 'common', affixes: [], durability: 10, maxDurability: 10 }];
    s.player.hp = 0;
    respawnAfterDeath(s, new EventBus());
    expect(s.inventory).toHaveLength(0);
    expect(s.hotbar.every((x) => x === null)).toBe(true);
    expect(s.equipment.weapon).toBe('eq_1');
    expect(s.player.hp).toBe(50);
    expect(s.time.clockMin).toBe(360);
    expect(s.time.day).toBe(2);
  });

  it('respawns at wreck when no camp', () => {
    const s = createNewGame(1);
    respawnAfterDeath(s, new EventBus());
    expect(s.player.x).toBe(s.world.wreckSpawn.x);
    expect(s.player.y).toBe(s.world.wreckSpawn.y);
  });

  it('respawns at tent when one exists', () => {
    const s = createNewGame(1);
    s.buildings.push({ id: 'tent', type: 'tent', x: 100, y: 200, hp: 80 });
    respawnAfterDeath(s, new EventBus());
    expect(s.player.x).toBe(100 * 16 + 8);
    expect(s.player.y).toBe(200 * 16 + 16);
  });

  it('lethal damage marks the player dead', () => {
    const s = createNewGame(1);
    applyDamage(s, 100);
    expect(s.player.hp).toBe(0);
    expect(s.player.dead).toBe(true);
  });

  it('死在沉船里会在营地重生并退出副本状态', () => {
    const s = createNewGame(1);
    s.scene = 'dungeon';
    s.dungeonFloor = 2;
    s.buildings.push({ id: 'tent', type: 'tent', x: 100, y: 200, hp: 80 });
    respawnAfterDeath(s, new EventBus());
    expect(s.scene).toBe('island');
    expect(s.dungeonFloor).toBeNull();
    expect(s.player.x).toBe(100 * 16 + 8);
  });

  it('consumeFood 按物品数据生效', () => {
    const s = createNewGame(1);
    s.inventory = [{ baseId: 'cooked_meat', count: 1 }];
    s.player.hunger = 50;
    expect(consumeFood(s, 'cooked_meat')).toBe(true);
    expect(s.player.hunger).toBe(90);
    expect(s.inventory).toHaveLength(0);
  });
});
