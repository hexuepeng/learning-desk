import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PROFILE_ID,
  defaultProfile,
  projectProfile,
  renameProfile,
  setProfileArchived,
  wordsForProfile,
} from './profile.ts';
import { emptyStarState } from './stars.ts';
import { emptyStreak } from './streak.ts';
import type { PersistedState } from '../types/models.ts';

describe('profiles', () => {
  it('keeps untagged words under the default child profile', () => {
    const words = [
      { id: 'w1', en: 'cat', zh: '猫', source: 'parent' as const, createdAt: 't' },
      {
        id: 'w2',
        en: 'dog',
        zh: '狗',
        source: 'parent' as const,
        createdAt: 't',
        profileId: 'other',
      },
    ];
    assert.deepEqual(
      wordsForProfile(words, DEFAULT_PROFILE_ID).map((word) => word.id),
      ['w1'],
    );
  });

  it('does not archive the last live profile', () => {
    const only = [defaultProfile('t')];
    assert.equal(setProfileArchived(only, DEFAULT_PROFILE_ID, true)[0].archived, false);
    const two = [...only, { id: 'p2', name: '弟弟', createdAt: 't', archived: false }];
    assert.equal(setProfileArchived(two, DEFAULT_PROFILE_ID, true)[0].archived, true);
    assert.equal(renameProfile(two, 'p2', '妹妹')[1].name, '妹妹');
  });

  it('projects words and books for the active profile', () => {
    const state = {
      version: 1 as const,
      words: [
        { id: 'w1', en: 'cat', zh: '猫', source: 'parent' as const, createdAt: 't' },
        {
          id: 'w2',
          en: 'dog',
          zh: '狗',
          source: 'parent' as const,
          createdAt: 't',
          profileId: 'p2',
        },
      ],
      progress: {},
      dictationSettings: { enabledTypes: [], autoAdjust: true },
      feedback: [],
      albumBooks: [
        { id: 'b1', title: '我家', pages: [], createdAt: 't' },
        { id: 'b2', title: '另一本', pages: [], createdAt: 't', profileId: 'p2' },
      ],
      streak: emptyStreak(),
      stars: emptyStarState(),
      practiceLog: [],
      daily: null,
      parentPin: '1234',
      profiles: [defaultProfile('t'), { id: 'p2', name: '弟弟', createdAt: 't', archived: false }],
      activeProfileId: DEFAULT_PROFILE_ID,
    } as PersistedState;
    const view = projectProfile(state);
    assert.deepEqual(
      view.words.map((word) => word.id),
      ['w1'],
    );
    assert.deepEqual(
      view.albumBooks.map((book) => book.id),
      ['b1'],
    );
  });
});
