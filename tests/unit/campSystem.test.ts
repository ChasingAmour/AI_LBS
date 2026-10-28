import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { EventBus } from '../../src/core/eventBus';
import { spawnRaid } from '../../src/systems/raidSystem';
import { generateIsland } from '../../src/world/generate';
import { TILE } from '../../src/world/terrain';
import {
  checkCampUpgrade,
  getCampChecklist,
  getCaptiveCap,
  getNextCampLevel,
} from '../../src/systems/campSystem';

/** Camp upgrades only happen once a flag exists. */
function withFlag(s: ReturnType<typeof createNewGame>): void {
  s.buildings.push({ id: 'b_flag', type: 'flag', x: 48, y: 48, hp: 999 });
}

describe('camp system', () => {
  it('upgrades to lv1 with campfire workbench and cage', () => {
    const s = createNewGame(1);
    withFlag(s);
    for (const type of ['campfire', 'workbench', 'cage']) {
      s.buildings.push({ id: type, type, x: 0, y: 0, hp: 100 });
    }
    expect(checkCampUpgrade(s, new EventBus())).toBe(1);
    expect(getCaptiveCap(s)).toBe(1);
  });

  it('emits camp:levelUp and save:requested on upgrade', () => {
    const s = createNewGame(1);
    withFlag(s);
    for (const type of ['campfire', 'workbench', 'cage']) {
      s.buildings.push({ id: type, type, x: 0, y: 0, hp: 100 });
    }
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('camp:levelUp', () => events.push('levelUp'));
    bus.on('save:requested', () => events.push('save'));
    checkCampUpgrade(s, bus);
    expect(events).toEqual(['levelUp', 'save']);
  });

  it('never downgrades when a building is demolished', () => {
    const s = createNewGame(1);
    s.camp.level = 2;
    s.buildings = [];
    expect(checkCampUpgrade(s, new EventBus())).toBe(2);
    expect(getCaptiveCap(s)).toBe(3);
  });

  it('没有旗子时营地不会升级', () => {
    const s = createNewGame(1);
    for (const type of ['campfire', 'workbench', 'cage']) {
      s.buildings.push({ id: type, type, x: 0, y: 0, hp: 100 });
    }
    expect(checkCampUpgrade(s, new EventBus())).toBe(0);
  });

  it('没有旗子时入侵仍能刷在兜底营地中心', () => {
    const s = createNewGame(1);
    const savages = spawnRaid(s);
    expect(savages.length).toBeGreaterThan(0);
    expect(Number.isFinite(savages[0].x)).toBe(true);
  });

  it('兜底营地中心落在陆地上，入侵不会刷进深海', () => {
    const s = createNewGame(3);
    const island = generateIsland(s.world.seed);
    s.camp.center = {
      x: Math.floor(island.campCenter.x / 16),
      y: Math.floor(island.campCenter.y / 16),
    };
    const savages = spawnRaid(s);
    const tile =
      island.terrain[
        Math.floor(savages[0].y / 16) * island.width + Math.floor(savages[0].x / 16)
      ];
    expect(tile).not.toBe(TILE.deepWater);
  });

  it('upgrades to lv2 with tent storage and eight fences', () => {
    const s = createNewGame(1);
    withFlag(s);
    s.camp.level = 1;
    s.buildings.push({ id: 'tent', type: 'tent', x: 0, y: 0, hp: 80 });
    s.buildings.push({ id: 'box', type: 'storage', x: 0, y: 0, hp: 80 });
    for (let i = 0; i < 8; i++) {
      s.buildings.push({ id: `f${i}`, type: 'fence', x: i, y: 0, hp: 60 });
    }
    expect(checkCampUpgrade(s, new EventBus())).toBe(2);
    expect(getCaptiveCap(s)).toBe(3);
  });

  it('upgrades to lv3 with twelve stone walls and a drying rack', () => {
    const s = createNewGame(1);
    withFlag(s);
    s.camp.level = 2;
    s.buildings.push({ id: 'rack', type: 'drying_rack', x: 0, y: 0, hp: 60 });
    for (let i = 0; i < 12; i++) {
      s.buildings.push({ id: `w${i}`, type: 'stone_wall', x: i, y: 0, hp: 200 });
    }
    expect(checkCampUpgrade(s, new EventBus())).toBe(3);
    expect(getCaptiveCap(s)).toBe(6);
  });

  it('reports partial fence progress', () => {
    const s = createNewGame(1);
    s.camp.level = 1;
    s.buildings = Array.from({ length: 3 }, (_, i) => ({
      id: `f${i}`,
      type: 'fence',
      x: 0,
      y: 0,
      hp: 60,
    }));
    const row = getCampChecklist(s).find((r) => r.label.includes('木栅栏'));
    expect(row).toMatchObject({ have: 3, need: 8, done: false });
  });

  it('shows the max level message at lv3', () => {
    const s = createNewGame(1);
    s.camp.level = 3;
    expect(getNextCampLevel(s)).toBeNull();
    expect(getCampChecklist(s)[0].label).toContain('满级');
  });
});
