import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DAILY_SIZE,
  assignDailyHalves,
  buildDailyLesson,
  dailyProgress,
  dictationPriority,
  ensureTodayLesson,
  formatDailyProgress,
  isDailyComplete,
  markDictationDone,
  markVocabDone,
  nextDailyStep,
  pickDailyWords,
} from './daily.ts';
import { applyDailyComplete, emptyStreak } from './streak.ts';

function makeWords(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `w${index}`,
    en: `w${index}`,
    zh: `w${index}`,
    source: 'parent' as const,
    createdAt: 't',
  }));
}

const words = makeWords(6);

function poolSize(daily: { vocabWordIds: string[]; dictationWordIds: string[] }) {
  return new Set([...daily.vocabWordIds, ...daily.dictationWordIds]).size;
}

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

  it('reports vocab and dictation progress separately', () => {
    let daily = buildDailyLesson(words, {}, '2026-09-16', 6, () => 0.1);
    assert.equal(formatDailyProgress(daily), '背词 0/3 · 默写 0/3');
    daily = markVocabDone(daily, daily.vocabWordIds[0]);
    assert.equal(formatDailyProgress(daily), '背词 1/3 · 默写 0/3');
    assert.equal(dailyProgress(daily).done, 1);
  });

  it('puts recently missed words into the dictation half', () => {
    const progress = {
      w0: {
        wordId: 'w0',
        vocabSeen: 3,
        vocabKnown: true,
        dictationLevelIndex: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 2,
      },
      w1: {
        wordId: 'w1',
        vocabSeen: 3,
        vocabKnown: true,
        dictationLevelIndex: 0,
        consecutiveCorrect: 2,
        consecutiveWrong: 0,
      },
    };
    const halves = assignDailyHalves(words.slice(0, 2), progress);
    assert.deepEqual(
      halves.dictation.map((word) => word.id),
      ['w0'],
    );
    assert.deepEqual(
      halves.vocab.map((word) => word.id),
      ['w1'],
    );
    assert.ok(dictationPriority(progress.w0) > dictationPriority(progress.w1));
  });

  it('defaults to ten words split five and five', () => {
    assert.equal(DAILY_SIZE, 10);
    const daily = buildDailyLesson(makeWords(12), {}, '2026-09-16', undefined, () => 0.1);
    assert.equal(daily.vocabWordIds.length, 5);
    assert.equal(daily.dictationWordIds.length, 5);
    assert.equal(dailyProgress(daily).total, 10);
  });

  it('rebuilds a same-day card when the pool is smaller than the daily size', () => {
    const many = makeWords(12);
    const small = buildDailyLesson(many, {}, '2026-09-16', 6, () => 0.1);
    assert.equal(poolSize(small), 6);
    const next = ensureTodayLesson(small, many, {}, '2026-09-16', () => 0.1);
    assert.equal(poolSize(next), 10);
    assert.equal(next.vocabWordIds.length, 5);
    assert.equal(next.dictationWordIds.length, 5);
  });

  it('keeps a same-day card that already meets the daily size', () => {
    const many = makeWords(12);
    const full = buildDailyLesson(many, {}, '2026-09-16', 10, () => 0.1);
    const next = ensureTodayLesson(full, many, {}, '2026-09-16', () => 0.9);
    assert.deepEqual(next, full);
  });

  it('prefers missed words when picking the daily pool', () => {
    const progress = {
      w5: {
        wordId: 'w5',
        vocabSeen: 8,
        vocabKnown: false,
        dictationLevelIndex: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 3,
      },
    };
    const picked = pickDailyWords(words, progress, 2, () => 0);
    assert.ok(picked.some((word) => word.id === 'w5'));
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
