import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { displayIpa, normalizeIpa, normalizeStoredWord } from './ipa.ts';

describe('ipa helpers', () => {
  it('normalizes British IPA to slashes and treats missing as empty', () => {
    assert.equal(normalizeIpa('/ˈæpl/'), '/ˈæpl/');
    assert.equal(normalizeIpa('ˈæpl'), '/ˈæpl/');
    assert.equal(normalizeIpa('  /bʊk/  '), '/bʊk/');
    assert.equal(normalizeIpa(''), '');
    assert.equal(normalizeIpa('   '), '');
    assert.equal(normalizeIpa(undefined), '');
    assert.equal(normalizeIpa(null), '');
    assert.equal(normalizeIpa(1), '');
  });

  it('displays IPA only when allowed and present', () => {
    assert.equal(displayIpa('ˈæpl', true), '/ˈæpl/');
    assert.equal(displayIpa('/ˈæpl/', false), null);
    assert.equal(displayIpa('', true), null);
    assert.equal(displayIpa(undefined, true), null);
  });

  it('fills empty ipa on stored words that predate the field', () => {
    const word = normalizeStoredWord({
      id: 'w1',
      en: 'desk',
      zh: '书桌',
      source: 'parent' as const,
      createdAt: 't',
    });
    assert.equal(word.ipa, '');
    assert.equal(normalizeStoredWord({ ...word, ipa: 'dɛsk' }).ipa, '/dɛsk/');
  });
});
