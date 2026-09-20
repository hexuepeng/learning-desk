import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSampleWords } from '../content/sampleWords.ts';
import { normalizeAlbumBooks } from './album.ts';
import { clampEnabledTypes, defaultDictationSettings } from './dictation.ts';
import { normalizeFeedbackList } from './feedback.ts';
import {
  DEFAULT_PROFILE_ID,
  normalizeProfiles,
  profileIdOf,
  resolveActiveProfileId,
  stampBooks,
  stampSentences,
  stampWords,
} from './profile.ts';
import { normalizeStoredWords } from './ipa.ts';
import {
  emptyQuestState,
  hydrateQuestPacks,
  normalizeQuestByProfile,
} from './quest.ts';
import {
  defaultSentenceSettings,
  normalizeSentenceProgress,
  normalizeSentenceSettings,
  normalizeSentences,
} from './sentences.ts';
import { emptyStarState, normalizeStarState } from './stars.ts';
import { emptyStreak } from './streak.ts';
import type { PersistedState, PracticeEvent, Word } from '../types/models.ts';

export const STORAGE_KEY = 'learning-desk/v1';
export const DEFAULT_PARENT_PIN = '1234';

export function defaultState(): PersistedState {
  const words = stampWords(createSampleWords(), DEFAULT_PROFILE_ID);
  return {
    version: 1,
    words,
    progress: {},
    dictationSettings: defaultDictationSettings(),
    showIpa: true,
    feedback: [],
    albumBooks: [],
    sentences: [],
    sentenceProgress: {},
    sentenceSettings: defaultSentenceSettings(),
    streak: emptyStreak(),
    stars: emptyStarState(),
    practiceLog: [],
    daily: null,
    parentPin: DEFAULT_PARENT_PIN,
    profiles: normalizeProfiles(null),
    activeProfileId: DEFAULT_PROFILE_ID,
    questByProfile: {
      [DEFAULT_PROFILE_ID]: {
        ...emptyQuestState(),
        packWordIds: words.filter((word) => word.ketPack).map((word) => word.id),
      },
    },
  };
}

export function hydrateState(raw: unknown): PersistedState {
  return migrate(raw);
}

function migrate(raw: unknown): PersistedState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<PersistedState>;
  const profiles = normalizeProfiles(data.profiles);
  const activeProfileId = resolveActiveProfileId(
    profiles,
    data.activeProfileId ?? DEFAULT_PROFILE_ID,
  );
  const words = stampWords(
    normalizeStoredWords(Array.isArray(data.words) ? (data.words as Word[]) : base.words).map(
      (word) => (word.ketPack ? { ...word, ketPack: true } : word),
    ),
    DEFAULT_PROFILE_ID,
  );
  return {
    ...base,
    ...data,
    version: 1,
    words,
    progress: data.progress && typeof data.progress === 'object' ? data.progress : {},
    showIpa: data.showIpa !== false,
    dictationSettings: {
      enabledTypes: clampEnabledTypes(data.dictationSettings?.enabledTypes ?? []),
      autoAdjust: data.dictationSettings?.autoAdjust ?? true,
    },
    feedback: normalizeFeedbackList(data.feedback),
    albumBooks: stampBooks(normalizeAlbumBooks(data.albumBooks), DEFAULT_PROFILE_ID),
    sentences: stampSentences(normalizeSentences(data.sentences), DEFAULT_PROFILE_ID),
    sentenceProgress: normalizeSentenceProgress(data.sentenceProgress),
    sentenceSettings: normalizeSentenceSettings(data.sentenceSettings),
    streak: data.streak ?? emptyStreak(),
    stars: normalizeStarState(data.stars),
    practiceLog: Array.isArray(data.practiceLog) ? (data.practiceLog as PracticeEvent[]) : [],
    daily: data.daily ?? null,
    parentPin: data.parentPin?.match(/^\d{4}$/) ? data.parentPin : DEFAULT_PARENT_PIN,
    profiles,
    activeProfileId,
    questByProfile: hydrateQuestPacks(
      normalizeQuestByProfile(data.questByProfile),
      words,
      profileIdOf,
    ),
  };
}

export async function loadState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return hydrateState(JSON.parse(raw) as unknown);
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
