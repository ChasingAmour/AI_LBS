import { describe, expect, it } from 'vitest';
import { shouldCancelChannel } from '../../src/systems/interactionSystem';

describe('采集引导与面板', () => {
  it('背包不打断采集', () => {
    expect(shouldCancelChannel('inventory')).toBe(false);
  });

  it('其它面板打断采集', () => {
    for (const panel of ['build', 'craft', 'labor', 'map', 'adventure', 'pause'] as const) {
      expect(shouldCancelChannel(panel)).toBe(true);
    }
  });

  it('没有面板时不打断', () => {
    expect(shouldCancelChannel(null)).toBe(false);
  });
});
