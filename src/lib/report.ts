import type { PracticeEvent, Word } from '../types/models.ts';

import { addDays, todayKey } from './util.ts';

export type WrongWordStat = {
  wordId: string;
  en: string;
  zh: string;
  wrong: number;
};

export type WeekReport = {
  start: string;
  end: string;
  daysPracticed: number;
  dictationCorrect: number;
  dictationTotal: number;
  accuracy: number;
  topWrong: WrongWordStat[];
};

export function startOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => Number(n));
  const dt = new Date(y, m - 1, d);
  const weekday = dt.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  dt.setDate(dt.getDate() + delta);
  return todayKey(dt);
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function buildWeekReport(
  log: PracticeEvent[],
  words: Word[],
  today = todayKey(),
): WeekReport {
  const start = startOfWeek(today);
  const dates = weekDates(start);
  const end = dates[6];
  const inWeek = log.filter((item) => dates.includes(item.date));
  const daysPracticed = new Set(inWeek.map((item) => item.date)).size;
  const dictation = inWeek.filter((item) => item.kind === 'dictation');
  const dictationCorrect = dictation.filter((item) => item.correct === true).length;
  const dictationTotal = dictation.filter((item) => item.correct === true || item.correct === false).length;
  const wrongCount = new Map<string, number>();
  for (const item of dictation) {
    if (item.correct === false) {
      wrongCount.set(item.wordId, (wrongCount.get(item.wordId) ?? 0) + 1);
    }
  }
  const byId = new Map(words.map((word) => [word.id, word]));
  const topWrong = [...wrongCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([wordId, wrong]) => {
      const word = byId.get(wordId);
      return {
        wordId,
        en: word?.en ?? wordId,
        zh: word?.zh ?? '',
        wrong,
      };
    });
  return {
    start,
    end,
    daysPracticed,
    dictationCorrect,
    dictationTotal,
    accuracy: dictationTotal === 0 ? 0 : dictationCorrect / dictationTotal,
    topWrong,
  };
}

export function formatAccuracy(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}
