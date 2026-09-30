import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseBackup, serializeBackup, validateBackupState } from './backup.ts';
import { defaultState } from './storage.ts';

describe('backup', () => {
  it('round-trips a desk snapshot', () => {
    const state = defaultState();
    state.words = [
      {
        id: 'w1',
        en: 'apple',
        zh: '苹果',
        source: 'parent',
        createdAt: 't',
      },
    ];
    const text = serializeBackup(state, '2026-09-19T00:00:00.000Z');
    const parsed = parseBackup(text);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.state.words[0]?.en, 'apple');
    assert.equal(parsed.state.parentPin, state.parentPin);
    assert.deepEqual(parsed.state.sentences, []);
    assert.equal(parsed.state.sentenceSettings.countTowardDaily, false);
  });

  it('accepts a raw persisted state json', () => {
    const parsed = parseBackup(JSON.stringify(defaultState()));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.ok(parsed.state.words.length > 0);
  });

  it('rejects junk', () => {
    assert.equal(parseBackup('not-json').ok, false);
    assert.equal(parseBackup('{"kind":"other"}').ok, false);
  });

  it('migrates the historical most-recent star shape in legacy JSON', () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, words: [], stars: { lastRatedDate: '2026-09-29', lastStars: 3, consecutiveThreeStarDays: 1 } }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.state.stars.byDate['2026-09-29'], 3);
    assert.equal(parsed.state.stars.celebrationKey, null);
  });

  it('does not silently import unknown formats or schemas', () => {
    const state = defaultState();
    assert.equal(parseBackup(JSON.stringify({ kind: 'learning-desk-backup', format: 42, state })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ ...state, version: 2 })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ version: 1, words: [null] })).ok, false);
  });

  it('rejects damaged nested progress before migration can discard it', () => {
    const changes: Array<(state: any) => void> = [
      (state) => { state.streak.stickers = 'not-an-array'; },
      (state) => { state.progress.w = { wordId: 'w', vocabSeen: 'three' }; },
      (state) => { state.sentenceProgress.s = { sentenceId: 's', heard: -1, canSay: true }; },
      (state) => { state.questByProfile.profile_child.items.w = { learnedOn: '2026-09-30', step: -1, nextDue: null }; },
      (state) => { state.questByProfile.profile_child.day = { date: '2026-09-30', ids: ['w'], newIds: [], stars: [0, 0, 0], complete: false, answers: { '2:w': { outcome: 'correct', submittedAt: 't' } } }; },
    ];
    for (const change of changes) {
      const state = defaultState();
      change(state);
      assert.throws(() => validateBackupState(state, true), /数据/);
      assert.equal(parseBackup(serializeBackup(state)).ok, false);
    }
  });
});
