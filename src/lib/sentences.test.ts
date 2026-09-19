import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  composeSentenceDrafts,
  englishArticle,
  filterSentences,
  linkSentenceWordIds,
  markSentenceCanSay,
  markSentenceHeard,
  normalizeSentences,
  orderSentenceDeck,
  pickComposeWords,
} from './sentences.ts';
import { mulberry32 } from './util.ts';
import type { DailyLesson, Sentence, Word, WordProgress } from '../types/models.ts';

const words: Word[] = [
  { id: 'w-apple', en: 'apple', zh: '苹果', source: 'parent', createdAt: 't' },
  { id: 'w-book', en: 'book', zh: '书', source: 'parent', createdAt: 't' },
  { id: 'w-read', en: 'read', zh: '读', source: 'parent', createdAt: 't' },
  { id: 'w-ice', en: 'ice cream', zh: '冰淇淋', source: 'parent', createdAt: 't' },
];

describe('sentences helpers', () => {
  it('links sentence words including multi-word entries', () => {
    assert.deepEqual(linkSentenceWordIds('I like apple and ice cream.', words).sort(), [
      'w-apple',
      'w-ice',
    ]);
    assert.deepEqual(linkSentenceWordIds('We can read the book.', words).sort(), [
      'w-book',
      'w-read',
    ]);
    assert.deepEqual(linkSentenceWordIds('Hello there.', words), []);
  });

  it('filters by english, chinese or tag', () => {
    const rows: Sentence[] = [
      { id: 's1', en: 'I like apples.', zh: '我喜欢苹果', createdAt: 't', tags: ['weekly'] },
      { id: 's2', en: 'This is my book.', zh: '这是我的书', createdAt: 't' },
    ];
    assert.deepEqual(
      filterSentences(rows, 'APPLE').map((item) => item.id),
      ['s1'],
    );
    assert.deepEqual(
      filterSentences(rows, '书').map((item) => item.id),
      ['s2'],
    );
    assert.deepEqual(
      filterSentences(rows, 'weekly').map((item) => item.id),
      ['s1'],
    );
  });

  it('prefers weekly then not-yet-can-say sentences', () => {
    const rows: Sentence[] = [
      { id: 's1', en: 'A', createdAt: 't', tags: ['weekly'] },
      { id: 's2', en: 'B', createdAt: 't', tags: ['weekly'] },
      { id: 's3', en: 'C', createdAt: 't' },
    ];
    const progress = { s1: { sentenceId: 's1', heard: 1, canSay: true } };
    const ordered = orderSentenceDeck(rows, progress, mulberry32(3));
    assert.deepEqual(
      ordered.map((item) => item.id).sort(),
      ['s1', 's2'],
    );
    assert.equal(ordered[0]?.id, 's2');
    assert.equal(ordered[1]?.id, 's1');
  });

  it('picks today and known words for the local template composer', () => {
    const daily: DailyLesson = {
      date: '2026-09-19',
      vocabWordIds: ['w-apple'],
      dictationWordIds: ['w-book'],
      completedVocabIds: [],
      completedDictationIds: [],
    };
    const progress: Record<string, WordProgress> = {
      'w-read': {
        wordId: 'w-read',
        vocabSeen: 1,
        vocabKnown: true,
        dictationLevelIndex: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
      },
    };
    const picked = pickComposeWords(words, progress, daily, 3, () => 0);
    assert.ok(picked.some((word) => word.id === 'w-apple'));
    assert.ok(picked.length >= 2 && picked.length <= 4);
  });

  it('composes 1–3 British-leaning drafts from the current word list', () => {
    const drafts = composeSentenceDrafts(words, {}, null, () => 0);
    assert.ok(drafts.length >= 1 && drafts.length <= 3);
    assert.ok(drafts.every((item) => /[A-Za-z]/.test(item.en)));
    assert.ok(drafts.some((item) => item.en.startsWith('I like') || item.en.startsWith('Have you got')));
    assert.equal(englishArticle('apple'), 'an');
    assert.equal(englishArticle('book'), 'a');
  });

  it('drops empty or duplicate stored sentences', () => {
    const next = normalizeSentences([
      { id: 's1', en: 'I like apples.', createdAt: 't' },
      { id: 's2', en: '  i like apples  ', createdAt: 't' },
      { id: 's3', en: '', createdAt: 't' },
      { en: 'We can see the sun.' },
    ]);
    assert.equal(next.length, 2);
    assert.equal(next[0]?.en, 'I like apples.');
    assert.equal(next[1]?.en, 'We can see the sun.');
  });

  it('keeps the same English sentence for different child profiles', () => {
    const next = normalizeSentences([
      { id: 's1', en: 'I like apples.', createdAt: 't', profileId: 'p1' },
      { id: 's2', en: 'I like apples.', createdAt: 't', profileId: 'p2' },
    ]);
    assert.deepEqual(
      next.map((item) => item.id),
      ['s1', 's2'],
    );
  });

  it('tracks heard and can-say without streaks', () => {
    const heard = markSentenceHeard(undefined, 's1', 't1');
    assert.equal(heard.heard, 1);
    assert.equal(heard.canSay, false);
    const again = markSentenceHeard(heard, 's1', 't2');
    assert.equal(again.heard, 2);
    const said = markSentenceCanSay(again, 's1', 't3');
    assert.equal(said.canSay, true);
    assert.equal(said.heard, 2);
  });
});
