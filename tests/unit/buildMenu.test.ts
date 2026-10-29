import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { addItem } from '../../src/systems/inventorySystem';
import { buildRows } from '../../src/ui/buildMenu';

describe('build menu rows', () => {
  it('disables buildings when materials are missing', () => {
    const state = createNewGame(1);
    const rows = buildRows(state, () => undefined);
    const flag = rows.find((row) => row.label === '据点旗');
    expect(flag?.disabled).toBe(true);
    expect(flag?.detail).toContain('材料不足');
  });

  it('enables a building once it can be afforded and unlocked', () => {
    const state = createNewGame(1);
    state.camp.level = 1;
    addItem(state, 'wood', 10);
    addItem(state, 'stone', 8);
    const rows = buildRows(state, () => undefined);
    const fire = rows.find((row) => row.label === '营火');
    expect(fire?.disabled).toBe(false);
  });
});
