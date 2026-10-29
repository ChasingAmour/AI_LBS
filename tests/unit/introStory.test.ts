import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../src/core/gameState';
import {
  INTRO_STORY,
  markIntroSeen,
  shouldPlayIntro,
} from '../../src/data/introStory';

describe('intro story', () => {
  it('has five non-empty cards ending on the first day', () => {
    expect(INTRO_STORY).toHaveLength(5);
    for (const card of INTRO_STORY) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.body.length).toBeGreaterThan(20);
    }
    expect(`${INTRO_STORY[4].title}${INTRO_STORY[4].body}`).toContain('第一天');
  });

  it('plays once for a new game', () => {
    const state = createNewGame(1);
    expect(shouldPlayIntro(state, 'none')).toBe(true);
    markIntroSeen(state);
    expect(state.flags.introSeen).toBe(true);
    expect(shouldPlayIntro(state, 'none')).toBe(false);
  });

  it('never forces an existing save into the intro', () => {
    const state = createNewGame(1);
    expect(shouldPlayIntro(state, 'main')).toBe(false);
    expect(shouldPlayIntro(state, 'backup')).toBe(false);
  });
});
