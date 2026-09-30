import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWordList } from './parseWordList.ts';
import {
  SAMPLE_KET_ENS,
  applyQuestAnswer,
  applyQuestRound,
  clampQuestNewCount,
  completeQuestDay,
  currentQuestMode,
  ensureQuestDay,
  emptyQuestState,
  hydrateQuestPacks,
  ketPackIdsInFileOrder,
  listenPickOptionParts,
  mergeKetPackIds,
  nextDueAfterStep,
  normalizeQuestState,
  packWordsOf,
  pendingQuestWordIds,
  planWordImportForQuest,
  pruneQuestWord,
  questAnswerKey,
  questDayCounts,
  questModeCleared,
  setWordInKetPack,
} from './quest.ts';
import type { QuestModeIndex, QuestNewCount, QuestState, Word } from '../types/models.ts';

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
  it('defaults to 5 and preserves the legacy 10 / 20 / 30 options', () => {
    assert.equal(emptyQuestState().dailyNewCount, 5);
    assert.equal(clampQuestNewCount(5), 5);
    assert.equal(clampQuestNewCount(10), 10);
    assert.equal(clampQuestNewCount(20), 20);
    assert.equal(clampQuestNewCount(30), 30);
    assert.equal(clampQuestNewCount(7), 10);
    assert.equal(clampQuestNewCount(99), 30);
    assert.equal(clampQuestNewCount('nope'), 5);
    assert.equal(normalizeQuestState({}).dailyNewCount, 5);
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

  it('keeps the new-word cursor when the next day is full of review words', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `w${i}`);
    const existing = new Set(ids);
    const day1 = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), existing, '2026-09-20');
    assert.equal(day1.day?.newIds.length, 10);
    assert.deepEqual(day1.day?.newIds, ids.slice(0, 10));
    const finished = completeQuestDay(day1);
    const day2 = ensureQuestDay(finished, existing, '2026-09-21');
    assert.deepEqual(day2.day?.newIds, []);
    assert.deepEqual(day2.day?.ids.slice(0, 10), ids.slice(0, 10));
    assert.equal(questDayCounts(day2.day).reviewCount, 10);
    assert.equal(questDayCounts(day2.day).newCount, 0);
    assert.equal(day2.cursor, 10);
    assert.equal(day2.items.w10, undefined);
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

  it('one pass of the planned stage 1 set clears the stage and advances', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const quest = ensureQuestDay(packQuest(ids, { dailyNewCount: 20 }), new Set(ids), '2026-09-20');
    assert.equal(quest.day?.ids.length, 10);
    assert.equal(currentQuestMode(quest.day), 0);
    const result = applyQuestRound(quest, 0, true);
    assert.equal(result.starGained, true);
    assert.equal(result.modeCleared, true);
    assert.equal(result.dayComplete, false);
    assert.deepEqual(result.quest.day?.stars, [3, 0, 0]);
    assert.equal(currentQuestMode(result.quest.day), 1);
    assert.equal(result.quest.day?.complete, false);
  });

  it('finishing stage 1 with mistakes still marks the stage done', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const quest = ensureQuestDay(packQuest(ids, { dailyNewCount: 20 }), new Set(ids), '2026-09-20');
    const result = applyQuestRound(quest, 0, false);
    assert.equal(result.modeCleared, true);
    assert.equal(result.starGained, true);
    assert.deepEqual(result.quest.day?.stars, [1, 0, 0]);
    assert.equal(questModeCleared(1), true);
    assert.equal(currentQuestMode(result.quest.day), 1);
  });

  it('one pass per stage completes the day and schedules review', () => {
    const ids = ['a'];
    let quest = ensureQuestDay(packQuest(ids), new Set(ids), '2026-09-20');
    const first = applyQuestRound(quest, 0, true);
    assert.equal(currentQuestMode(first.quest.day), 1);
    const second = applyQuestRound(first.quest, 1, true);
    assert.equal(currentQuestMode(second.quest.day), 2);
    const third = applyQuestRound(second.quest, 2, true);
    assert.equal(third.modeCleared, true);
    assert.equal(third.dayComplete, true);
    assert.equal(third.quest.day?.complete, true);
    assert.equal(third.quest.items.a?.step, 1);
    assert.equal(third.quest.items.a?.nextDue, '2026-09-21');
    assert.equal(currentQuestMode(third.quest.day), 'done');
  });

  it('same-day resume keeps finished stage 1 and continues at stage 2', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const existing = new Set(ids);
    const first = ensureQuestDay(packQuest(ids, { dailyNewCount: 20 }), existing, '2026-09-20');
    const afterStage1 = applyQuestRound(first, 0, true).quest;
    const resumed = ensureQuestDay(afterStage1, existing, '2026-09-20');
    assert.deepEqual(resumed.day?.ids, ids.slice(0, 10));
    assert.deepEqual(resumed.day?.stars, [3, 0, 0]);
    assert.equal(currentQuestMode(resumed.day), 1);
    assert.equal(resumed.day?.complete, false);
  });

  it('legacy mid-day one-star progress counts as stage 1 already done', () => {
    const ids = ['a', 'b'];
    const existing = new Set(ids);
    const first = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), existing, '2026-09-20');
    const legacy = {
      ...first,
      day: first.day ? { ...first.day, stars: [1, 0, 0] as const } : first.day,
    };
    const resumed = ensureQuestDay(legacy, existing, '2026-09-20');
    assert.equal(currentQuestMode(resumed.day), 1);
  });

  it('stage 2 and 3 still need their own pass and do not skip ahead', () => {
    const ids = ['a'];
    const quest = ensureQuestDay(packQuest(ids), new Set(ids), '2026-09-20');
    const after1 = applyQuestRound(quest, 0, true);
    assert.equal(currentQuestMode(after1.quest.day), 1);
    const after2 = applyQuestRound(after1.quest, 1, false);
    assert.equal(after2.modeCleared, true);
    assert.equal(after2.dayComplete, false);
    assert.deepEqual(after2.quest.day?.stars, [3, 1, 0]);
    assert.equal(currentQuestMode(after2.quest.day), 2);
  });
});

