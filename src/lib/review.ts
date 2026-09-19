import type { PracticeEvent, Word, WordProgress } from '../types/models.ts';

export const REVIEW_MINUTES = 5;
export const REVIEW_SIZE = 8;

export function pickReviewWords(
  words: Word[],
  progress: Record<string, WordProgress>,
  log: PracticeEvent[],
  limit = REVIEW_SIZE,
): Word[] {
  const score = new Map<string, number>();
  for (const word of words) {
    const wrong = progress[word.id]?.consecutiveWrong ?? 0;
    if (wrong > 0) score.set(word.id, wrong * 10);
  }
  for (const event of log) {
    if (event.kind !== 'dictation' || event.correct !== false) continue;
    score.set(event.wordId, (score.get(event.wordId) ?? 0) + 1);
  }
  return [...words]
    .filter((word) => (score.get(word.id) ?? 0) > 0)
    .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0))
    .slice(0, Math.min(limit, words.length));
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const REVIEW_CLEAR_STREAK = 2;

export type ReviewSession = {
  remainingIds: string[];
  streaks: Record<string, number>;
  cleared: boolean;
};

export function createReviewSession(words: Word[]): ReviewSession {
  const remainingIds = words.map((word) => word.id);
  return {
    remainingIds,
    streaks: {},
    cleared: remainingIds.length === 0,
  };
}

export function currentReviewWordId(session: ReviewSession): string | null {
  return session.remainingIds[0] ?? null;
}

/** 本轮连对两次就移出队列；答错清零并排到队尾。全清则可提前结束。 */
export function applyReviewAnswer(
  session: ReviewSession,
  wordId: string,
  correct: boolean,
  need = REVIEW_CLEAR_STREAK,
): ReviewSession {
  const rest = session.remainingIds.filter((id) => id !== wordId);
  const streaks = { ...session.streaks };
  if (!correct) {
    streaks[wordId] = 0;
    return { remainingIds: [...rest, wordId], streaks, cleared: false };
  }
  streaks[wordId] = (streaks[wordId] ?? 0) + 1;
  if (streaks[wordId] >= need) {
    return { remainingIds: rest, streaks, cleared: rest.length === 0 };
  }
  return { remainingIds: [...rest, wordId], streaks, cleared: false };
}
