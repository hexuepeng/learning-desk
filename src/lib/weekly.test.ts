import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8 } from 'fflate';

import { PROOFREAD_STARTER, glossSuggestions } from '../content/proofreadStarterPack.ts';
import { createBackupArchive, parseBackupArchive } from './backupArchive.ts';
import { parseBackup, serializeBackup } from './backup.ts';
import { isDailyComplete } from './daily.ts';
import { parseWordList } from './parseWordList.ts';
import { DEFAULT_PROFILE_ID } from './profile.ts';
import { emptyQuestState } from './quest.ts';
import { decodeStoredState, hydrateState } from './storage.ts';
import { applyDefaultKetPack, applyWordListImport, DEFAULT_KET_PACK_SIZE } from './wordImport.ts';
import {
  acceptDailyClaim,
  addWordToContentGroups,
  applyGlossCorrections,
  attributeLegacyDaily,
  commitWeeklySelection,
  createContentGroup,
  detachWord,
  importProofreadPack,
  previewGlossCorrections,
  removeContentGroup,
  resolveActiveLearningDay,
  rollWeeklyPlan,
} from './weekly.ts';
import { DEFAULT_KET_PACK_TEXT } from '../content/ket-a2-default-bundle.ts';
import type { DailyLesson, PersistedState, Profile, Word, WordProgress } from '../types/models.ts';

const DATE = '2026-10-06';

