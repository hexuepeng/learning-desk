import type { Word, WordProgress } from '../types/models.ts';

import { shuffle } from './util.ts';

export function filterWords(words: Word[], query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return words;
  return words.filter(
    (word) => word.en.toLowerCase().includes(q) || word.zh.toLowerCase().includes(q),
  );
}

/** 还不熟的词优先，组内打乱，避免总是从词表第一个开始。 */
export function orderVocabDeck(
  words: Word[],
  progress: Record<string, WordProgress>,
  random: () => number = Math.random,
): Word[] {
  const unknown: Word[] = [];
  const known: Word[] = [];
  for (const word of words) {
    if (progress[word.id]?.vocabKnown) known.push(word);
    else unknown.push(word);
  }
  return [...shuffle(unknown, random), ...shuffle(known, random)];
}
