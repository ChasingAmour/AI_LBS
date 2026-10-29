import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../../src/data/weapons';
import { applyHitToSavage, autoAimAngle, computeHitTargets, tickSavageStun } from '../../src/systems/combatSystem';
import type { SavageState } from '../../src/entities/savage';

function makeSavage(): SavageState {
  return {
    id: 's',
    x: 0,
    y: 0,
    hp: 60,
    stun: 0,
    stunnedUntil: null,
    lastHitAgo: 0,
    mode: 'attack',
  };
}

describe('combat system', () => {
  it('arc hits targets inside angle but not behind', () => {
    const pattern = WEAPONS.club.pattern;
    const targets = [
      { id: 'front', x: 20, y: 0 },
      { id: 'back', x: -20, y: 0 },
    ];
    expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, pattern, targets)).toEqual(['front']);
  });

  it('arc respects its range', () => {
    const targets = [
      { id: 'near', x: 30, y: 0 },
      { id: 'far', x: 60, y: 0 },
    ];
    expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, WEAPONS.club.pattern, targets)).toEqual([
      'near',
    ]);
  });

  it('thrust hits multiple targets in a line', () => {
    const targets = [
      { id: 'a', x: 20, y: 0 },
      { id: 'b', x: 40, y: 0 },
      { id: 'c', x: 20, y: 40 },
    ];
    expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, WEAPONS.spear.pattern, targets)).toEqual([
      'a',
      'b',
    ]);
  });

  it('combo uses the arc shape for each swing', () => {
    const targets = [{ id: 'front', x: 18, y: 0 }];
    expect(computeHitTargets({ x: 0, y: 0, angle: 0 }, WEAPONS.fist.pattern, targets)).toEqual([
      'front',
    ]);
  });

  it('club stuns before it kills, spear kills before stun', () => {
    const a = makeSavage();
    for (let i = 0; i < 5; i++) applyHitToSavage(a, WEAPONS.club, 1);
    expect(a.hp).toBe(20);
    expect(a.stunnedUntil).not.toBeNull();
    expect(a.mode).toBe('stunned');

    const b = makeSavage();
    for (let i = 0; i < 5; i++) applyHitToSavage(b, WEAPONS.spear, 1);
    expect(b.hp).toBeLessThanOrEqual(0);
    expect(b.mode).toBe('dead');
  });

  it('stun wears off after eight seconds', () => {
    const a = makeSavage();
    a.stun = 100;
    a.stunnedUntil = 8;
    a.mode = 'stunned';
    tickSavageStun(a, 7.9);
    expect(a.mode).toBe('stunned');
    tickSavageStun(a, 0.2);
    expect(a.stunnedUntil).toBeNull();
    expect(a.stun).toBe(0);
    expect(a.mode).toBe('attack');
  });

  it('stun meter decays ten per second after five seconds out of combat', () => {
    const a = makeSavage();
    a.stun = 60;
    tickSavageStun(a, 4);
    expect(a.stun).toBe(60);
    tickSavageStun(a, 2);
    expect(a.stun).toBeCloseTo(50);
  });
});

describe('auto aim', () => {
  const player = { x: 0, y: 0 };

  it('aims at the nearest target in range', () => {
    const angle = autoAimAngle(
      player,
      [
        { x: 70, y: 0 },
        { x: 20, y: 20 },
      ],
      'right',
      96,
    );
    expect(angle).toBeCloseTo(Math.PI / 4);
  });

  it('falls back to the facing direction without targets', () => {
    expect(autoAimAngle(player, [], 'up', 96)).toBeCloseTo(-Math.PI / 2);
    expect(autoAimAngle(player, [], 'down', 96)).toBeCloseTo(Math.PI / 2);
    expect(autoAimAngle(player, [], 'left', 96)).toBeCloseTo(Math.PI);
    expect(autoAimAngle(player, [], 'right', 96)).toBe(0);
  });

  it('ignores targets outside range', () => {
    expect(autoAimAngle(player, [{ x: 300, y: 0 }], 'down', 96)).toBeCloseTo(Math.PI / 2);
  });
});
