import type { StreakState } from '../types/models.ts';

import { addDays } from './util.ts';

export const STICKERS = ['⭐', '🌈', '🦊', '🎈', '🏆', '🍀', '🐱', '📘'];

export function emptyStreak(): StreakState {
  return { current: 0, lastDate: '', stickers: [] };
}

export function applyDailyComplete(streak: StreakState, today: string): StreakState {
  if (streak.lastDate === today) return streak;
  const current = streak.lastDate === addDays(today, -1) ? streak.current + 1 : 1;
  const sticker = STICKERS[(current - 1) % STICKERS.length];
  return {
    current,
    lastDate: today,
    stickers: [...streak.stickers, sticker].slice(-12),
  };
}
