import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDailyLesson,
  dailyProgress,
  isDailyComplete,
  markDictationDone,
  markVocabDone,
  nextDailyStep,
} from './daily.ts';
import { applyDailyComplete, emptyStreak } from './streak.ts';

const words = ['a', 'b', 'c', 'd', 'e', 'f'].map((en, index) => ({
  id: `w${index}`,
  en,
  zh: en,
  source: 'parent' as const,
  createdAt: 't',
}));

describe('daily lesson', () => {
  it('splits half vocab and half dictation', () => {
    const daily = buildDailyLesson(words, {}, '2026-09-16', 6, () => 0.1);
    assert.equal(daily.vocabWordIds.length, 3);
    assert.equal(daily.dictationWordIds.length, 3);
    assert.equal(dailyProgress(daily).total, 6);
    assert.equal(isDailyComplete(daily), false);
  });

  it('reuses a single word for both halves', () => {
    const daily = buildDailyLesson(words.slice(0, 1), {}, '2026-09-16', 6, () => 0.2);
    assert.deepEqual(daily.vocabWordIds, ['w0']);
    assert.deepEqual(daily.dictationWordIds, ['w0']);
  });

  it('plays vocab first, then dictation, then done', () => {
    let daily = buildDailyLesson(words.slice(0, 2), {}, '2026-09-16', 2, () => 0);
    const first = nextDailyStep(daily);
    assert.equal(first.kind, 'vocab');
    if (first.kind !== 'vocab') throw new Error('expected vocab');
    daily = markVocabDone(daily, first.wordId);
    const second = nextDailyStep(daily);
    assert.equal(second.kind, 'dictation');
    if (second.kind !== 'dictation') throw new Error('expected dictation');
    daily = markDictationDone(daily, second.wordId);
    assert.equal(nextDailyStep(daily).kind, 'done');
    assert.equal(isDailyComplete(daily), true);
  });
});

describe('streak', () => {
  it('starts a new streak and continues the next day', () => {
    const first = applyDailyComplete(emptyStreak(), '2026-09-16');
    assert.equal(first.current, 1);
    assert.equal(first.stickers.length, 1);
    const second = applyDailyComplete(first, '2026-09-17');
    assert.equal(second.current, 2);
    const sameDay = applyDailyComplete(second, '2026-09-17');
    assert.equal(sameDay.current, 2);
    const broken = applyDailyComplete(second, '2026-09-19');
    assert.equal(broken.current, 1);
  });
});
