import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bookWordGloss, tokenizeEnglish } from './bookWords.ts';
import { addWordToDaily } from './daily.ts';

describe('book words', () => {
  it('picks tappable words from a picture-book sentence', () => {
    assert.deepEqual(tokenizeEnglish('This is my little desk.'), [
      'This',
      'is',
      'my',
      'little',
      'desk',
    ]);
    assert.deepEqual(tokenizeEnglish('I say, "Good morning, cat!"'), [
      'say',
      'Good',
      'morning',
      'cat',
    ]);
  });

  it('uses the page gloss when adding a new word', () => {
    assert.equal(bookWordGloss('desk', '这是我的小小书桌。'), '这是我的小小书桌。');
  });
});

describe('addWordToDaily', () => {
  it('appends a new vocab item without duplicating', () => {
    const daily = {
      date: '2026-09-19',
      vocabWordIds: ['a'],
      dictationWordIds: ['b'],
      completedVocabIds: [],
      completedDictationIds: [],
    };
    const once = addWordToDaily(daily, 'c');
    assert.deepEqual(once.vocabWordIds, ['a', 'c']);
    assert.equal(addWordToDaily(once, 'c'), once);
    assert.equal(addWordToDaily(once, 'b'), once);
  });
});
