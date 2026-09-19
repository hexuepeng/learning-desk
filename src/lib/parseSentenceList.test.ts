import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeSentenceKey, parseSentenceList } from './parseSentenceList.ts';

describe('parseSentenceList', () => {
  it('parses one English sentence per line', () => {
    const text = [
      'I like apples.',
      'We can see the sun.',
      'Have you got a pencil?',
      '# comment',
      '',
      'I like apples.',
    ].join('\n');
    assert.deepEqual(parseSentenceList(text), [
      { en: 'I like apples.', zh: '' },
      { en: 'We can see the sun.', zh: '' },
      { en: 'Have you got a pencil?', zh: '' },
    ]);
  });

  it('parses two-column comma, pipe and CSV lines', () => {
    const text = [
      'english,chinese',
      'I like apples,我喜欢苹果',
      'We can see the sun|我们能看见太阳',
      '"Hello, I am Tom.",你好，我是汤姆',
      'This is my desk\t这是我的书桌',
    ].join('\n');
    assert.deepEqual(parseSentenceList(text), [
      { en: 'I like apples', zh: '我喜欢苹果' },
      { en: 'We can see the sun', zh: '我们能看见太阳' },
      { en: 'Hello, I am Tom.', zh: '你好，我是汤姆' },
      { en: 'This is my desk', zh: '这是我的书桌' },
    ]);
  });

  it('keeps English commas as one column when the right side is not Chinese', () => {
    const text = ['Hello, I am Tom.', 'I like apples, I like books.'].join('\n');
    assert.deepEqual(parseSentenceList(text), [
      { en: 'Hello, I am Tom.', zh: '' },
      { en: 'I like apples, I like books.', zh: '' },
    ]);
  });

  it('skips duplicate English after a light trim/case normalize', () => {
    const text = [
      'I like apples.',
      '  i LIKE apples  ',
      'I like apples!',
      'I like apples',
    ].join('\n');
    assert.deepEqual(parseSentenceList(text), [{ en: 'I like apples.', zh: '' }]);
  });

  it('normalizes sentence keys lightly', () => {
    assert.equal(normalizeSentenceKey('  I Like Apples.  '), 'i like apples');
    assert.equal(normalizeSentenceKey('I like apples!'), 'i like apples');
    assert.equal(normalizeSentenceKey('We can see the sun'), 'we can see the sun');
  });
});