function ids(prefix = 'id') {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

function profile(id: string, name = id): Profile {
  return { id, name, createdAt: 't', archived: false };
}

function word(id: string, en: string, profileId: string, extra: Partial<Word> = {}): Word {
  return {
    id,
    en,
    zh: en,
    source: 'parent',
    createdAt: 't',
    profileId,
    ...extra,
  };
}

function progress(wordId: string, extra: Partial<WordProgress> = {}): WordProgress {
  return {
    wordId,
    vocabSeen: 2,
    vocabKnown: true,
    dictationLevelIndex: 1,
    consecutiveCorrect: 1,
    consecutiveWrong: 0,
    ...extra,
  };
}

function desk(words: Word[], profiles: Profile[], activeProfileId: string, extra: Partial<PersistedState> = {}): PersistedState {
  return hydrateState({
    version: 1,
    words,
    profiles,
    activeProfileId,
    parentPin: '1234',
    progress: extra.progress,
    questByProfile: Object.fromEntries(profiles.map((item) => [item.id, emptyQuestState()])),
    ...extra,
  });
}

describe('0.1.31 weekly selection', () => {
  it('AC-SP31-01 draws the next weekly card only from the chosen 20', () => {
    let n = 0;
    const seeded = applyDefaultKetPack([], emptyQuestState(), 'child', {
      now: 't',
      createId: () => `w${(n += 1)}`,
    });
    assert.equal(seeded.words.length, DEFAULT_KET_PACK_SIZE);
    assert.equal(DEFAULT_KET_PACK_SIZE, 1792);
    const selected = PROOFREAD_STARTER.map((entry) => {
      const found = seeded.words.find((item) => item.en.toLowerCase() === entry.en.toLowerCase());
      assert.ok(found, entry.en);
      return found;
    });
    const plan = commitWeeklySelection(undefined, 'child', {
      enabled: true,
      wordIds: selected.map((item) => item.id),
      readiness: Object.fromEntries(selected.map((item) => [item.id, 'ready-to-spell' as const])),
    }, DATE, null);
    const state = resolveActiveLearningDay({
      ...desk(seeded.words, [profile('child')], 'child'),
      weeklyByProfile: { child: plan },
    }, DATE, () => 0.2, ids('card'));
    const lesson = state.dailyByProfile.child;
    const allowed = new Set(selected.map((item) => item.id));
    const used = [...lesson.vocabWordIds, ...lesson.dictationWordIds];
    assert.ok(used.length > 0);
    assert.ok(used.every((id) => allowed.has(id)));
    const barbecue = seeded.words.find((item) => item.en === 'barbecue');
    assert.ok(barbecue);
    assert.equal(used.includes(barbecue.id), false);
    assert.equal(lesson.scope, 'weekly');
  });

  it('AC-SP31-02 links one recorded word to two groups without copying it', () => {
    const apple = word('apple-id', 'apple', 'child', { recordingUri: 'recordings/words/apple.m4a' });
    const history = { 'apple-id': progress('apple-id') };
    let state = desk([apple], [profile('child')], 'child', { progress: history });
    state = {
      ...state,
      contentGroups: createContentGroup(createContentGroup(state.contentGroups, {
        profileId: 'child', name: '本周拼写', now: 't', createId: () => 'group-a',
      }), { profileId: 'child', name: '食物', now: 't', createId: () => 'group-b' }),
    };
    const groups = addWordToContentGroups(state.contentGroups, 'child', apple.id, ['group-a', 'group-b']);
    assert.deepEqual(groups.map((group) => group.wordIds), [['apple-id'], ['apple-id']]);
    assert.equal(state.words.length, 1);
    assert.equal(state.words[0]?.recordingUri, 'recordings/words/apple.m4a');
    assert.equal(state.progress['apple-id']?.vocabKnown, true);
    assert.equal(removeContentGroup(groups, 'group-a').length, 1);
    assert.equal(state.words[0]?.id, 'apple-id');
  });

  it('AC-SP31-03 gives each child a separate apple', () => {
    const first = applyWordListImport([], emptyQuestState(), 'p1', 'apple,苹果', { createId: () => 'a1' });
    const second = applyWordListImport(first.words, emptyQuestState(), 'p2', 'apple,苹果', { createId: () => 'a2' });
    const apples = second.words
      .filter((item) => item.en === 'apple')
      .map((item) => [item.id, item.profileId])
      .sort((left, right) => left[0].localeCompare(right[0]));
    assert.deepEqual(apples, [['a1', 'p1'], ['a2', 'p2']]);
  });

  it('AC-SP31-04 stays empty, small, or skips deleted words without borrowing or finishing', () => {
    const library = [word('w1', 'milk', 'child'), word('w2', 'school', 'child')];
    const base = desk(library, [profile('child')], 'child');
    const emptyPlan = commitWeeklySelection(undefined, 'child', {
      enabled: true, wordIds: [], readiness: {},
    }, DATE, null);
    const emptyDay = resolveActiveLearningDay({
      ...base,
      weeklyByProfile: { child: emptyPlan },
    }, DATE, () => 0, ids('empty'));
    assert.equal(emptyDay.dailyByProfile.child.scope, 'weekly');
    assert.deepEqual(emptyDay.dailyByProfile.child.vocabWordIds, []);
    assert.equal(isDailyComplete(emptyDay.dailyByProfile.child), false);

    const onePlan = commitWeeklySelection(undefined, 'child', {
      enabled: true, wordIds: ['w1'], readiness: { w1: 'familiarize' },
    }, DATE, null);
    const oneDay = resolveActiveLearningDay({
      ...base,
      weeklyByProfile: { child: onePlan },
    }, DATE, () => 0, ids('one'));
    assert.deepEqual(oneDay.dailyByProfile.child.vocabWordIds, ['w1']);
    assert.deepEqual(oneDay.dailyByProfile.child.dictationWordIds, ['w1']);
    assert.equal(oneDay.dailyByProfile.child.vocabWordIds.includes('w2'), false);
    assert.equal(isDailyComplete(oneDay.dailyByProfile.child), false);

    const deletedPlan = commitWeeklySelection(undefined, 'child', {
      enabled: true, wordIds: ['missing', 'w1'], readiness: { w1: 'familiarize' },
    }, DATE, null);
    const deletedDay = resolveActiveLearningDay({
      ...base,
      weeklyByProfile: { child: deletedPlan },
    }, DATE, () => 0, ids('gone'));
    assert.deepEqual(deletedDay.dailyByProfile.child.vocabWordIds, ['w1']);
    assert.equal(isDailyComplete(deletedDay.dailyByProfile.child), false);
  });

  it('AC-SP31-05 keeps today after the list changes and uses the new list tomorrow', () => {
    const library = [word('w1', 'milk', 'child'), word('w2', 'school', 'child'), word('w3', 'home', 'child')];
    let state = desk(library, [profile('child')], 'child');
    const plan = commitWeeklySelection(undefined, 'child', {
      enabled: true, wordIds: ['w1', 'w2'], readiness: { w1: 'ready-to-spell', w2: 'familiarize' },
    }, DATE, null);
    state = resolveActiveLearningDay({ ...state, weeklyByProfile: { child: plan } }, DATE, () => 0, ids('today'));
    const original = state.dailyByProfile.child;
    const halfway: DailyLesson = {
      ...original,
      completedVocabIds: [original.vocabWordIds[0]],
    };
    state = {
      ...state,
      daily: halfway,
      dailyByProfile: { child: halfway },
    };
    const changed = commitWeeklySelection(state.weeklyByProfile.child, 'child', {
      enabled: true, wordIds: ['w3'], readiness: { w3: 'familiarize' },
    }, DATE, halfway);
    state = resolveActiveLearningDay({
      ...state,
      weeklyByProfile: { child: changed },
    }, DATE, () => 0.9, ids('same-day'));
    assert.equal(state.dailyByProfile.child.cardId, halfway.cardId);
    assert.deepEqual(state.dailyByProfile.child.vocabWordIds, halfway.vocabWordIds);
    assert.deepEqual(state.dailyByProfile.child.completedVocabIds, halfway.completedVocabIds);
    assert.equal(state.weeklyByProfile.child.pending?.effectiveOn, '2026-10-07');
    const tomorrow = resolveActiveLearningDay(state, '2026-10-07', () => 0, ids('next'));
    assert.deepEqual(tomorrow.dailyByProfile.child.vocabWordIds, ['w3']);
    assert.deepEqual(tomorrow.dailyByProfile.child.completedVocabIds, []);
    assert.equal(tomorrow.weeklyByProfile.child.pending, null);
    assert.equal(tomorrow.words.find((item) => item.id === 'w1')?.en, 'milk');
  });

  it('AC-SP31-06 previews corrections and does not repeat words or groups', () => {
    const apple = word('apple-id', 'breakfast', 'child', {
      zh: '家长改过的早餐',
      recordingUri: 'recordings/words/breakfast.m4a',
    });
    const suggestions = glossSuggestions();
    const preview = previewGlossCorrections([apple], 'child', suggestions);
    const breakfast = preview.find((item) => item.wordId === 'apple-id');
    assert.equal(breakfast?.current, '家长改过的早餐');
    assert.equal(breakfast?.suggested, '早餐');
    const kept = applyGlossCorrections([apple], []);
    assert.equal(kept[0]?.zh, '家长改过的早餐');
    assert.equal(kept[0]?.recordingUri, 'recordings/words/breakfast.m4a');
    let pack = importProofreadPack({
      words: kept,
      groups: [],
      profileId: 'child',
      entries: PROOFREAD_STARTER,
      now: 't',
      createId: ids('new'),
    });
    const again = importProofreadPack({
      words: pack.words,
      groups: pack.groups,
      profileId: 'child',
      entries: PROOFREAD_STARTER,
      now: 't2',
      createId: ids('again'),
    });
    assert.equal(again.groups.length, 1);
    assert.equal(again.added, 0);
    assert.equal(again.words.filter((item) => item.en.toLowerCase() === 'breakfast').length, 1);
    assert.equal(again.words.find((item) => item.id === 'apple-id')?.zh, '家长改过的早餐');
    const applied = applyGlossCorrections(again.words, [{ wordId: 'apple-id', suggested: '早餐' }]);
    assert.equal(applied.find((item) => item.id === 'apple-id')?.zh, '早餐');
    assert.equal(applied.find((item) => item.id === 'apple-id')?.recordingUri, 'recordings/words/breakfast.m4a');
    assert.equal(previewGlossCorrections(applied, 'child', suggestions).some((item) => item.wordId === 'apple-id'), false);
    pack = again;
  });

  it('AC-SP31-07 keeps groups, both profiles, progress and the recording in JSON and ZIP', async () => {
    const apple = word('apple-id', 'apple', 'p1', { recordingUri: 'recordings/words/apple.m4a', zh: '苹果' });
    const other = word('pear-id', 'pear', 'p2', { zh: '梨' });
    let state = desk([apple, other], [profile('p1', '姐姐'), profile('p2', '弟弟')], 'p1', {
      progress: { 'apple-id': progress('apple-id') },
    });
    state = {
      ...state,
      contentGroups: addWordToContentGroups(createContentGroup(state.contentGroups, {
        profileId: 'p1', name: '本周拼写', now: 't', createId: () => 'group-p1',
      }), 'p1', apple.id, ['group-p1']),
      weeklyByProfile: {
        p1: commitWeeklySelection(undefined, 'p1', {
          enabled: true, wordIds: [apple.id], readiness: { [apple.id]: 'ready-to-spell' },
        }, DATE, null),
      },
    };
    const json = parseBackup(serializeBackup(state, '2026-10-06T00:00:00.000Z'));
    assert.equal(json.ok, true);
    if (!json.ok) return;
    assert.equal(json.state.words.find((item) => item.id === 'apple-id')?.recordingUri, apple.recordingUri);
    assert.equal(json.state.progress['apple-id']?.vocabKnown, true);
    assert.deepEqual(json.state.contentGroups.find((group) => group.id === 'group-p1')?.wordIds, [apple.id]);
    assert.equal(json.state.weeklyByProfile.p1?.wordIds[0], apple.id);
    assert.equal(json.state.words.filter((item) => item.en === 'pear')[0]?.profileId, 'p2');

    const bytes = await createBackupArchive(state, async () => strToU8('audio-bytes'), {
      appVersion: '0.1.31',
      exportedAt: '2026-10-06T00:00:00.000Z',
    });
    const restored = parseBackupArchive(bytes);
    const restoredApple = restored.state.words.find((item) => item.id === 'apple-id');
    assert.equal(restoredApple?.profileId, 'p1');
    assert.ok(restoredApple?.recordingUri);
    assert.equal(restored.state.progress['apple-id']?.dictationLevelIndex, 1);
    assert.deepEqual(restored.state.contentGroups.find((group) => group.id === 'group-p1')?.wordIds, [apple.id]);
    assert.equal(restored.state.words.find((item) => item.id === 'pear-id')?.profileId, 'p2');
    assert.equal(restored.state.weeklyByProfile.p1?.enabled, true);
  });

  it('AC-SP31-08 resumes each child and rejects a stale card from the other child or an old global card', () => {
    const words = [word('a1', 'milk', 'p1'), word('b1', 'school', 'p2'), word('shared-looking', 'book', 'p1')];
    let state = desk(words, [profile('p1'), profile('p2')], 'p1');
    const planA = commitWeeklySelection(undefined, 'p1', {
      enabled: true, wordIds: ['a1'], readiness: { a1: 'ready-to-spell' },
    }, DATE, null);
    state = resolveActiveLearningDay({ ...state, weeklyByProfile: { p1: planA } }, DATE, () => 0, ids('a-card'));
    const cardA = state.dailyByProfile.p1;
    const halfwayA: DailyLesson = { ...cardA, completedVocabIds: [cardA.vocabWordIds[0]] };
    state = { ...state, daily: halfwayA, dailyByProfile: { ...state.dailyByProfile, p1: halfwayA } };
    state = { ...state, activeProfileId: 'p2' };
    const planB = commitWeeklySelection(undefined, 'p2', {
      enabled: true, wordIds: ['b1'], readiness: { b1: 'familiarize' },
    }, DATE, null);
    state = resolveActiveLearningDay({
      ...state,
      weeklyByProfile: { ...state.weeklyByProfile, p2: planB },
    }, DATE, () => 0, ids('b-card'));
    const cardB = state.dailyByProfile.p2;
    assert.notEqual(cardA.cardId, cardB.cardId);
    assert.deepEqual(state.dailyByProfile.p1.completedVocabIds, ['a1']);
    assert.deepEqual(cardB.vocabWordIds, ['b1']);
    assert.equal(acceptDailyClaim(state, { profileId: 'p1', cardId: cardA.cardId! }, 'a1', 'vocab'), false);
    assert.equal(acceptDailyClaim(state, { profileId: 'p2', cardId: cardB.cardId! }, 'b1', 'vocab'), true);
    state = { ...state, activeProfileId: 'p1' };
    const back = resolveActiveLearningDay(state, DATE, () => 0.9, ids('nope'));
    assert.equal(back.dailyByProfile.p1.cardId, cardA.cardId);
    assert.deepEqual(back.dailyByProfile.p1.completedVocabIds, ['a1']);
    assert.equal(acceptDailyClaim(back, { profileId: 'p2', cardId: cardB.cardId! }, 'b1', 'vocab'), false);

    const legacy = hydrateState({
      version: 1,
      words,
      profiles: [profile('p1'), profile('p2')],
      activeProfileId: 'p1',
      daily: {
        date: DATE,
        vocabWordIds: ['a1', 'b1'],
        dictationWordIds: ['a1'],
        completedVocabIds: ['a1'],
        completedDictationIds: [],
      },
    });
    assert.ok(legacy.legacyDaily);
    assert.equal(legacy.dailyByProfile.p1, undefined);
    assert.equal(legacy.dailyByProfile.p2, undefined);
    assert.equal(legacy.daily, null);
    const attributed = attributeLegacyDaily(legacy.legacyDaily, words);
    assert.equal(attributed.kind, 'legacy');
  });

  it('keeps a weekly list across Monday and does not invent spelling history for old saves', () => {
    const sunday = '2026-10-04';
    const monday = '2026-10-05';
    const library = [word('w1', 'milk', 'child')];
    const plan = commitWeeklySelection(undefined, 'child', {
      enabled: true, wordIds: ['w1'], readiness: { w1: 'familiarize' },
    }, sunday, null);
    const sundayState = resolveActiveLearningDay({
      ...desk(library, [profile('child')], 'child'),
      weeklyByProfile: { child: plan },
    }, sunday, () => 0, ids('sun'));
    const mondayState = resolveActiveLearningDay(sundayState, monday, () => 0, ids('mon'));
    assert.deepEqual(mondayState.weeklyByProfile.child.wordIds, ['w1']);
    assert.equal(rollWeeklyPlan(mondayState.weeklyByProfile.child, monday)?.enabled, true);

    const old = hydrateState({
      version: 1,
      words: [word('w1', 'milk', DEFAULT_PROFILE_ID, { recordingUri: 'recordings/words/milk.m4a' })],
      progress: { w1: progress('w1') },
      daily: {
        date: DATE,
        vocabWordIds: ['w1'],
        dictationWordIds: ['w1'],
        completedVocabIds: ['w1'],
        completedDictationIds: [],
      },
    });
    assert.equal(old.words[0]?.recordingUri, 'recordings/words/milk.m4a');
    assert.equal(old.progress.w1?.vocabKnown, true);
    assert.equal(old.weeklyByProfile[DEFAULT_PROFILE_ID], undefined);
    assert.deepEqual(old.dailyByProfile[DEFAULT_PROFILE_ID]?.completedVocabIds, ['w1']);
    assert.equal(old.legacyDaily, null);
    const again = hydrateState(JSON.parse(JSON.stringify(old)) as unknown);
    assert.deepEqual(again.dailyByProfile, old.dailyByProfile);
    assert.equal(again.contentGroups.length, old.contentGroups.length);
    assert.throws(() => decodeStoredState(JSON.stringify({ version: 1, words: [], contentSchema: 2 })), /原存档已保留/);
  });

  it('ships the corrected glosses in the built-in pack and leaves placeholders out of the starter', () => {
    const parsed = parseWordList(DEFAULT_KET_PACK_TEXT);
    assert.equal(parsed.find((item) => item.en === 'spell')?.zh, '拼写');
    assert.equal(parsed.find((item) => item.en === 'weekday')?.zh, '工作日；平日');
    assert.equal(parsed.find((item) => item.en === 'special')?.zh, '特别的；特殊的');
    assert.equal(parsed.find((item) => item.en === 'tidy')?.zh, '整洁的；整理');
    assert.equal(PROOFREAD_STARTER.length, 20);
    assert.equal(PROOFREAD_STARTER.some((item) => /\b(sb|sth)\b/i.test(item.en)), false);
    const removed = detachWord(desk([word('w1', 'milk', 'child')], [profile('child')], 'child', {
      progress: { w1: progress('w1') },
      contentGroups: [{
        id: 'g', profileId: 'child', name: '组', sources: [], wordIds: ['w1'], createdAt: 't',
      }],
      weeklyByProfile: {
        child: commitWeeklySelection(undefined, 'child', {
          enabled: true, wordIds: ['w1'], readiness: { w1: 'familiarize' },
        }, DATE, null),
      },
    }), 'w1');
    assert.deepEqual(removed.contentGroups[0]?.wordIds, []);
    assert.deepEqual(removed.weeklyByProfile.child?.wordIds, []);
    assert.equal(removed.progress.w1?.vocabKnown, true);
  });
});
