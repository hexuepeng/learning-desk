import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseBackup, serializeBackup } from './backup.ts';
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
});
