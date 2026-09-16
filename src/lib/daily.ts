import type { DailyLesson, Word, WordProgress } from '../types/models.ts';

import { shuffle, todayKey } from './util.ts';

export const DAILY_SIZE = 6;

export function isDailyComplete(daily: DailyLesson | null): boolean {
  if (!daily) return false;
  const vocabDone = daily.vocabWordIds.every((id) => daily.completedVocabIds.includes(id));
  const dictationDone = daily.dictationWordIds.every((id) =>
    daily.completedDictationIds.includes(id),
  );
  return vocabDone && dictationDone && daily.vocabWordIds.length + daily.dictationWordIds.length > 0;
}

export function dailyProgress(daily: DailyLesson | null): { done: number; total: number } {
  if (!daily) return { done: 0, total: 0 };
  const total = daily.vocabWordIds.length + daily.dictationWordIds.length;
  const done = daily.completedVocabIds.length + daily.completedDictationIds.length;
  return { done: Math.min(done, total), total };
}

function recencyScore(progress: WordProgress | undefined): number {
  if (!progress?.lastPracticedAt) return 0;
  return Date.parse(progress.lastPracticedAt) || 0;
}

export function pickDailyWords(
  words: Word[],
  progress: Record<string, WordProgress>,
  size = DAILY_SIZE,
  random: () => number = Math.random,
): Word[] {
  if (words.length === 0) return [];
  const ranked = [...words].sort((a, b) => {
    const pa = progress[a.id];
    const pb = progress[b.id];
    const seen = (pa?.vocabSeen ?? 0) - (pb?.vocabSeen ?? 0);
    if (seen !== 0) return seen;
    return recencyScore(pa) - recencyScore(pb);
  });
  const take = Math.min(size, ranked.length);
  const head = ranked.slice(0, Math.min(take * 2, ranked.length));
  return shuffle(head, random).slice(0, take);
}

/** 今日卡：一半背词、一半默写。词不够时允许两侧复用。 */
export function buildDailyLesson(
  words: Word[],
  progress: Record<string, WordProgress>,
  date = todayKey(),
  size = DAILY_SIZE,
  random: () => number = Math.random,
): DailyLesson {
  const selected = pickDailyWords(words, progress, size, random);
  if (selected.length === 0) {
    return {
      date,
      vocabWordIds: [],
      dictationWordIds: [],
      completedVocabIds: [],
      completedDictationIds: [],
    };
  }
  const n = selected.length;
  const vocabCount = Math.max(1, Math.ceil(n / 2));
  const dictationCount = Math.max(1, Math.floor(n / 2));
  const vocabWordIds = selected.slice(0, vocabCount).map((word) => word.id);
  const dictationSource =
    n === 1 ? selected : selected.slice(vocabCount, vocabCount + dictationCount);
  const dictationWordIds = (dictationSource.length > 0 ? dictationSource : selected.slice(0, 1)).map(
    (word) => word.id,
  );
  return {
    date,
    vocabWordIds,
    dictationWordIds,
    completedVocabIds: [],
    completedDictationIds: [],
  };
}

export function ensureTodayLesson(
  current: DailyLesson | null,
  words: Word[],
  progress: Record<string, WordProgress>,
  date = todayKey(),
  random: () => number = Math.random,
): DailyLesson {
  if (current?.date === date && (current.vocabWordIds.length > 0 || words.length === 0)) {
    return current;
  }
  return buildDailyLesson(words, progress, date, DAILY_SIZE, random);
}

export function markVocabDone(daily: DailyLesson, wordId: string): DailyLesson {
  if (daily.completedVocabIds.includes(wordId)) return daily;
  return { ...daily, completedVocabIds: [...daily.completedVocabIds, wordId] };
}

export function markDictationDone(daily: DailyLesson, wordId: string): DailyLesson {
  if (daily.completedDictationIds.includes(wordId)) return daily;
  return { ...daily, completedDictationIds: [...daily.completedDictationIds, wordId] };
}

export function nextDailyStep(
  daily: DailyLesson,
): { kind: 'vocab' | 'dictation'; wordId: string } | { kind: 'done' } {
  const vocabNext = daily.vocabWordIds.find((id) => !daily.completedVocabIds.includes(id));
  if (vocabNext) return { kind: 'vocab', wordId: vocabNext };
  const dictationNext = daily.dictationWordIds.find(
    (id) => !daily.completedDictationIds.includes(id),
  );
  if (dictationNext) return { kind: 'dictation', wordId: dictationNext };
  return { kind: 'done' };
}
