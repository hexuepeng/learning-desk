import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSampleWords } from '../content/sampleWords.ts';
import { defaultDictationSettings } from './dictation.ts';
import { DEFAULT_PROFILE_ID } from './profile.ts';
import { emptyQuestState } from './quest.ts';
import { defaultSentenceSettings } from './sentences.ts';
import { emptyStarState } from './stars.ts';
import { emptyStreak } from './streak.ts';
import {
  applyDefaultKetPack,
  applyWordListImport,
  DEFAULT_KET_PACK_SIZE,
  seedDefaultKetPackIfEmpty,
} from './wordImport.ts';
import type { PersistedState, Word } from '../types/models.ts';

function word(id: string, en: string, extra?: Partial<Word>): Word {
  return {
    id,
    en,
    zh: en,
    source: 'parent',
    createdAt: 't',
    profileId: DEFAULT_PROFILE_ID,
    ...extra,
  };
}

describe('word import and default KET seed', () => {
  it('appends new words and rebuilds the quest pack in file order', () => {
    const existing = [word('w1', 'apple', { ketPack: true }), word('w2', 'desk')];
    const result = applyWordListImport(
      existing,
      { ...emptyQuestState(), packWordIds: ['w1'] },
      DEFAULT_PROFILE_ID,
      ['barbecue,烤肉', 'apple,苹果', 'chips,薯条'].join('\n'),
      { ketPack: true, rebuildPack: true },
    );
    assert.equal(result.added, 2);
    assert.equal(result.skipped, 1);
    assert.deepEqual(
      result.quest.packWordIds.map((id) => result.words.find((item) => item.id === id)?.en),
      ['barbecue', 'apple', 'chips'],
    );
  });

  it('can prepend a merged pack without dropping existing quest ids', () => {
    const existing = [word('w1', 'apple', { ketPack: true }), word('w2', 'desk', { ketPack: true })];
    const result = applyWordListImport(
      existing,
      { ...emptyQuestState(), packWordIds: ['w1', 'w2'] },
      DEFAULT_PROFILE_ID,
      ['school,学校', 'apple,苹果'].join('\n'),
      { ketPack: true, packMerge: 'prepend' },
    );
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 1);
    assert.deepEqual(
      result.quest.packWordIds.map((id) => result.words.find((item) => item.id === id)?.en),
      ['school', 'apple', 'desk'],
    );
  });

  it('seeds the built-in pack onto sample words like the one-tap import', () => {
    const samples = createSampleWords('t').map((item) => ({
      ...item,
      profileId: DEFAULT_PROFILE_ID,
    }));
    let n = 0;
    const result = applyDefaultKetPack(samples, emptyQuestState(), DEFAULT_PROFILE_ID, {
      now: 't',
      createId: (prefix) => `${prefix}_${(n += 1)}`,
    });
    assert.equal(result.added, DEFAULT_KET_PACK_SIZE - samples.length);
    assert.equal(result.skipped, samples.length);
    assert.equal(result.packAdded, DEFAULT_KET_PACK_SIZE);
    assert.equal(result.quest.packWordIds.length, DEFAULT_KET_PACK_SIZE);
    assert.equal(result.words.find((item) => item.id === result.quest.packWordIds[0])?.en, 'barbecue');
    assert.equal(result.words.find((item) => item.id === result.quest.packWordIds.at(-1))?.en, 'zero');
  });

  it('keeps the same English word on two child profiles', () => {
    const existing = [word('a1', 'apple', { profileId: 'p1', recordingUri: 'recordings/a1.m4a' })];
    const result = applyWordListImport(
      existing,
      emptyQuestState(),
      'p2',
      'apple,苹果',
      { now: 't', createId: () => 'a2' },
    );
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 0);
    const apples = result.words.filter((item) => item.en.toLowerCase() === 'apple');
    assert.deepEqual(apples.map((item) => item.id), ['a1', 'a2']);
    assert.deepEqual(apples.map((item) => item.profileId), ['p1', 'p2']);
    assert.equal(apples[0]?.recordingUri, 'recordings/a1.m4a');
  });

  it('seeds only when the living quest pack is empty', () => {
    const empty: PersistedState = {
      version: 1,
      words: [word('w1', 'desk')],
      progress: {},
      dictationSettings: defaultDictationSettings(),
      showIpa: true,
      feedback: [],
      albumBooks: [],
      sentences: [],
      sentenceProgress: {},
      sentenceSettings: defaultSentenceSettings(),
      streak: emptyStreak(),
      stars: emptyStarState(),
      practiceLog: [],
      daily: null,
      parentPin: '1234',
      profiles: [{ id: DEFAULT_PROFILE_ID, name: '孩子', createdAt: 't', archived: false }],
      activeProfileId: DEFAULT_PROFILE_ID,
      questByProfile: { [DEFAULT_PROFILE_ID]: emptyQuestState() },
    };
    const seeded = seedDefaultKetPackIfEmpty(empty);
    assert.equal(seeded.questByProfile[DEFAULT_PROFILE_ID]?.packWordIds.length, DEFAULT_KET_PACK_SIZE);
    assert.equal(seeded.words.length, DEFAULT_KET_PACK_SIZE);

    const again = seedDefaultKetPackIfEmpty(seeded);
    assert.equal(again.words.length, seeded.words.length);
    assert.deepEqual(again.questByProfile[DEFAULT_PROFILE_ID]?.packWordIds, seeded.questByProfile[DEFAULT_PROFILE_ID]?.packWordIds);
  });
});
