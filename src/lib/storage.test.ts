import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultState, hydrateState } from './storage.ts';

describe('storage migration', () => {
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
});
