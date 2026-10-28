import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem, countItem } from '../../src/systems/inventorySystem';
import {
  BUILDINGS,
  campRingBounds,
  canPlace,
  damageBuilding,
  demolishBuilding,
  getStorage,
  hasCampFlag,
  placeBuilding,
  placementBanner,
} from '../../src/systems/buildingSystem';

/** Founds the camp without touching material counts, for placement tests. */
function flagAt(s: ReturnType<typeof createNewGame>, x = 40, y = 40): void {
  s.buildings.push({ id: 'b_flag', type: 'flag', x, y, hp: 999 });
  s.camp.center = { x, y };
}

describe('building system', () => {
  it('places campfire inside camp radius and spends materials', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const b = placeBuilding(s, 'campfire', 48, 48);
    expect(b).not.toBeNull();
    expect(countItem(s, 'wood')).toBe(0);
    expect(countItem(s, 'stone')).toBe(0);
    expect(b?.hp).toBe(BUILDINGS.campfire.hp);
    expect(s.buildings).toHaveLength(2);
  });

  it('rejects placement outside camp radius', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    expect(canPlace(s, 'campfire', 5, 5).reason).toBe('超出营地范围');
    expect(placeBuilding(s, 'campfire', 5, 5)).toBeNull();
  });

  it('rejects placement on an occupied tile', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 20);
    addItem(s, 'stone', 8);
    placeBuilding(s, 'campfire', 48, 48);
    expect(canPlace(s, 'campfire', 48, 48).ok).toBe(false);
  });

  it('rejects locked buildings above the current camp level', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'stone', 2);
    expect(canPlace(s, 'stone_wall', 48, 48).ok).toBe(false);
  });

  it('rejects placement on water or resource nodes', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const world = {
      isWater: (x: number, y: number) => x === 40 && y === 40,
      hasNode: (x: number, y: number) => x === 41 && y === 41,
    };
    expect(canPlace(s, 'campfire', 40, 40, world).ok).toBe(false);
    expect(canPlace(s, 'campfire', 41, 41, world).ok).toBe(false);
    expect(canPlace(s, 'campfire', 42, 42, world).ok).toBe(true);
  });

  it('demolishing refunds half of the cost rounded up', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    const b = placeBuilding(s, 'campfire', 48, 48)!;
    demolishBuilding(s, b.id);
    expect(countItem(s, 'wood')).toBe(5);
    expect(countItem(s, 'stone')).toBe(4);
    expect(s.buildings).toHaveLength(1);
  });

  it('destroyed storage spills its contents', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 15);
    addItem(s, 'vine', 4);
    const box = placeBuilding(s, 'storage', 48, 48)!;
    expect(box).not.toBeNull();
    box.storage = [{ baseId: 'cooked_fish', count: 3 }];
    damageBuilding(s, box.id, 999);
    expect(s.buildings.find((b) => b.id === box.id)).toBeUndefined();
    expect(s.world.groundLoot.some((g) => g.baseId === 'cooked_fish')).toBe(true);
  });

  it('exposes the first storage box', () => {
    const s = createNewGame(1);
    flagAt(s);
    addItem(s, 'wood', 15);
    addItem(s, 'vine', 4);
    expect(getStorage(s)).toBeNull();
    const box = placeBuilding(s, 'storage', 48, 48)!;
    expect(getStorage(s)?.id).toBe(box.id);
  });

  it('没有旗子时不能建造其它建筑', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 10);
    addItem(s, 'stone', 8);
    expect(canPlace(s, 'campfire', 48, 48).reason).toBe('先插旗建立据点');
  });

  it('旗子忽略营地半径且只能插一面', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 2);
    expect(canPlace(s, 'flag', 500, 300).ok).toBe(true);
    placeBuilding(s, 'flag', 500, 300);
    expect(hasCampFlag(s)).toBe(true);
    expect(s.camp.center).toEqual({ x: 500, y: 300 });
    expect(canPlace(s, 'flag', 20, 20).reason).toBe('据点已建立');
  });

  it('旗子不可拆也不可被破坏', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 1);
    const flag = placeBuilding(s, 'flag', 30, 30)!;
    demolishBuilding(s, flag.id);
    damageBuilding(s, flag.id, 999);
    expect(s.buildings).toContainEqual(expect.objectContaining({ id: flag.id }));
  });

  it('插旗后半径内可建造、半径外仍被拒', () => {
    const s = createNewGame(1);
    addItem(s, 'wood', 200);
    addItem(s, 'stone', 200);
    placeBuilding(s, 'flag', 100, 100);
    expect(canPlace(s, 'campfire', 108, 100).ok).toBe(true);
    expect(canPlace(s, 'campfire', 120, 100).reason).toBe('超出营地范围');
  });

  it('范围圈包围盒以旗子格中心为圆心', () => {
    expect(campRingBounds({ x: 100, y: 100 }, 12)).toEqual({
      x: 100 * 16 + 8 - 192,
      y: 100 * 16 + 8 - 192,
      w: 384,
      h: 384,
    });
  });

  it('插旗的横幅是据点已建立', () => {
    expect(placementBanner('flag')).toBe('据点已建立');
    expect(placementBanner('campfire')).toBe('建成了营火');
  });
});
