import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decodeStoredState, defaultState, hydrateState } from './storage.ts';

describe('storage migration', () => {
  it('refuses damaged and future stored data instead of returning demo content', () => {
    for (const raw of ['', '{broken', 'null', '[]', '{"version":2,"words":[]}', '{}']) {
      assert.throws(() => decodeStoredState(raw), /原存档已保留/);
    }
    assert.deepEqual(decodeStoredState('{"version":1,"words":[]}').words, []);
  });

  it('keeps album ownership for every child when reading a full backup', () => {
    const next = hydrateState({
      version: 1,
      words: [],
      albumBooks: [
        { id: 'b1', profileId: 'p1', title: 'A', pages: [] },
        { id: 'b2', profileId: 'p2', title: 'B', pages: [] },
      ],
    });
    assert.deepEqual(next.albumBooks.map((book) => book.profileId), ['p1', 'p2']);
  });

  it('validates stored nested data before migration and accepts a current saved state', () => {
    const current = hydrateState(defaultState());
    assert.deepEqual(decodeStoredState(JSON.stringify(current)), current);
    current.questByProfile.profile_child.day = {
      date: '2026-09-30', ids: ['w1'], newIds: ['w1'], stars: [0, 0, 0], complete: false,
    };
    const broken = JSON.parse(JSON.stringify(current));
    broken.questByProfile.profile_child.day.ids = 'not-an-array';
    assert.throws(() => decodeStoredState(JSON.stringify(broken)), /原存档已保留/);
  });

  it('fills missing ipa on old words and defaults showIpa on', () => {
    const next = hydrateState({
      version: 1,
      words: [
        { id: 'w1', en: 'desk', zh: '书桌', source: 'parent', createdAt: 't' },
        { id: 'w2', en: 'apple', zh: '苹果', source: 'parent', createdAt: 't', ipa: 'ˈæpl' },
      ],
      parentPin: '1234',
    });
    assert.equal(next.words.find((word) => word.id === 'w1')?.ipa, '');
    assert.equal(next.words.find((word) => word.id === 'w2')?.ipa, '/ˈæpl/');
    assert.equal(next.showIpa, true);
  });

  it('keeps an explicit showIpa off and leaves default sample words intact', () => {
    const next = hydrateState({
      version: 1,
      words: [],
      showIpa: false,
    });
    assert.equal(next.showIpa, false);
    assert.equal(next.words.length, 0);
    assert.equal(defaultState().showIpa, true);
    assert.ok(defaultState().words.some((word) => word.ipa === '/ˈæpl/'));
    assert.ok(defaultState().words.some((word) => word.en === 'desk' && !word.ipa));
  });

  it('fills empty quest state and can rebuild a pack from ketPack tags', () => {
    const next = hydrateState({
      version: 1,
      words: [
        { id: 'w1', en: 'apple', zh: '苹果', source: 'parent', createdAt: 't', ketPack: true },
        { id: 'w2', en: 'desk', zh: '书桌', source: 'parent', createdAt: 't' },
      ],
    });
    assert.deepEqual(next.questByProfile.profile_child?.packWordIds, ['w1']);
    assert.equal(next.questByProfile.profile_child?.dailyNewCount, 5);
    assert.equal(next.words.find((word) => word.id === 'w1')?.ketPack, true);
    assert.ok(defaultState().words.filter((word) => word.ketPack).length >= 6);
  });

  it('seeds the built-in default KET pack on a fresh install', () => {
    const next = defaultState();
    assert.equal(next.questByProfile.profile_child?.packWordIds.length, 1792);
    assert.equal(next.words.length, 1792);
    assert.equal(next.words[0]?.en, 'barbecue');
    const barbecue = next.words.find((word) => word.en === 'barbecue');
    assert.equal(barbecue?.source, 'parent');
    assert.equal(barbecue?.ketPack, true);
    const apple = next.words.find((word) => word.en === 'apple');
    assert.equal(apple?.source, 'sample');
    assert.equal(apple?.ketPack, true);
  });

  it('does not inject the default pack into an existing saved word list', () => {
    const next = hydrateState({
      version: 1,
      words: [{ id: 'w1', en: 'desk', zh: '书桌', source: 'parent', createdAt: 't' }],
    });
    assert.equal(next.words.length, 1);
    assert.equal(next.words[0]?.en, 'desk');
    assert.equal(next.questByProfile.profile_child?.packWordIds?.length ?? 0, 0);
  });

  it('fills empty sentences and keeps short-sentence daily counting off', () => {
    const next = hydrateState({
      version: 1,
      words: [],
    });
    assert.deepEqual(next.sentences, []);
    assert.deepEqual(next.sentenceProgress, {});
    assert.equal(next.sentenceSettings.countTowardDaily, false);
    assert.deepEqual(defaultState().sentences, []);
  });

  it('stamps a default profile on imported sentences', () => {
    const next = hydrateState({
      version: 1,
      words: [],
      sentences: [{ id: 's1', en: 'I like apples.', createdAt: 't' }],
      sentenceSettings: { countTowardDaily: true },
    });
    assert.equal(next.sentences[0]?.en, 'I like apples.');
    assert.equal(next.sentences[0]?.profileId, 'profile_child');
    assert.equal(next.sentenceSettings.countTowardDaily, true);
  });

  it('keeps the same English sentence on two child profiles', () => {
    const next = hydrateState({
      version: 1,
      words: [],
      sentences: [
        { id: 's1', en: 'I like apples.', createdAt: 't', profileId: 'p1' },
        { id: 's2', en: 'I like apples.', createdAt: 't', profileId: 'p2' },
      ],
    });
    assert.deepEqual(
      next.sentences.map((item) => item.id),
      ['s1', 's2'],
    );
  });
});
