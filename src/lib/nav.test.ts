import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { goBackOrHome } from './nav.ts';

describe('goBackOrHome', () => {
  it('goes back when the navigator has a previous screen', () => {
    const calls: string[] = [];
    goBackOrHome({
      canGoBack: () => true,
      back: () => calls.push('back'),
      replace: () => calls.push('replace'),
    });
    assert.deepEqual(calls, ['back']);
  });

  it('replaces to home when there is no previous screen', () => {
    const calls: string[] = [];
    goBackOrHome({
      canGoBack: () => false,
      back: () => calls.push('back'),
      replace: (href) => calls.push(`replace:${href}`),
    });
    assert.deepEqual(calls, ['replace:/']);
  });
});
