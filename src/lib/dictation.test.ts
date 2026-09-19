import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyDictationResult,
  challengeModesEnabled,
  clampEnabledTypes,
  currentDictationType,
  DEFAULT_ENABLED_TYPES,
  emptyProgress,
  enabledLadder,
  isArrangeCorrect,
  isFillCorrect,
  makeArrangeTiles,
  makeFillPuzzle,
  pickWordOptions,
  withChallengeModes,
  writingHint,
} from './dictation.ts';
import { mulberry32 } from './util.ts';

const settings = {
  enabledTypes: [...DEFAULT_ENABLED_TYPES],
  autoAdjust: true,
};

describe('dictation ladder', () => {
  it('keeps ladder order and defaults', () => {
    assert.deepEqual(enabledLadder(['listen-write', 'pick-word']), [
      'pick-word',
      'listen-write',
    ]);
    assert.deepEqual(clampEnabledTypes([]), DEFAULT_ENABLED_TYPES);
  });

  it('levels up after two correct answers when auto is on', () => {
    let progress = emptyProgress('w1');
    progress = applyDictationResult(progress, true, settings, 't1');
    assert.equal(progress.dictationLevelIndex, 0);
    progress = applyDictationResult(progress, true, settings, 't2');
    assert.equal(progress.dictationLevelIndex, 1);
    assert.equal(currentDictationType(progress, settings), 'fill-letters');
  });

  it('levels down after two misses and stays put when auto is off', () => {
    let progress = { ...emptyProgress('w1'), dictationLevelIndex: 1 };
    progress = applyDictationResult(progress, false, settings, 't1');
    progress = applyDictationResult(progress, false, settings, 't2');
    assert.equal(progress.dictationLevelIndex, 0);

    const frozen = applyDictationResult(
      { ...emptyProgress('w1'), dictationLevelIndex: 0, consecutiveCorrect: 1 },
      true,
      { ...settings, autoAdjust: false },
      't3',
    );
    assert.equal(frozen.dictationLevelIndex, 0);
  });

  it('does not climb past enabled types including write/listen when they stay off', () => {
    let progress = emptyProgress('w1');
    for (let i = 0; i < 8; i += 1) {
      progress = applyDictationResult(progress, true, settings, `t${i}`);
    }
    assert.equal(currentDictationType(progress, settings), 'arrange-letters');
  });

  it('turns on both challenge modes in one tap', () => {
    const next = withChallengeModes(DEFAULT_ENABLED_TYPES);
    assert.equal(challengeModesEnabled(next), true);
    assert.ok(next.includes('write-from-chinese'));
    assert.ok(next.includes('listen-write'));
    assert.equal(writingHint('ice cream'), '2 个词，一共 8 个字母');
    assert.equal(writingHint('cat'), '3 个字母');
  });
});

describe('dictation puzzles', () => {
  it('hides some letters and checks fill answers', () => {
    const puzzle = makeFillPuzzle('cat', mulberry32(3));
    const hidden = puzzle.chars.filter((item) => item.hidden);
    assert.ok(hidden.length >= 1);
    assert.equal(isFillCorrect(puzzle, {}), false);
    const guesses: Record<number, string> = {};
    for (const item of hidden) guesses[item.index] = item.ch;
    assert.equal(isFillCorrect(puzzle, guesses), true);
  });

  it('arranges shuffled tiles back into the word', () => {
    const tiles = makeArrangeTiles('book', mulberry32(9));
    assert.equal(tiles.length, 4);
    const restored = [...'book'].map((_letter, index) => {
      const tile = tiles.find((item) => item.id.startsWith(`${index}-`));
      assert.ok(tile);
      return tile;
    });
    assert.equal(isArrangeCorrect('book', restored), true);
    assert.deepEqual(
      tiles.map((item) => item.letter).sort(),
      ['b', 'k', 'o', 'o'],
    );
  });

  it('builds unique pick-word options when the pool is large enough', () => {
    const words = ['apple', 'book', 'cat', 'dog'].map((en, index) => ({
      id: `w${index}`,
      en,
      zh: en,
      source: 'sample' as const,
      createdAt: 't',
    }));
    const options = pickWordOptions(words[0], words, 4, mulberry32(2));
    assert.equal(options.length, 4);
    assert.equal(new Set(options.map((item) => item.id)).size, 4);
    assert.ok(options.some((item) => item.id === 'w0'));
  });
});
