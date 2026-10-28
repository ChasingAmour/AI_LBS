import { describe, it, expect } from 'vitest';
import { walkFrame } from '../../src/entities/playerFrames';

describe('player walk animation', () => {
  it('returns idle when standing still', () => {
    expect(walkFrame(0, false)).toBe('player-idle');
    expect(walkFrame(9999, false)).toBe('player-idle');
  });

  it('cycles two frames at 8 fps', () => {
    expect(walkFrame(0, true)).toBe('player-walk-a');
    expect(walkFrame(124, true)).toBe('player-walk-a');
    expect(walkFrame(125, true)).toBe('player-walk-b');
    expect(walkFrame(250, true)).toBe('player-walk-a');
  });
});
