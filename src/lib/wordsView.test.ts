import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { emptyProgress } from './dictation.ts';
import { mulberry32 } from './util.ts';
import { filterWords, orderVocabDeck } from './wordsView.ts';
import type { Word } from '../types/models.ts';

const words: Word[] = ['apple', 'book', 'cat', 'dog'].map((en, index) => ({
  id: `w${index}`,
  en,
  zh: `${en}义`,
  source: 'parent',
  createdAt: 't',
}));

describe('wordsView', () => {
  it('filters by english or chinese', () => {
    assert.deepEqual(
      filterWords(words, 'BO').map((word) => word.id),
      ['w1'],
    );
    assert.deepEqual(
      filterWords(words, '义').map((word) => word.id),
      ['w0', 'w1', 'w2', 'w3'],
    );
    assert.deepEqual(filterWords(words, '   ').map((word) => word.id), ['w0', 'w1', 'w2', 'w3']);
  });

  it('puts unfamiliar words first and shuffles within groups', () => {
    const progress = {
      w0: { ...emptyProgress('w0'), vocabKnown: true },
      w2: { ...emptyProgress('w2'), vocabKnown: true },
    };
    const ordered = orderVocabDeck(words, progress, mulberry32(7));
    const unknown = ordered.slice(0, 2).map((word) => word.id).sort();
    const known = ordered.slice(2).map((word) => word.id).sort();
    assert.deepEqual(unknown, ['w1', 'w3']);
    assert.deepEqual(known, ['w0', 'w2']);
    const again = orderVocabDeck(words, progress, mulberry32(7));
    assert.deepEqual(
      again.map((word) => word.id),
      ordered.map((word) => word.id),
    );
  });
});
