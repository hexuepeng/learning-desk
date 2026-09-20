import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWordList } from './parseWordList.ts';
import {
  SAMPLE_KET_ENS,
  applyQuestRound,
  clampQuestNewCount,
  completeQuestDay,
  currentQuestMode,
  ensureQuestDay,
  emptyQuestState,
  hydrateQuestPacks,
  mergeKetPackIds,
  nextDueAfterStep,
  packWordsOf,
  planWordImportForQuest,
  pruneQuestWord,
  questDayCounts,
  setWordInKetPack,
} from './quest.ts';
import type { QuestState, Word } from '../types/models.ts';

function word(id: string, en: string, ketPack = true): Word {
  return {
    id,
    en,
    zh: en,
    source: 'parent',
    createdAt: 't',
    ketPack,
  };
}

function packQuest(ids: string[], extra?: Partial<QuestState>): QuestState {
  return {
    ...emptyQuestState(),
    packWordIds: ids,
    ...extra,
  };
}

describe('quest SRS', () => {
  it('clamps daily new count to 10 / 20 / 30', () => {
    assert.equal(clampQuestNewCount(10), 10);
    assert.equal(clampQuestNewCount(20), 20);
    assert.equal(clampQuestNewCount(30), 30);
    assert.equal(clampQuestNewCount(7), 10);
    assert.equal(clampQuestNewCount(99), 30);
    assert.equal(clampQuestNewCount('nope'), 20);
  });

  it('schedules nextDue at 1 / 2 / 4 / 7 days after first learn', () => {
    assert.equal(nextDueAfterStep('2026-09-20', 0), '2026-09-20');
    assert.equal(nextDueAfterStep('2026-09-20', 1), '2026-09-21');
    assert.equal(nextDueAfterStep('2026-09-20', 2), '2026-09-22');
    assert.equal(nextDueAfterStep('2026-09-20', 3), '2026-09-24');
    assert.equal(nextDueAfterStep('2026-09-20', 4), '2026-09-27');
    assert.equal(nextDueAfterStep('2026-09-20', 5), null);
  });

  it('first day takes N new words in pack order and leaves the rest', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const next = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), new Set(ids), '2026-09-20');
    assert.deepEqual(next.day?.newIds, ids);
    assert.deepEqual(next.day?.ids, ids);
    assert.equal(next.day?.complete, false);
    assert.equal(next.cursor, 5);
    assert.equal(next.items.a?.learnedOn, '2026-09-20');
    assert.equal(next.items.a?.nextDue, '2026-09-20');
    assert.equal(next.items.a?.step, 0);
  });

  it('respects daily new count and continues the cursor the next day', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `w${i}`);
    const existing = new Set(ids);
    const day1 = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), existing, '2026-09-20');
    assert.equal(day1.day?.newIds.length, 10);
    assert.deepEqual(day1.day?.newIds, ids.slice(0, 10));
    const finished = completeQuestDay(day1);
    const day2 = ensureQuestDay(finished, existing, '2026-09-21');
    assert.deepEqual(day2.day?.newIds, ids.slice(10, 20));
    assert.deepEqual(day2.day?.ids.slice(0, 10), ids.slice(0, 10));
    assert.equal(questDayCounts(day2.day).reviewCount, 10);
    assert.equal(questDayCounts(day2.day).newCount, 10);
  });

  it('keeps unfinished due words and does not re-issue them as new', () => {
    const ids = ['a', 'b', 'c'];
    const existing = new Set(ids);
    const day1 = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), existing, '2026-09-20');
    assert.equal(day1.day?.complete, false);
    const day2 = ensureQuestDay(day1, existing, '2026-09-21');
    assert.deepEqual(day2.day?.ids, ['a', 'b', 'c']);
    assert.deepEqual(day2.day?.newIds, []);
    assert.equal(day2.items.a?.step, 0);
    assert.equal(day2.items.a?.nextDue, '2026-09-20');
  });

  it('does not rebuild today’s card once created', () => {
    const ids = ['a', 'b', 'c'];
    const first = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), new Set(ids), '2026-09-20');
    const again = ensureQuestDay(
      { ...first, dailyNewCount: 10, packWordIds: [...ids, 'd'] },
      new Set([...ids, 'd']),
      '2026-09-20',
    );
    assert.deepEqual(again.day?.ids, ['a', 'b', 'c']);
    assert.equal(again.items.d, undefined);
  });

  it('advances review steps on complete and drops the word after day 7', () => {
    const ids = ['a'];
    const existing = new Set(ids);
    let quest = ensureQuestDay(packQuest(ids), existing, '2026-09-20');
    const dates = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-24', '2026-09-27'];
    const expectedDue = ['2026-09-21', '2026-09-22', '2026-09-24', '2026-09-27', null];
    for (let i = 0; i < dates.length; i += 1) {
      quest = ensureQuestDay(quest, existing, dates[i]);
      assert.deepEqual(quest.day?.ids, ['a']);
      quest = completeQuestDay(quest);
      assert.equal(quest.items.a?.step, i + 1);
      assert.equal(quest.items.a?.nextDue, expectedDue[i]);
    }
    const after = ensureQuestDay(quest, existing, '2026-09-28');
    assert.deepEqual(after.day?.ids, []);
    assert.equal(after.items.a?.nextDue, null);
  });

  it('three perfect rounds on the last mode complete the day and schedule review', () => {
    const ids = ['a'];
    let quest = ensureQuestDay(packQuest(ids), new Set(ids), '2026-09-20');
    quest = {
      ...quest,
      day: quest.day ? { ...quest.day, stars: [3, 3, 2] } : quest.day,
    };
    const result = applyQuestRound(quest, 2, true);
    assert.equal(result.starGained, true);
    assert.equal(result.modeCleared, true);
    assert.equal(result.dayComplete, true);
    assert.equal(result.quest.day?.complete, true);
    assert.equal(result.quest.items.a?.step, 1);
    assert.equal(result.quest.items.a?.nextDue, '2026-09-21');
    assert.equal(currentQuestMode(result.quest.day), 'done');
  });

  it('a wrong round does not award a star', () => {
    const ids = ['a'];
    const quest = ensureQuestDay(packQuest(ids), new Set(ids), '2026-09-20');
    const result = applyQuestRound(quest, 0, false);
    assert.equal(result.starGained, false);
    assert.deepEqual(result.quest.day?.stars, [0, 0, 0]);
    assert.equal(currentQuestMode(result.quest.day), 0);
  });
});

