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
