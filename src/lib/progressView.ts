import type { DictationSettings, DictationType, Word, WordProgress } from '../types/models.ts';

import { currentDictationType, DICTATION_LADDER, emptyProgress } from './dictation.ts';

export type ProgressBucket = {
  type: DictationType;
  count: number;
};

export type ProgressSummary = {
  total: number;
  known: number;
  unfamiliar: number;
  byType: ProgressBucket[];
};

export function summarizeProgress(
  words: Word[],
  progress: Record<string, WordProgress>,
  settings: DictationSettings,
): ProgressSummary {
  const counts = new Map<DictationType, number>(DICTATION_LADDER.map((type) => [type, 0]));
  let known = 0;
  for (const word of words) {
    const item = progress[word.id] ?? emptyProgress(word.id);
    if (item.vocabKnown) known += 1;
    const type = currentDictationType(item, settings);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return {
    total: words.length,
    known,
    unfamiliar: words.length - known,
    byType: DICTATION_LADDER.map((type) => ({ type, count: counts.get(type) ?? 0 })),
  };
}