describe('quest daily limit and resumable answers', () => {
  const today = '2026-09-30';
  const timestamp = '2026-09-30T09:00:00.000Z';

  for (const [dueCount, dailyNewCount, availableNew, reviews, fresh] of [
    [0, 5, 100, 0, 5],
    [7, 5, 100, 7, 3],
    [12, 20, 100, 10, 0],
    [0, 30, 100, 0, 10],
    [2, 5, 1, 2, 1],
    [0, 5, 0, 0, 0],
  ]) {
    it(`plans ${reviews} reviews and ${fresh} new words for ${dueCount} due / ${dailyNewCount} max / ${availableNew} new`, () => {
      const oldIds = Array.from({ length: dueCount }, (_, i) => `old${i}`);
      const newIds = Array.from({ length: availableNew }, (_, i) => `new${i}`);
      const ids = [...oldIds, ...newIds];
      const items = Object.fromEntries(oldIds.map((id) => [
        id, { learnedOn: '2026-09-20', step: 1, nextDue: '2026-09-21' },
      ]));
      const next = ensureQuestDay(packQuest(ids, {
        items, dailyNewCount: dailyNewCount as QuestNewCount,
      }), new Set(ids), today);
      assert.deepEqual(questDayCounts(next.day), { reviewCount: reviews, newCount: fresh, total: reviews + fresh });
      assert.deepEqual(next.day?.newIds, newIds.slice(0, fresh));
      assert.equal(next.cursor, dueCount + fresh);
      for (const id of oldIds.slice(reviews)) assert.deepEqual(next.items[id], items[id]);
      for (const id of newIds.slice(fresh)) assert.equal(next.items[id], undefined);
    });
  }

  it('selects the oldest ten due words with stable pack-order ties', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `w${i}`);
    const items = Object.fromEntries(ids.map((id, i) => [
      id, { learnedOn: '2026-09-01', step: 1, nextDue: i >= 90 ? '2026-09-10' : '2026-09-20' },
    ]));
    const next = ensureQuestDay(packQuest(ids, { items }), new Set(ids), today);
    assert.deepEqual(next.day?.ids, ids.slice(90));
    assert.deepEqual(next.items.w0, items.w0);
  });

  it('keeps a legacy 50-word day and one-star stage when upgrading, then caps the next day', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `w${i}`);
    const legacy = normalizeQuestState({
      ...packQuest(ids, { dailyNewCount: 20 }),
      day: { date: today, ids, newIds: ids, stars: [1, 0, 0], complete: false },
    });
    const resumed = ensureQuestDay(legacy, new Set(ids), today);
    assert.deepEqual(resumed.day?.ids, ids);
    assert.deepEqual(resumed.day?.answers, {});
    assert.equal(currentQuestMode(resumed.day), 1);
    assert.deepEqual(pendingQuestWordIds(resumed.day, 0), []);
    assert.equal(ensureQuestDay(resumed, new Set(ids), '2026-10-01').day?.ids.length, 10);
  });

  it('resumes from the fifth unsubmitted word after a serialize/reload and keeps the first answer', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `w${i}`);
    let quest = ensureQuestDay(packQuest(ids, { dailyNewCount: 10 }), new Set(ids), today);
    for (const wordId of ids.slice(0, 4)) {
      quest = applyQuestAnswer(quest, {
        profileId: 'child', date: today, mode: 0, wordId, outcome: 'incorrect',
      }, today, timestamp).quest;
    }
    const resumed = normalizeQuestState(JSON.parse(JSON.stringify(quest)));
    assert.deepEqual(pendingQuestWordIds(resumed.day, 0), ids.slice(4));
    const duplicate = applyQuestAnswer(resumed, {
      profileId: 'child', date: today, mode: 0, wordId: ids[0], outcome: 'correct',
    }, today, 'later');
    assert.equal(duplicate.accepted, false);
    assert.equal(duplicate.quest, resumed);
    assert.deepEqual(resumed.day?.answers?.[questAnswerKey(0, ids[0])], { outcome: 'incorrect', submittedAt: timestamp });
  });

  it('commits the final answer, stage stars and daily review step together only once', () => {
    let quest = ensureQuestDay(packQuest(['a']), new Set(['a']), today);
    for (const mode of [0, 1, 2] as QuestModeIndex[]) {
      const result = applyQuestAnswer(quest, {
        profileId: 'child', date: today, mode, wordId: 'a',
        outcome: mode === 2 ? 'self-reported' : mode === 0 ? 'incorrect' : 'correct',
      }, today, timestamp);
      quest = result.quest;
      assert.equal(result.accepted, true);
      assert.equal(result.dayComplete, mode === 2);
    }
    assert.deepEqual(quest.day?.stars, [1, 3, 3]);
    assert.equal(quest.day?.answers?.['2:a'].outcome, 'self-reported');
    assert.equal(quest.items.a.step, 1);
    assert.equal(quest.items.a.nextDue, '2026-10-01');
    const repeat = applyQuestAnswer(quest, {
      profileId: 'child', date: today, mode: 2, wordId: 'a', outcome: 'self-reported',
    }, today, timestamp);
    assert.equal(repeat.accepted, false);
    assert.equal(repeat.quest, quest);
  });

  it('rejects yesterday, another stage, a deleted word and self-report in a choice stage', () => {
    const quest = ensureQuestDay(packQuest(['a']), new Set(['a']), today);
    const input = { profileId: 'child', date: today, mode: 0 as const, wordId: 'a', outcome: 'correct' as const };
    for (const invalid of [
      { ...input, date: '2026-09-29' },
      { ...input, mode: 1 as const },
      { ...input, wordId: 'deleted' },
      { ...input, outcome: 'self-reported' as const },
    ]) {
      assert.equal(applyQuestAnswer(quest, invalid, today, timestamp).quest, quest);
    }
    assert.equal(applyQuestAnswer(quest, input, '2026-10-01', timestamp).quest, quest);
    assert.deepEqual(quest.day?.answers, {});
  });

  it('removes deleted answers and leaves an empty task without granting completion', () => {
    let quest = ensureQuestDay(packQuest(['a', 'b']), new Set(['a', 'b']), today);
    quest = applyQuestAnswer(quest, {
      profileId: 'child', date: today, mode: 0, wordId: 'a', outcome: 'correct',
    }, today, timestamp).quest;
    const oneLeft = pruneQuestWord(quest, 'a');
    assert.deepEqual(oneLeft.day?.answers, {});
    assert.deepEqual(pendingQuestWordIds(oneLeft.day, 0), ['b']);
    const empty = pruneQuestWord(oneLeft, 'b');
    assert.equal(empty.day?.complete, false);
    assert.deepEqual(empty.day?.stars, [0, 0, 0]);
    assert.equal(applyQuestRound(empty, 0, true).quest, empty);
    assert.equal(completeQuestDay(empty), empty);
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

  it('keeps KET pack ids in file order when mixing existing and new words', () => {
    const parsed = parseWordList(['barbecue,烤肉', 'apple,苹果', 'chips,薯条'].join('\n'));
    const existing = [word('old-apple', 'apple')];
    const incoming = new Map([['barbecue', 'new-bbq'], ['chips', 'new-chips']]);
    assert.deepEqual(ketPackIdsInFileOrder(parsed, existing, incoming), [
      'new-bbq',
      'old-apple',
      'new-chips',
    ]);
  });

  it('keeps the sample demo list small and family-only', () => {
    assert.equal(SAMPLE_KET_ENS.length, 6);
    assert.ok(SAMPLE_KET_ENS.includes('apple'));
  });

  it('shows Chinese gloss on every listen-pick option, not only the answer', () => {
    assert.deepEqual(listenPickOptionParts(' apple ', ' 苹果 '), {
      label: 'apple',
      subtitle: '苹果',
    });
    assert.deepEqual(listenPickOptionParts('book', ''), { label: 'book' });
  });
});
