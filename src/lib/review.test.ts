import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCountdown, pickReviewWords } from './review.ts';

const words = ['apple', 'book', 'cat'].map((en, index) => ({
  id: `w${index}`,
  en,
  zh: en,
  source: 'parent' as const,
  createdAt: 't',
}));

describe('review', () => {
  it('picks words that were missed recently', () => {
    const picked = pickReviewWords(
      words,
      {
        w0: {
          wordId: 'w0',
          vocabSeen: 1,
          vocabKnown: false,
          dictationLevelIndex: 0,
          consecutiveCorrect: 0,
          consecutiveWrong: 2,
        },
      },
      [{ id: 'e', date: '2026-09-19', kind: 'dictation', source: 'daily', wordId: 'w2', correct: false }],
      8,
    );
    assert.deepEqual(
      picked.map((word) => word.id),
      ['w0', 'w2'],
    );
  });

  it('formats a five-minute countdown', () => {
    assert.equal(formatCountdown(300), '5:00');
    assert.equal(formatCountdown(59), '0:59');
  });
});
