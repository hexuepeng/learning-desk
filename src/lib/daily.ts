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
  const detail = dailyProgressDetail(daily);
  return { done: detail.done, total: detail.total };
}

export type DailyProgressDetail = {
  vocabDone: number;
  vocabTotal: number;
  dictationDone: number;
  dictationTotal: number;
  done: number;
  total: number;
};

export function dailyProgressDetail(daily: DailyLesson | null): DailyProgressDetail {
  if (!daily) {
    return {
      vocabDone: 0,
      vocabTotal: 0,
      dictationDone: 0,
      dictationTotal: 0,
      done: 0,
      total: 0,
    };
  }
  const vocabTotal = daily.vocabWordIds.length;
  const dictationTotal = daily.dictationWordIds.length;
  const vocabDone = Math.min(daily.completedVocabIds.length, vocabTotal);
  const dictationDone = Math.min(daily.completedDictationIds.length, dictationTotal);
  const total = vocabTotal + dictationTotal;
  return {
    vocabDone,
    vocabTotal,
    dictationDone,
    dictationTotal,
    done: Math.min(vocabDone + dictationDone, total),
    total,
  };
}

export function formatDailyProgress(daily: DailyLesson | null): string {
  const { vocabDone, vocabTotal, dictationDone, dictationTotal } = dailyProgressDetail(daily);
  return `背词 ${vocabDone}/${vocabTotal} · 默写 ${dictationDone}/${dictationTotal}`;
}

/** 错得越多越该进今日默写。 */
export function dictationPriority(progress: WordProgress | undefined): number {
  const wrong = progress?.consecutiveWrong ?? 0;
  const unknown = progress?.vocabKnown ? 0 : 1;
  return wrong * 10 + unknown;
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
  const take = Math.min(size, words.length);
  const missed = [...words]
    .filter((word) => (progress[word.id]?.consecutiveWrong ?? 0) > 0)
    .sort(
      (a, b) => (progress[b.id]?.consecutiveWrong ?? 0) - (progress[a.id]?.consecutiveWrong ?? 0),
    );
  const reserved = missed.slice(0, take);
  const reservedIds = new Set(reserved.map((word) => word.id));
  const rest = words
    .filter((word) => !reservedIds.has(word.id))
    .sort((a, b) => {
      const pa = progress[a.id];
      const pb = progress[b.id];
      const seen = (pa?.vocabSeen ?? 0) - (pb?.vocabSeen ?? 0);
      if (seen !== 0) return seen;
      return recencyScore(pa) - recencyScore(pb);
    });
  const need = take - reserved.length;
  const head = rest.slice(0, Math.min(Math.max(need * 2, need), rest.length));
  return [...reserved, ...shuffle(head, random).slice(0, need)];
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
  const halves = assignDailyHalves(selected, progress);
  const vocabWordIds = halves.vocab.map((word) => word.id);
  const dictationWordIds = halves.dictation.map((word) => word.id);
  return {
    date,
    vocabWordIds,
    dictationWordIds,
    completedVocabIds: [],
    completedDictationIds: [],
  };
}

export function assignDailyHalves(
  selected: Word[],
  progress: Record<string, WordProgress>,
): { vocab: Word[]; dictation: Word[] } {
  if (selected.length === 0) return { vocab: [], dictation: [] };
  if (selected.length === 1) return { vocab: selected, dictation: selected };
  const n = selected.length;
  const vocabCount = Math.max(1, Math.ceil(n / 2));
  const dictationCount = Math.max(1, Math.floor(n / 2));
  const byNeed = [...selected].sort(
    (a, b) => dictationPriority(progress[b.id]) - dictationPriority(progress[a.id]),
  );
  const dictation = byNeed.slice(0, dictationCount);
  const taken = new Set(dictation.map((word) => word.id));
  const vocab = [
    ...selected.filter((word) => !taken.has(word.id)),
    ...selected.filter((word) => taken.has(word.id)),
  ].slice(0, vocabCount);
  return { vocab, dictation };
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

export function addWordToDaily(daily: DailyLesson, wordId: string): DailyLesson {
  if (daily.vocabWordIds.includes(wordId) || daily.dictationWordIds.includes(wordId)) {
    return daily;
  }
  return { ...daily, vocabWordIds: [...daily.vocabWordIds, wordId] };
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
