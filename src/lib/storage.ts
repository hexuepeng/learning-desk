import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSampleWords } from '../content/sampleWords.ts';
import { normalizeAlbumBooks } from './album.ts';
import { clampEnabledTypes, defaultDictationSettings } from './dictation.ts';
import { emptyStarState, normalizeStarState } from './stars.ts';
import { emptyStreak } from './streak.ts';
import type { PersistedState, PracticeEvent } from '../types/models.ts';

export const STORAGE_KEY = 'learning-desk/v1';
export const DEFAULT_PARENT_PIN = '1234';

export function defaultState(): PersistedState {
  return {
    version: 1,
    words: createSampleWords(),
    progress: {},
    dictationSettings: defaultDictationSettings(),
    feedback: [],
    albumBooks: [],
    streak: emptyStreak(),
    stars: emptyStarState(),
    practiceLog: [],
    daily: null,
    parentPin: DEFAULT_PARENT_PIN,
  };
}

function migrate(raw: unknown): PersistedState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<PersistedState>;
  return {
    ...base,
    ...data,
    version: 1,
    words: Array.isArray(data.words) ? data.words : base.words,
    progress: data.progress && typeof data.progress === 'object' ? data.progress : {},
    dictationSettings: {
      enabledTypes: clampEnabledTypes(data.dictationSettings?.enabledTypes ?? []),
      autoAdjust: data.dictationSettings?.autoAdjust ?? true,
    },
    feedback: Array.isArray(data.feedback) ? data.feedback : [],
    albumBooks: normalizeAlbumBooks(data.albumBooks),
    streak: data.streak ?? emptyStreak(),
    stars: normalizeStarState(data.stars),
    practiceLog: Array.isArray(data.practiceLog)
      ? (data.practiceLog as PracticeEvent[])
      : [],
    daily: data.daily ?? null,
    parentPin: data.parentPin?.match(/^\d{4}$/) ? data.parentPin : DEFAULT_PARENT_PIN,
  };
}

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return defaultState();
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
