import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import { EventBus } from '../../src/core/eventBus';

describe('game state', () => {
  it('new game starts on Monday day 1 at 06:00 on the beach', () => {
    const s = createNewGame(123);
    expect(s.time).toEqual({ day: 1, clockMin: 360, phase: 'day' });
    expect(s.camp.level).toBe(0);
    expect(s.inventory).toHaveLength(0);
    expect(s.player.hp).toBe(100);
    expect(s.rngState).toBe(123);
    expect(s.scene).toBe('island');
    expect(s.dungeonFloor).toBeNull();
    expect(s.raid).toBeNull();
    expect(s.world.groundLoot).toEqual([]);
    expect(s.equipment).toEqual({ weapon: null, armor: null, boots: null });
    expect(s.hotbar).toHaveLength(8);
  });
});

describe('event bus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.on('time:dayChanged', (p: number) => seen.push(p));
    bus.emit('time:dayChanged', 2);
    expect(seen).toEqual([2]);
  });
});
