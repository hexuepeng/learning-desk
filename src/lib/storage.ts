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
import { migrateContentFields } from './weekly.ts';
import { applyDefaultKetPack } from './wordImport.ts';
import {
  defaultSentenceSettings,
  normalizeSentenceProgress,
  normalizeSentenceSettings,
  normalizeSentences,
} from './sentences.ts';
import { emptyStarState, normalizeStarState } from './stars.ts';
import { emptyStreak } from './streak.ts';
import { createWriteQueue } from './operationGate.ts';
import { assertPersistedStateShape } from './stateValidation.ts';
import type { PersistedState, PracticeEvent, Word } from '../types/models.ts';

export const STORAGE_KEY = 'learning-desk/v1';
export const DEFAULT_PARENT_PIN = '1234';
export const RECOVERY_STORAGE_KEY = 'learning-desk/unreadable-state/v1';
const writes = createWriteQueue();

function blankState(words: Word[]): PersistedState {
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
    contentGroups: [],
    weeklyByProfile: {},
    dailyByProfile: {},
    legacyDaily: null,
    contentSchema: 1,
    contentMigration: { legacyDailyAttributed: true },
  };
}

export function defaultState(): PersistedState {
  const words = stampWords(createSampleWords(), DEFAULT_PROFILE_ID);
  const base = blankState(words);
  const seeded = applyDefaultKetPack(
    base.words,
    base.questByProfile[DEFAULT_PROFILE_ID] ?? emptyQuestState(),
    DEFAULT_PROFILE_ID,
  );
  return {
    ...base,
    words: seeded.words,
    questByProfile: {
      [DEFAULT_PROFILE_ID]: seeded.quest,
    },
  };
}

export function hydrateState(raw: unknown): PersistedState {
  return migrate(raw);
}

function migrate(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') return defaultState();
  const base = blankState(stampWords(createSampleWords(), DEFAULT_PROFILE_ID));
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
    ...migrateContentFields(
      {
        ...data,
        daily: data.daily ?? null,
      },
      words,
      activeProfileId,
    ),
  };
}

export async function loadState(): Promise<PersistedState> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error('暂时无法读取本机存档，请重试。原存档没有被替换。');
  }
  if (raw === null) return defaultState();
  return decodeStoredState(raw);
}

export function decodeStoredState(raw: string): PersistedState {
  try {
    const data: unknown = JSON.parse(raw);
    assertPersistedStateShape(data);
    return hydrateState(data);
  } catch {
    throw new Error('存档损坏或版本暂不支持。原存档已保留，可以重试或从备份恢复。');
  }
}

/** 用户确认恢复前留住无法读取的原文，不覆盖唯一副本。 */
export async function preserveUnreadableState(): Promise<void> {
  await writes.run(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw !== null && await AsyncStorage.getItem(RECOVERY_STORAGE_KEY) === null) {
      await AsyncStorage.setItem(RECOVERY_STORAGE_KEY, raw);
    }
  });
}

export async function saveState(state: PersistedState): Promise<void> {
  const snapshot = JSON.stringify(state);
  await writes.run(() => AsyncStorage.setItem(STORAGE_KEY, snapshot));
}

/** 恢复事务回退时保留原文，包括损坏但仍需留存的旧存档。 */
export async function restoreRawState(raw: string | null): Promise<void> {
  await writes.run(() => raw === null
    ? AsyncStorage.removeItem(STORAGE_KEY)
    : AsyncStorage.setItem(STORAGE_KEY, raw));
}

export async function clearState(): Promise<void> {
  await writes.run(() => AsyncStorage.removeItem(STORAGE_KEY));
}
