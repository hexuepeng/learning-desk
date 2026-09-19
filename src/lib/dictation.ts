import type { DictationSettings, DictationType, Word, WordProgress } from '../types/models.ts';

import { shuffle } from './util.ts';

export const DICTATION_LADDER: DictationType[] = [
  'pick-word',
  'fill-letters',
  'arrange-letters',
  'write-from-chinese',
  'listen-write',
];

export const DEFAULT_ENABLED_TYPES: DictationType[] = [
  'pick-word',
  'fill-letters',
  'arrange-letters',
];

export const CHALLENGE_TYPES: DictationType[] = ['write-from-chinese', 'listen-write'];

export function withChallengeModes(enabled: DictationType[]): DictationType[] {
  return clampEnabledTypes([...enabled, ...CHALLENGE_TYPES]);
}

export function challengeModesEnabled(enabled: DictationType[]): boolean {
  return CHALLENGE_TYPES.every((type) => enabled.includes(type));
}

export function writingHint(word: string): string {
  const letters = [...word].filter((ch) => /[a-zA-Z]/.test(ch)).length;
  const parts = word.trim().split(/\s+/).filter(Boolean).length;
  return parts > 1 ? `${parts} 个词，一共 ${letters} 个字母` : `${letters} 个字母`;
}

export const AUTO_ADJUST_THRESHOLD = 2;

export const DICTATION_TYPE_LABELS: Record<DictationType, { zh: string; hint: string }> = {
  'pick-word': { zh: '选单词', hint: '看中文，选出正确的英语单词' },
  'fill-letters': { zh: '填字母', hint: '把缺的字母补上' },
  'arrange-letters': { zh: '排字母', hint: '把字母排成正确的单词' },
  'write-from-chinese': { zh: '看中文写', hint: '看着中文写出英语单词' },
  'listen-write': { zh: '听写', hint: '听发音，写出英语单词' },
};

export function defaultDictationSettings(): DictationSettings {
  return {
    enabledTypes: [...DEFAULT_ENABLED_TYPES],
    autoAdjust: true,
  };
}

export function enabledLadder(enabled: DictationType[]): DictationType[] {
  const set = new Set(enabled);
  return DICTATION_LADDER.filter((type) => set.has(type));
}

export function clampEnabledTypes(enabled: DictationType[]): DictationType[] {
  const next = enabledLadder(enabled);
  return next.length > 0 ? next : [...DEFAULT_ENABLED_TYPES];
}

export function emptyProgress(wordId: string): WordProgress {
  return {
    wordId,
    vocabSeen: 0,
    vocabKnown: false,
    dictationLevelIndex: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
  };
}

export function currentDictationType(
  progress: WordProgress,
  settings: DictationSettings,
): DictationType {
  const ladder = enabledLadder(settings.enabledTypes);
  if (ladder.length === 0) return 'pick-word';
  const index = Math.min(Math.max(0, progress.dictationLevelIndex), ladder.length - 1);
  return ladder[index];
}

export function applyDictationResult(
  progress: WordProgress,
  correct: boolean,
  settings: DictationSettings,
  practicedAt: string,
): WordProgress {
  const ladder = enabledLadder(settings.enabledTypes);
  const maxIndex = Math.max(0, ladder.length - 1);
  let levelIndex = Math.min(Math.max(0, progress.dictationLevelIndex), maxIndex);
  let consecutiveCorrect = correct ? progress.consecutiveCorrect + 1 : 0;
  let consecutiveWrong = correct ? 0 : progress.consecutiveWrong + 1;

  if (settings.autoAdjust && ladder.length > 0) {
    if (correct && consecutiveCorrect >= AUTO_ADJUST_THRESHOLD && levelIndex < maxIndex) {
      levelIndex += 1;
      consecutiveCorrect = 0;
    } else if (!correct && consecutiveWrong >= AUTO_ADJUST_THRESHOLD && levelIndex > 0) {
      levelIndex -= 1;
      consecutiveWrong = 0;
    }
  }

  return {
    ...progress,
    dictationLevelIndex: levelIndex,
    consecutiveCorrect,
    consecutiveWrong,
    lastPracticedAt: practicedAt,
  };
}

export type FillPuzzle = {
  chars: Array<{ ch: string; hidden: boolean; index: number }>;
  missing: string[];
};

export function makeFillPuzzle(word: string, random: () => number = Math.random): FillPuzzle {
  const chars = [...word];
  const letterIndexes = chars
    .map((ch, index) => ({ ch, index }))
    .filter((item) => /[a-zA-Z]/.test(item.ch));
  const hideCount =
    letterIndexes.length <= 1
      ? letterIndexes.length
      : Math.max(1, Math.min(letterIndexes.length - 1, Math.ceil(letterIndexes.length * 0.4)));
  const hiddenSet = new Set(
    shuffle(letterIndexes, random)
      .slice(0, hideCount)
      .map((item) => item.index),
  );
  const puzzleChars = chars.map((ch, index) => ({
    ch,
    hidden: hiddenSet.has(index),
    index,
  }));
  return {
    chars: puzzleChars,
    missing: puzzleChars.filter((item) => item.hidden).map((item) => item.ch.toLowerCase()),
  };
}

export function fillChoices(missing: string[], random: () => number = Math.random): string[] {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const needed = [...new Set(missing.map((ch) => ch.toLowerCase()))];
  const extras = shuffle(
    alphabet.filter((ch) => !needed.includes(ch)),
    random,
  ).slice(0, Math.max(3, 8 - needed.length));
  return shuffle([...needed, ...extras], random);
}

export type LetterTile = { id: string; letter: string };

export function makeArrangeTiles(word: string, random: () => number = Math.random): LetterTile[] {
  const tiles = [...word.toLowerCase()].map((letter, index) => ({
    id: `${index}-${letter}`,
    letter,
  }));
  return shuffle(tiles, random);
}

export function arrangedWord(tiles: Array<LetterTile | null>): string {
  return tiles.map((tile) => tile?.letter ?? '').join('');
}

export function pickWordOptions(
  word: Word,
  pool: Word[],
  count = 4,
  random: () => number = Math.random,
): Word[] {
  const others = shuffle(
    pool.filter((item) => item.id !== word.id && item.en.toLowerCase() !== word.en.toLowerCase()),
    random,
  );
  const options = [word, ...others].slice(0, count);
  while (options.length < count) {
    options.push(word);
  }
  return shuffle(options, random);
}

export function isArrangeCorrect(word: string, tiles: Array<LetterTile | null>): boolean {
  if (tiles.some((tile) => tile == null)) return false;
  return arrangedWord(tiles) === word.toLowerCase();
}

export function isFillCorrect(
  puzzle: FillPuzzle,
  guesses: Record<number, string>,
): boolean {
  return puzzle.chars.every((item) => {
    if (!item.hidden) return true;
    const guess = guesses[item.index];
    return (guess ?? '').toLowerCase() === item.ch.toLowerCase();
  });
}
