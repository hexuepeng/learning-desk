import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySessionStars,
  consecutiveThreeStarDays,
  emptyStarState,
  starsForSession,
  starsLabel,
  shouldShowThreeStarCelebration,
} from './stars.ts';

describe('starsForSession', () => {
  it('gives 3 stars when every answer is correct', () => {
    assert.equal(starsForSession(4, 0), 3);
  });

  it('gives 2 stars for one or two mistakes', () => {
    assert.equal(starsForSession(4, 1), 2);
    assert.equal(starsForSession(3, 2), 2);
  });

  it('gives 1 star otherwise', () => {
    assert.equal(starsForSession(1, 3), 1);
    assert.equal(starsForSession(0, 0), 1);
  });
});

describe('applySessionStars', () => {
  it('keeps the better rating if the same day is rated twice', () => {
    const first = applySessionStars(emptyStarState(), '2026-09-16', 2);
    const second = applySessionStars(first.next, '2026-09-16', 3);
    assert.equal(second.next.byDate['2026-09-16'], 3);
  });

  it('counts consecutive 3-star days and celebrates on the third', () => {
    let state = emptyStarState();
    let celebrate = false;
    for (const date of ['2026-09-16', '2026-09-17', '2026-09-18']) {
      const result = applySessionStars(state, date, 3);
      state = result.next;
      celebrate = result.celebrate;
    }
    assert.equal(state.byDate['2026-09-18'], 3);
    assert.equal(consecutiveThreeStarDays(state.byDate, '2026-09-18'), 3);
    assert.equal(celebrate, true);
    assert.equal(shouldShowThreeStarCelebration(state, '2026-09-18'), true);
    const again = applySessionStars(state, '2026-09-18', 3);
    assert.equal(again.celebrate, false);
  });

  it('breaks the run after a 1-star day', () => {
    const two = applySessionStars(
      applySessionStars(emptyStarState(), '2026-09-16', 3).next,
      '2026-09-17',
      3,
    ).next;
    const broken = applySessionStars(two, '2026-09-18', 1);
    assert.equal(broken.next.byDate['2026-09-18'], 1);
    assert.equal(broken.celebrate, false);
  });

  it('formats a compact star label', () => {
    assert.equal(starsLabel(3), '★★★');
    assert.equal(starsLabel(1), '★☆☆');
  });
});
