import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPackWords, DEFAULT_WORD_PACK_ID, WORD_PACKS } from '../content/familyWordPacks.ts';
import { parseWordList } from './parseWordList.ts';
import { defaultState, hydrateState } from './storage.ts';
import { applyWordPack, mergeWordLists } from './wordPacks.ts';
import type { Word } from '../types/models.ts';

function word(en: string, zh = '测试'): Word {
  return { id: en, en, zh, source: 'parent', createdAt: 't' };
}

describe('family word packs', () => {
  it('parses the bundled KET lists', () => {
    assert.equal(parseWordList(WORD_PACKS['ket-a2'].text).length, 1553);
    assert.equal(parseWordList(WORD_PACKS['ket-a2-starter'].text).length, 120);
    assert.equal(createPackWords('ket-a2-starter', 't').every((item) => item.source === 'pack'), true);
  });

  it('skips duplicate english heads when merging', () => {
    const merged = mergeWordLists([word('Apple', '苹果')], [word('apple', '苹果'), word('zoo', '动物园')]);
    assert.equal(merged.added, 1);
    assert.equal(merged.skipped, 1);
    assert.deepEqual(
      merged.words.map((item) => item.en),
      ['zoo', 'Apple'],
    );
  });

  it('seeds a new desk with the default family pack', () => {
    const state = defaultState();
    assert.ok(state.words.length >= 1500);
    assert.deepEqual(state.appliedWordPacks, [DEFAULT_WORD_PACK_ID]);
    assert.ok(state.words.some((item) => item.en.toLowerCase() === 'apple'));
  });

  it('fills an old snapshot that never received the family pack', () => {
    const next = hydrateState({
      version: 1,
      words: [word('apple', '苹果')],
    });
    assert.ok(next.words.length >= 1500);
    assert.ok(next.appliedWordPacks?.includes(DEFAULT_WORD_PACK_ID));
    assert.equal(next.words.filter((item) => item.en.toLowerCase() === 'apple').length, 1);
  });

  it('does not append the same pack twice in once mode', () => {
    const seeded = defaultState();
    const again = applyWordPack(seeded, DEFAULT_WORD_PACK_ID, 'once');
    assert.equal(again.added, 0);
    assert.equal(again.state.words.length, seeded.words.length);
  });
});