describe('quest import pack', () => {
  it('appends new words and can mark existing ones for the quest pack', () => {
    const existing = [word('w1', 'apple'), word('w2', 'desk', false)];
    const parsed = parseWordList(['apple,苹果', 'book,书,/bʊk/', 'desk,书桌'].join('\n'));
    const plan = planWordImportForQuest(parsed, existing);
    assert.equal(plan.skipped, 2);
    assert.deepEqual(
      plan.newItems.map((item) => item.en),
      ['book'],
    );
    assert.deepEqual(plan.existingIds, ['w1', 'w2']);
    const pack = mergeKetPackIds(['w1'], [...plan.existingIds, 'w3']);
    assert.deepEqual(pack, ['w1', 'w2', 'w3']);
  });

  it('skips in-batch duplicates like the word list parser', () => {
    const parsed = parseWordList('cat,猫\ncat,猫咪\ndog,狗');
    const plan = planWordImportForQuest(parsed, []);
    assert.deepEqual(
      plan.newItems.map((item) => item.en),
      ['cat', 'dog'],
    );
    assert.equal(plan.skipped, 0);
  });

  it('keeps pack order for lookup and can toggle / prune a word', () => {
    const words = [word('c', 'cat'), word('a', 'apple'), word('b', 'book')];
    assert.deepEqual(
      packWordsOf(words, ['a', 'b', 'missing']).map((item) => item.en),
      ['apple', 'book'],
    );
    const on = setWordInKetPack(emptyQuestState(), 'a', true);
    assert.deepEqual(on.packWordIds, ['a']);
    const off = setWordInKetPack(on, 'a', false);
    assert.deepEqual(off.packWordIds, []);
    const pruned = pruneQuestWord(
      { ...on, items: { a: { learnedOn: '2026-09-20', step: 0, nextDue: '2026-09-20' } } },
      'a',
    );
    assert.equal(pruned.items.a, undefined);
    assert.deepEqual(pruned.packWordIds, []);
  });

  it('hydrates an empty pack from ketPack tags', () => {
    const words = [word('a', 'apple', true), word('b', 'desk', false)];
    const next = hydrateQuestPacks({}, words, () => 'profile_child');
    assert.deepEqual(next.profile_child.packWordIds, ['a']);
  });

  it('keeps the sample demo list small and family-only', () => {
    assert.equal(SAMPLE_KET_ENS.length, 6);
    assert.ok(SAMPLE_KET_ENS.includes('apple'));
  });
});
