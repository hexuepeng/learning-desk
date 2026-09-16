import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answersMatch, parseWordList } from './parseWordList.ts';

describe('parseWordList', () => {
  it('parses space, comma, colon and tab separators', () => {
    const text = [
      'apple 苹果',
      'ice cream,冰淇淋',
      'good morning：早上好',
      'desk\t书桌',
      'red - 红色',
      '# comment',
      'not-a-pair',
      'apple 苹果',
    ].join('\n');
    assert.deepEqual(parseWordList(text), [
      { en: 'apple', zh: '苹果' },
      { en: 'ice cream', zh: '冰淇淋' },
      { en: 'good morning', zh: '早上好' },
      { en: 'desk', zh: '书桌' },
      { en: 'red', zh: '红色' },
    ]);
  });

  it('normalizes written answers', () => {
    assert.equal(answersMatch('  Apple  ', 'apple'), true);
    assert.equal(answersMatch('ice  cream', 'ice cream'), true);
    assert.equal(answersMatch('cat', 'dog'), false);
  });
});
