import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { EventBus } from '../../src/core/eventBus';
import { addItem } from '../../src/systems/inventorySystem';
import { currentGoal, refreshTutorial } from '../../src/systems/tutorialSystem';

describe('tutorial goals', () => {
  it('starts at the camp flag goal', () => {
    const s = createNewGame(1);
    expect(currentGoal(s)?.id).toBe('flag');
  });

  it('advances through flag, chest, stick, campfire, workbench and cage', () => {
    const s = createNewGame(1);
    const bus = new EventBus();
    const events: string[] = [];
    bus.on('tutorial:advanced', (payload) => events.push(payload.goal));

    s.buildings.push({ id: 'b_flag', type: 'flag', x: 48, y: 48, hp: 999 });
    expect(refreshTutorial(s, bus)).toBe(1);

    s.world.uniqueLoot.push('chest_wreck');
    expect(refreshTutorial(s, bus)).toBe(2);

    addItem(s, 'stick', 1);
    expect(refreshTutorial(s, bus)).toBe(3);

    s.buildings.push({ id: 'a', type: 'campfire', x: 0, y: 0, hp: 100 });
    s.buildings.push({ id: 'b', type: 'workbench', x: 1, y: 0, hp: 80 });
    s.buildings.push({ id: 'c', type: 'cage', x: 2, y: 0, hp: 120 });
    expect(refreshTutorial(s, bus)).toBe(6);

    expect(events).toEqual(['flag', 'chest', 'stick', 'campfire', 'workbench', 'cage']);
  });

  it('completes the friday goal after the first raid', () => {
    const s = createNewGame(1);
    s.flags.tutorialStep = 6;
    expect(currentGoal(s)?.id).toBe('friday');
    s.flags.firstRaidDone = true;
    expect(refreshTutorial(s)).toBe(7);
    expect(currentGoal(s)).toBeNull();
  });
});
