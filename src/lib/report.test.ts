import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildWeekReport, formatAccuracy, startOfWeek } from './report.ts';
import type { PracticeEvent, Word } from '../types/models.ts';

const words: Word[] = [
  { id: 'w1', en: 'cat', zh: '猫', source: 'parent', createdAt: 't' },
  { id: 'w2', en: 'dog', zh: '狗', source: 'parent', createdAt: 't' },
];

describe('week report', () => {
  it('uses Monday as the start of the week', () => {
    assert.equal(startOfWeek('2026-09-19'), '2026-09-14');
  });

  it('counts practiced days, accuracy and top wrong words', () => {
    const log: PracticeEvent[] = [
      { id: '1', date: '2026-09-14', kind: 'vocab', source: 'daily', wordId: 'w1', correct: true },
      { id: '2', date: '2026-09-15', kind: 'dictation', source: 'daily', wordId: 'w1', correct: false },
      { id: '3', date: '2026-09-15', kind: 'dictation', source: 'daily', wordId: 'w1', correct: false },
      { id: '4', date: '2026-09-16', kind: 'dictation', source: 'free', wordId: 'w2', correct: true },
      { id: '5', date: '2026-09-01', kind: 'dictation', source: 'daily', wordId: 'w1', correct: false },
    ];
    const report = buildWeekReport(log, words, '2026-09-19');
    assert.equal(report.daysPracticed, 3);
    assert.equal(report.dictationTotal, 3);
    assert.equal(report.dictationCorrect, 1);
    assert.equal(formatAccuracy(report.accuracy), '33%');
    assert.equal(report.topWrong[0].en, 'cat');
    assert.equal(report.topWrong[0].wrong, 2);
  });
});
