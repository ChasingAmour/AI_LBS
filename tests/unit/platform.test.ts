import { describe, it, expect } from 'vitest';
import { prefersTouchLayout, shouldPauseForPortrait } from '../../src/core/platform';

describe('platform layout decisions', () => {
  it('uses the touch layout on phones and small tablets only', () => {
    expect(prefersTouchLayout({ touch: true, width: 844, height: 390 })).toBe(true);
    expect(prefersTouchLayout({ touch: true, width: 1024, height: 768 })).toBe(true);
    expect(prefersTouchLayout({ touch: true, width: 1920, height: 1080 })).toBe(false);
    expect(prefersTouchLayout({ touch: false, width: 844, height: 390 })).toBe(false);
  });

  it('pauses portraits only on touch devices', () => {
    expect(shouldPauseForPortrait({ touch: true, width: 390, height: 844 })).toBe(true);
    expect(shouldPauseForPortrait({ touch: true, width: 844, height: 390 })).toBe(false);
    expect(shouldPauseForPortrait({ touch: false, width: 390, height: 844 })).toBe(false);
  });
});
