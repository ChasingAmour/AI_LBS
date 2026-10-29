import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createSavage } from '../../src/entities/savage';
import { createDungeonEnemy, damageDungeonEnemy } from '../../src/entities/dungeonEnemy';
import { applyHitToSavage } from '../../src/systems/combatSystem';
import { applyDamage } from '../../src/systems/needsSystem';
import { WEAPONS } from '../../src/data/weapons';
import { createAnimal } from '../../src/entities/animal';
import { applyHitToAnimal } from '../../src/systems/animalSystem';
import { createRng } from '../../src/core/rng';

describe('damage formula', () => {
  it('applies player defense then armor', () => {
    const state = createNewGame(1);
    state.player.level = 5; // defense 4, armor 8%
    applyDamage(state, 20);
    expect(state.player.hp).toBe(100 - Math.round((20 - 4) * 0.92));
  });

  it('always deals at least one damage', () => {
    const state = createNewGame(1);
    state.player.level = 20;
    applyDamage(state, 2);
    expect(state.player.hp).toBe(99);
  });

  it('applies monster defense then armor, and armor pierce only skips defense', () => {
    const savage = { ...createSavage('s1', 0, 0), defense: 2, armor: 20 };
    const weapon = WEAPONS.club;
    applyHitToSavage(savage, weapon, 0, { attack: 4 });
    expect(savage.hp).toBe(60 - Math.round((weapon.damage + 4 - 2) * 0.8));

    const pierced = { ...createSavage('s2', 0, 0), defense: 2, armor: 20 };
    applyHitToSavage(pierced, weapon, 0, { attack: 4, armorPierce: true });
    expect(pierced.hp).toBe(60 - Math.round((weapon.damage + 4) * 0.8));
  });

  it('applies dungeon armor and shell reduction', () => {
    const hermit = createDungeonEnemy('hermit', 0, 0, 'h1');
    const before = hermit.hp;
    damageDungeonEnemy(hermit, 10, 0);
    expect(hermit.hp).toBe(before - Math.round((10 - hermit.defense) * (1 - hermit.armor / 100)));
  });

  it('applies animal defense and armor', () => {
    const state = createNewGame(1);
    const boar = createAnimal('a1', 'boar', 10, 10);
    const before = boar.hp;
    applyHitToAnimal(state, boar, WEAPONS.spear, createRng(1), { attack: 4 });
    expect(boar.hp).toBe(before - Math.round((WEAPONS.spear.damage + 4 - 1) * 0.9));
  });
});
