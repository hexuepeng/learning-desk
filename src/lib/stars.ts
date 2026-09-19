import type { PracticeEvent, StarRating, StarState } from '../types/models.ts';

import { addDays } from './util.ts';

export const THREE_STAR_STREAK_FOR_CELEBRATION = 3;
export const PRACTICE_LOG_LIMIT = 400;
const STAR_HISTORY_DAYS = 21;

export function emptyStarState(): StarState {
  return {
    byDate: {},
    celebrationKey: null,
  };
}

export function normalizeStarState(raw: unknown): StarState {
  if (!raw || typeof raw !== 'object') return emptyStarState();
  const data = raw as Partial<StarState> & {
    lastRatedDate?: string;
    lastStars?: StarRating | null;
    consecutiveThreeStarDays?: number;
  };
  const byDate: Record<string, StarRating> = {};
  if (data.byDate && typeof data.byDate === 'object') {
    for (const [date, stars] of Object.entries(data.byDate)) {
      if (stars === 1 || stars === 2 || stars === 3) byDate[date] = stars;
    }
  } else if (data.lastRatedDate && (data.lastStars === 1 || data.lastStars === 2 || data.lastStars === 3)) {
    byDate[data.lastRatedDate] = data.lastStars;
  }
  return {
    byDate,
    celebrationKey: typeof data.celebrationKey === 'string' ? data.celebrationKey : null,
  };
}

/** 整轮默写：全对 3★，错 1–2 个 2★，否则 1★。 */
export function starsForSession(correct: number, wrong: number): StarRating {
  if (correct + wrong <= 0) return 1;
  if (wrong === 0) return 3;
  if (wrong <= 2) return 2;
  return 1;
}

export function countSession(
  log: PracticeEvent[],
  date: string,
  source: PracticeEvent['source'],
): { correct: number; wrong: number } {
  const items = log.filter(
    (item) => item.date === date && item.kind === 'dictation' && item.source === source,
  );
  return {
    correct: items.filter((item) => item.correct === true).length,
    wrong: items.filter((item) => item.correct === false).length,
  };
}

export function consecutiveThreeStarDays(
  byDate: Record<string, StarRating>,
  date: string,
): number {
  let count = 0;
  let cursor = date;
  while (byDate[cursor] === 3) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function todaysStars(state: StarState, date: string): StarRating | null {
  return state.byDate[date] ?? null;
}

export function applySessionStars(
  state: StarState,
  date: string,
  stars: StarRating,
): { next: StarState; celebrate: boolean } {
  const current = state.byDate[date];
  const best = (current == null ? stars : (Math.max(current, stars) as StarRating));
  if (current === best) return { next: state, celebrate: false };

  const byDate = trimStarHistory({ ...state.byDate, [date]: best }, date);
  const consecutive = consecutiveThreeStarDays(byDate, date);
  const celebrationKey = `${date}:${consecutive}`;
  const celebrate =
    consecutive >= THREE_STAR_STREAK_FOR_CELEBRATION && state.celebrationKey !== celebrationKey;

  return {
    next: {
      byDate,
      celebrationKey: celebrate ? celebrationKey : state.celebrationKey,
    },
    celebrate,
  };
}

function trimStarHistory(
  byDate: Record<string, StarRating>,
  today: string,
): Record<string, StarRating> {
  const keep = new Set<string>();
  for (let i = 0; i < STAR_HISTORY_DAYS; i += 1) keep.add(addDays(today, -i));
  const next: Record<string, StarRating> = {};
  for (const [date, stars] of Object.entries(byDate)) {
    if (keep.has(date)) next[date] = stars;
  }
  return next;
}

export function starsLabel(stars: StarRating): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function shouldShowThreeStarCelebration(state: StarState, date: string): boolean {
  return (
    consecutiveThreeStarDays(state.byDate, date) >= THREE_STAR_STREAK_FOR_CELEBRATION &&
    (state.celebrationKey?.startsWith(`${date}:`) ?? false)
  );
}

export function capPracticeLog(log: PracticeEvent[]): PracticeEvent[] {
  return log.length <= PRACTICE_LOG_LIMIT ? log : log.slice(0, PRACTICE_LOG_LIMIT);
}
