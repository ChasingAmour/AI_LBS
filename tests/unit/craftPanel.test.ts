import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { craftRows } from '../../src/ui/craftPanel';

describe('craft panel rows', () => {
  it('uses Chinese names for equipment outputs', () => {
    const state = createNewGame(1);
    state.camp.level = 2;
    const rows = craftRows(state, true, () => {});
    const labels = rows.map((row) => row.label);
    for (const name of ['铁矛', '铜矛', '铜甲', '铁甲']) {
      expect(labels).toContain(name);
    }
    expect(labels).not.toContain('iron_spear');
    expect(labels).not.toContain('copper_spear');
    const ironArmor = rows.find((row) => row.label === '铁甲');
    expect(ironArmor?.sub).toContain('防御 11');
  });

  it('lists every recipe with its category header', () => {
    const state = createNewGame(1);
    const rows = craftRows(state, true, () => {});
    expect(rows.filter((row) => row.disabled && row.label.startsWith('—')).length).toBe(7);
    for (const row of rows.filter((row) => !row.label.startsWith('—'))) {
      expect(row.label).not.toMatch(/[a-z_]/i);
    }
  });
});
