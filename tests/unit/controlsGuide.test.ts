import { describe, it, expect } from 'vitest';
import { guidePages } from '../../src/data/controlsGuide';

describe('controls guide', () => {
  it('has two desktop pages with keyboard bindings', () => {
    const pages = guidePages(false);
    expect(pages).toHaveLength(2);
    const text = pages.map((page) => page.lines.join(' ')).join(' ');
    expect(text).toContain('W A S D');
    expect(text).toContain('E');
    expect(text).toContain('Esc');
  });

  it('has two touch pages with on-screen controls', () => {
    const pages = guidePages(true);
    expect(pages).toHaveLength(2);
    const text = pages.map((page) => page.lines.join(' ')).join(' ');
    expect(text).toContain('摇杆');
    expect(text).toContain('“E”');
    expect(text).toContain('“≡”');
  });
});
