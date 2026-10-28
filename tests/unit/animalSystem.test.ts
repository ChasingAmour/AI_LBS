import { describe, expect, it } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { ANIMALS, ANIMAL_SPAWN } from '../../src/data/animals';
import { WEAPONS } from '../../src/data/weapons';
import {
  applyHitToAnimal,
  pruneAnimals,
  spawnAnimals,
  updateAnimalAi,
} from '../../src/systems/animalSystem';
import { TILE } from '../../src/world/terrain';

/** Forest is a habitat shared by all three species. */
const forestWorld = { tileAt: () => TILE.forest };

describe('动物生成', () => {
  it('补足到上限且不超过', () => {
    const state = createNewGame(42);
    spawnAnimals(state, forestWorld, createRng(42));
    const small = state.animals.filter((a) => ANIMALS[a.type].size === 'small').length;
    const large = state.animals.filter((a) => ANIMALS[a.type].size === 'large').length;
    expect(small).toBe(ANIMAL_SPAWN.smallCap);
    expect(large).toBe(ANIMAL_SPAWN.largeCap);
    spawnAnimals(state, forestWorld, createRng(43));
    expect(state.animals.length).toBe(ANIMAL_SPAWN.smallCap + ANIMAL_SPAWN.largeCap);
  });

  it('同种子同一天生成同样位置', () => {
    const a = createNewGame(7);
    const b = createNewGame(7);
    spawnAnimals(a, forestWorld, createRng(7));
    spawnAnimals(b, forestWorld, createRng(999));
    expect(a.animals.map((x) => [x.type, x.x, x.y])).toEqual(
      b.animals.map((x) => [x.type, x.x, x.y]),
    );
  });

  it('离场再补货不会产生重复 id', () => {
    const state = createNewGame(21);
    for (let cycle = 0; cycle < 4; cycle++) {
      spawnAnimals(state, forestWorld, createRng(21 + cycle));
      state.animals = state.animals.filter((_, index) => index % 3 !== 0);
    }
    const ids = state.animals.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('换天后不会累积昨天的动物', () => {
    const state = createNewGame(31);
    spawnAnimals(state, forestWorld, createRng(31));
    expect(state.animals.length).toBe(ANIMAL_SPAWN.smallCap + ANIMAL_SPAWN.largeCap);
    state.time.day = 2;
    spawnAnimals(state, forestWorld, createRng(32));
    expect(state.animals.length).toBe(ANIMAL_SPAWN.smallCap + ANIMAL_SPAWN.largeCap);
  });

  it('只落在栖息地上', () => {
    const state = createNewGame(11);
    const waterWorld = { tileAt: () => TILE.deepWater };
    spawnAnimals(state, waterWorld, createRng(11));
    expect(state.animals).toEqual([]);
  });
});

describe('动物行为', () => {
  it('游荡时不伤害玩家', () => {
    const state = createNewGame(1);
    state.player.hp = 100;
    const animal = spawnAnimals(state, forestWorld, createRng(1))[0];
    for (let i = 0; i < 100; i++) updateAnimalAi(state, animal, 0.1, forestWorld);
    expect(state.player.hp).toBe(100);
    expect(animal.mode).toBe('wander');
  });

  it('被命中后反击并造成伤害', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, forestWorld, createRng(1))[0];
    animal.x = state.player.x + 10;
    animal.y = state.player.y;
    applyHitToAnimal(state, animal, WEAPONS.fist, createRng(5));
    expect(animal.mode).toBe('retaliate');
    const before = state.player.hp;
    for (let i = 0; i < 40; i++) updateAnimalAi(state, animal, 0.1, forestWorld);
    expect(state.player.hp).toBeLessThan(before);
  });

  it('玩家跑远 5 秒后脱战', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, forestWorld, createRng(1))[0];
    applyHitToAnimal(state, animal, WEAPONS.fist, createRng(5));
    state.player.x = animal.x + ANIMALS[animal.type].leashRange + 50;
    state.player.y = animal.y;
    for (let i = 0; i < 60; i++) updateAnimalAi(state, animal, 0.1, forestWorld);
    expect(animal.mode).toBe('wander');
  });

  it('面板打开时动物不会继续咬人', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, forestWorld, createRng(1))[0];
    animal.x = state.player.x + 5;
    animal.y = state.player.y;
    applyHitToAnimal(state, animal, WEAPONS.fist, createRng(5));
    const before = state.player.hp;
    for (let i = 0; i < 60; i++) updateAnimalAi(state, animal, 0.1, forestWorld, true);
    expect(state.player.hp).toBe(before);
  });
});

describe('动物清理', () => {
  it('夜晚全部离场', () => {
    const state = createNewGame(1);
    spawnAnimals(state, forestWorld, createRng(1));
    pruneAnimals(state, 1200);
    expect(state.animals).toEqual([]);
  });

  it('玩家走远后个体离场', () => {
    const state = createNewGame(1);
    spawnAnimals(state, forestWorld, createRng(1));
    state.player.x += ANIMAL_SPAWN.despawnDist + ANIMAL_SPAWN.maxDist + 10;
    pruneAnimals(state, 600);
    expect(state.animals).toEqual([]);
  });
});

describe('动物掉落', () => {
  it('打死野猪掉 3 到 4 份生肉', () => {
    const state = createNewGame(1);
    const animal = spawnAnimals(state, forestWorld, createRng(1)).find((a) => a.type === 'boar')!;
    const meat = () =>
      state.inventory.filter((i) => i.baseId === 'raw_meat').reduce((sum, i) => sum + i.count, 0);
    applyHitToAnimal(state, animal, WEAPONS.spear, createRng(5));
    const before = meat();
    for (let i = 0; i < 10 && animal.mode !== 'dead'; i++) {
      applyHitToAnimal(state, animal, WEAPONS.spear, createRng(5 + i));
    }
    expect(animal.mode).toBe('dead');
    expect(meat() - before).toBeGreaterThanOrEqual(3);
    expect(meat() - before).toBeLessThanOrEqual(4);
  });
});
