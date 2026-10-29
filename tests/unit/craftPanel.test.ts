import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { craftRows, craftTabs } from '../../src/ui/craftPanel';

describe('craft panel tabs', () => {
  it('uses Chinese names for equipment outputs', () => {
    const state = createNewGame(1);
    state.camp.level = 3;
    const rows = craftRows(state, 'workbench', () => {});
    const labels = rows.map((row) => row.label);
    for (const name of ['铁矛', '铜矛', '铜甲', '铁甲']) {
      expect(labels).toContain(name);
    }
    expect(labels).not.toContain('iron_spear');
    expect(labels).not.toContain('copper_spear');
    const ironArmor = rows.find((row) => row.label === '铁甲');
    expect(ironArmor?.sub).toContain('防御 11');
  });

  it('shows hand recipes only when not using a station', () => {
    const state = createNewGame(1);
    const rows = craftRows(state, 'hand', () => {});
    expect(rows.some((row) => row.label === '木棍')).toBe(true);
    expect(rows.some((row) => row.label === '石斧')).toBe(false);
    expect(rows.some((row) => row.label === '布')).toBe(false);
  });

  it('splits the workbench book into category tabs', () => {
    const state = createNewGame(1);
    state.camp.level = 3;
    const tabs = craftTabs(state, 'workbench', () => {});
    expect(tabs.map((tab) => tab.label)).toEqual([
      '材料 2',
      '工具 9',
      '武器 5',
      '防具 11',
    ]);
    for (const tab of tabs) {
      for (const row of tab.rows) expect(row.label).not.toMatch(/[a-z_]/i);
    }
  });

  it('never exposes recipes above the current camp level', () => {
    const state = createNewGame(1);
    state.camp.level = 1;
    const rows = craftRows(state, 'workbench', () => {});
    expect(rows.some((row) => row.label === '铁甲')).toBe(false);
    expect(rows.some((row) => row.label === '毒牙矛')).toBe(false);
  });
});
