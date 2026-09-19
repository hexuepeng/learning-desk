import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultDictationSettings, emptyProgress } from './dictation.ts';
import { summarizeProgress } from './progressView.ts';
import type { Word } from '../types/models.ts';

const words: Word[] = ['a', 'b', 'c'].map((en, index) => ({
  id: `w${index}`,
  en,
  zh: en,
  source: 'parent',
  createdAt: 't',
}));

describe('progressView', () => {
  it('counts known words and ladder buckets', () => {
    const summary = summarizeProgress(
      words,
      {
        w0: { ...emptyProgress('w0'), vocabKnown: true, dictationLevelIndex: 0 },
        w1: { ...emptyProgress('w1'), vocabKnown: false, dictationLevelIndex: 2 },
      },
      defaultDictationSettings(),
    );
    assert.equal(summary.total, 3);
    assert.equal(summary.known, 1);
    assert.equal(summary.unfamiliar, 2);
    assert.equal(summary.byType.find((item) => item.type === 'pick-word')?.count, 2);
    assert.equal(summary.byType.find((item) => item.type === 'arrange-letters')?.count, 1);
  });
});
