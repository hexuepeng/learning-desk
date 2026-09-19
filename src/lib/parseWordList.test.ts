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
      { en: 'apple', zh: '苹果', ipa: '' },
      { en: 'ice cream', zh: '冰淇淋', ipa: '' },
      { en: 'good morning', zh: '早上好', ipa: '' },
      { en: 'desk', zh: '书桌', ipa: '' },
      { en: 'red', zh: '红色', ipa: '' },
    ]);
  });

  it('normalizes written answers', () => {
    assert.equal(answersMatch('  Apple  ', 'apple'), true);
    assert.equal(answersMatch('ice  cream', 'ice cream'), true);
    assert.equal(answersMatch('cat', 'dog'), false);
  });

  it('parses csv with header, quotes and a gloss that starts with brackets', () => {
    const text = [
      'english,chinese',
      'a/an,第一个字母 A',
      '"ice cream",冰淇淋',
      'apartment building,<美>公寓大楼',
      'a.m.,上午',
    ].join('\n');
    assert.deepEqual(parseWordList(text), [
      { en: 'a/an', zh: '第一个字母 A', ipa: '' },
      { en: 'ice cream', zh: '冰淇淋', ipa: '' },
      { en: 'apartment building', zh: '<美>公寓大楼', ipa: '' },
      { en: 'a.m.', zh: '上午', ipa: '' },
    ]);
  });

  it('accepts an optional British IPA third column and skips header', () => {
    const text = [
      'english,chinese,ipa',
      'apple,苹果,/ˈæpl/',
      'book,书,bʊk',
      '"ice cream",冰淇淋,/ˈaɪs kriːm/',
      'water 水 /ˈwɔːtə/',
      'desk,书桌',
      'apple,苹果,/ˈæpl/',
    ].join('\n');
    assert.deepEqual(parseWordList(text), [
      { en: 'apple', zh: '苹果', ipa: '/ˈæpl/' },
      { en: 'book', zh: '书', ipa: '/bʊk/' },
      { en: 'ice cream', zh: '冰淇淋', ipa: '/ˈaɪs kriːm/' },
      { en: 'water', zh: '水', ipa: '/ˈwɔːtə/' },
      { en: 'desk', zh: '书桌', ipa: '' },
    ]);
  });
});
