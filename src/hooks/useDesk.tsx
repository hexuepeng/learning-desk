import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { FAMILY_KET_PACK_TEXT } from '@/content/familyKetPack';
import { createSampleWords } from '@/content/sampleWords';
import { applyPowerUp1UnitImport } from '@/lib/powerUp1';
import { applySentenceListImport } from '@/lib/sentenceImport';
import { applyWordListImport, seedDefaultKetPackIfEmpty } from '@/lib/wordImport';
import {
  addPageToBook,
  buildAlbumBook,
  buildAlbumPage,
  patchPageInBook,
  removeAlbumBookById,
  removePageFromBook,
  replaceBook,
  upsertAlbumBook,
} from '@/lib/album';
import {
  clearAllAlbumFiles,
  deleteAlbumBookFiles,
  deleteAlbumPhoto,
  persistAlbumPhoto,
} from '@/lib/albumFiles';
import {
  albumPageRecordingRelativePath,
  guessAudioExt,
  sentenceRecordingRelativePath,
  wordRecordingRelativePath,
} from '@/lib/recording';
import {
  clearAllRecordingFiles,
  deleteAlbumBookRecordings,
  deleteRecordingFile,
  persistRecordingFile,
} from '@/lib/recordingFiles';
import {
  clampEnabledTypes,
  currentDictationType,
  emptyProgress,
  applyDictationResult,
  withChallengeModes,
} from '@/lib/dictation';
import {
  addWordToDaily,
  isDailyComplete,
  markDictationDone,
  markVocabDone,
} from '@/lib/daily';
import {
  acceptDailyClaim,
  addWordToContentGroups,
  applyGlossCorrections,
  commitWeeklySelection,
  createContentGroup,
  detachWord,
  findProfileWord,
  importProofreadPack,
  removeContentGroup,
  resolveActiveLearningDay,
  setWeeklyReadiness,
  withActiveDaily,
  type DailyClaim,
} from '@/lib/weekly';
import { PROOFREAD_STARTER } from '@/content/proofreadStarterPack';
import { normalizeIpa } from '@/lib/ipa';
import { normalizeSentenceKey } from '@/lib/parseSentenceList';
import {
  profileIdOf,
  projectProfile,
  renameProfile,
  resolveActiveProfileId,
  setProfileArchived,
  wordsForProfile,
} from '@/lib/profile';
import {
  applyQuestAnswer,
  clampQuestNewCount,
  ensureQuestDay,
  isSampleKetEn,
  mergeKetPackIds,
  patchQuest,
  pruneQuestWord,
  questOf,
  setWordInKetPack,
  type QuestAnswerInput,
} from '@/lib/quest';
import {
  composeSentenceDrafts as buildSentenceDrafts,
  linkSentenceWordIds,
  markSentenceCanSay as applySentenceCanSay,
  markSentenceHeard as applySentenceHeard,
  normalizeTags,
  parseTagInput,
  type SentenceDraft,
} from '@/lib/sentences';
import {
  applySessionStars,
  capPracticeLog,
  countSession,
  starsForSession,
} from '@/lib/stars';
import { clearState, defaultState, loadState, preserveUnreadableState, saveState } from '@/lib/storage';
import { createOperationGate } from '@/lib/operationGate';
import { hasPendingBackupRestore, recoverInterruptedBackupRestore } from '@/lib/backupFiles';
import { applyDailyComplete } from '@/lib/streak';
import { createId, todayKey } from '@/lib/util';
import { buildFeedbackText } from '@/lib/feedback';
import type {
  AlbumBook,
  AlbumPage,
  DictationType,
  FeedbackKind,
  PersistedState,
  PracticeEvent,
  Profile,
  QuestNewCount,
  QuestState,
  Sentence,
  StarRating,
  WeeklyReadiness,
  WeeklySelection,
  Word,
  WordProgress,
} from '@/types/models';

type DeskContextValue = {
  ready: boolean;
  loadError: string | null;
  saveError: string | null;
  backupBusy: boolean;
  retryLoad: () => Promise<void>;
  retrySave: () => Promise<void>;
  state: PersistedState;
  profiles: Profile[];
  activeProfileId: string;
  renameActiveProfile: (name: string) => void;
  addProfile: (name: string) => string | null;
  switchProfile: (id: string) => void;
  archiveProfile: (id: string) => void;
  parentUnlocked: boolean;
  unlockParent: (pin: string) => boolean;
  lockParent: () => void;
  changePin: (pin: string) => boolean;
  upsertWord: (input: { id?: string; en: string; zh: string; ipa?: string; ketPack?: boolean }) => void;
  setShowIpa: (on: boolean) => void;
  removeWord: (id: string) => void;
  setWordKetPack: (id: string, on: boolean) => void;
  setWordRecording: (wordId: string, sourceUri: string | null) => Promise<void>;
  importWordText: (
    text: string,
    mode?: 'append' | 'replace',
    options?: { ketPack?: boolean; rebuildPack?: boolean },
  ) => { added: number; skipped: number; packAdded: number };
  importFamilyKetPack: () => { added: number; skipped: number; packAdded: number };
  importPowerUp1Unit: (
    unitId: number,
    options?: { includeSentences?: boolean },
  ) => {
    added: number;
    skipped: number;
    packAdded: number;
    sentencesAdded: number;
    sentencesSkipped: number;
  };
  setQuestDailyNewCount: (count: QuestNewCount) => void;
  seedSampleKetPack: () => void;
  touchQuestDay: () => void;
  submitQuestAnswer: (input: QuestAnswerInput) => Promise<void>;
  quest: QuestState;
  upsertSentence: (input: { id?: string; en: string; zh?: string; tags?: string | string[] }) => void;
  removeSentence: (id: string) => void;
  importSentenceText: (text: string, mode?: 'append' | 'replace') => { added: number; skipped: number };
  setSentenceRecording: (sentenceId: string, sourceUri: string | null) => Promise<void>;
  composeSentenceDrafts: () => SentenceDraft[];
  saveSentenceDrafts: (drafts: Array<{ en: string; zh?: string }>) => { added: number; skipped: number };
  markSentenceHeard: (id: string) => void;
  markSentenceCanSay: (id: string) => void;
  addBookWordToToday: (en: string, zh: string) => 'added' | 'already';
  restoreSampleWords: () => void;
  setDictationType: (type: DictationType, on: boolean) => void;
  setAutoAdjust: (on: boolean) => void;
  enableChallengeModes: () => void;
  saveWeeklySelection: (selection: WeeklySelection) => void;
  setWeeklyWordReadiness: (wordId: string, readiness: WeeklyReadiness) => void;
  createWordGroup: (name: string) => void;
  addSelectedWordsToGroup: (groupId: string, wordIds: string[]) => void;
  removeWordGroup: (groupId: string) => void;
  importProofreadStarter: () => { added: number; linked: number };
  applyWordGlossCorrections: (picks: Array<{ wordId: string; suggested: string }>) => void;
  markVocab: (wordId: string, known: boolean, daily?: boolean, claim?: DailyClaim) => void;
  markDictation: (
    wordId: string,
    correct: boolean,
    daily?: boolean,
    source?: PracticeEvent['source'],
    claim?: DailyClaim,
  ) => WordProgress;
  awardDictationStars: (correct: number, wrong: number) => { stars: StarRating; celebrate: boolean };
  addFeedback: (kind: FeedbackKind, note?: string) => void;
  markFeedbackRead: (id: string) => void;
  markFeedbackHandled: (id: string) => void;
  addAlbumBook: (book: Omit<AlbumBook, 'id' | 'createdAt'> & { id?: string }) => Promise<string>;
  updateAlbumBook: (id: string, patch: { title?: string }) => void;
  addAlbumPage: (
    bookId: string,
    page: Omit<AlbumPage, 'id'> & { id?: string },
  ) => Promise<string | null>;
  updateAlbumPage: (
    bookId: string,
    pageId: string,
    patch: Partial<Pick<AlbumPage, 'caption' | 'captionZh' | 'photoUri' | 'recordingUri'>>,
  ) => void;
  setAlbumPageRecording: (
    bookId: string,
    pageId: string,
    sourceUri: string | null,
  ) => Promise<void>;
  removeAlbumPage: (bookId: string, pageId: string) => Promise<void>;
  removeAlbumBook: (id: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  exportSnapshot: () => PersistedState;
  replaceState: (next: PersistedState) => Promise<void>;
  withBackupSnapshot: <T>(work: (snapshot: PersistedState) => Promise<T>) => Promise<T>;
  progressFor: (wordId: string) => WordProgress;
  dictationTypeFor: (wordId: string) => DictationType;
};

const DeskContext = createContext<DeskContextValue | null>(null);

function settleDay(current: PersistedState): PersistedState {
  return resolveActiveLearningDay(withEnsuredQuest(current), todayKey());
}

function withEnsuredQuest(current: PersistedState): PersistedState {
  const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
  const existing = new Set(wordsForProfile(current.words, profileId).map((word) => word.id));
  const quest = ensureQuestDay(questOf(current.questByProfile, profileId), existing);
  return {
    ...current,
    questByProfile: patchQuest(current.questByProfile ?? {}, profileId, quest),
  };
}

function withActiveQuest(
  current: PersistedState,
  recipe: (quest: QuestState) => QuestState,
): PersistedState {
  const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
  const existing = new Set(wordsForProfile(current.words, profileId).map((word) => word.id));
  const quest = ensureQuestDay(recipe(questOf(current.questByProfile, profileId)), existing);
  return {
    ...current,
    questByProfile: patchQuest(current.questByProfile ?? {}, profileId, quest),
  };
}

export function DeskProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PersistedState>(defaultState);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const stateRef = useRef(state);
  const readyRef = useRef(false);
  const loadErrorRef = useRef(false);
  const loading = useRef(false);
  const backupTransaction = useRef<{ replaced: boolean } | null>(null);
  const gate = useRef(createOperationGate()).current;

  const publish = useCallback((next: PersistedState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const retryLoad = useCallback(async () => {
    if (loading.current || gate.blocked) return;
    loading.current = true;
    try {
      await recoverInterruptedBackupRestore();
      const loaded = seedDefaultKetPackIfEmpty(await loadState());
      const dated = settleDay(loaded);
      await saveState(dated);
      publish(dated);
      loadErrorRef.current = false;
      setLoadError(null);
      readyRef.current = true;
      setReady(true);
    } catch (error) {
      readyRef.current = false;
      setReady(false);
      loadErrorRef.current = true;
      setLoadError(error instanceof Error ? error.message : '无法读取本机存档，请重试或恢复备份。');
    } finally {
      loading.current = false;
    }
  }, [gate, publish]);

  useEffect(() => { void retryLoad(); }, [retryLoad]);

  // 已登记的媒体操作可在备份等待它结束时完成状态更新。
  const updateFromMedia = useCallback((recipe: (current: PersistedState) => PersistedState) => {
    const next = recipe(stateRef.current);
    if (next === stateRef.current) return;
    publish(next);
    void saveState(next).then(() => setSaveError(null), () => {
      setSaveError('本机保存失败，请重试。暂时不要关闭应用。');
    });
  }, [publish]);

  const update = useCallback((recipe: (current: PersistedState) => PersistedState) => {
    if (!readyRef.current || gate.blocked) return;
    updateFromMedia(recipe);
  }, [gate, updateFromMedia]);

  const cleanupMedia = useCallback((work: () => Promise<void>) => {
    if (!readyRef.current) return;
    void gate.mutate(work).catch(() => setSaveError('文件操作未完成，请稍后重试。'));
  }, [gate]);

  const mutateMedia = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    if (!readyRef.current) throw new Error('存档尚未恢复，请先完成恢复或重试。');
    return gate.mutate(work);
  }, [gate]);

  const retrySave = useCallback(async () => {
    await gate.freeze(async () => {
      if (!readyRef.current) return;
      await saveState(stateRef.current);
      setSaveError(null);
    });
  }, [gate]);

  const refreshDate = useCallback(() => {
    if (!readyRef.current || gate.blocked) return;
    const current = stateRef.current;
    const date = todayKey();
    const activeId = resolveActiveProfileId(current.profiles, current.activeProfileId);
    const lesson = current.dailyByProfile[activeId] ?? null;
    const preview = resolveActiveLearningDay(current, date, () => 0);
    const nextLesson = preview.dailyByProfile[activeId];
    const planSame = JSON.stringify(current.weeklyByProfile[activeId] ?? null) === JSON.stringify(preview.weeklyByProfile[activeId] ?? null);
    const questReady = questOf(current.questByProfile, activeId).day?.date === date;
    if (questReady && lesson?.cardId && lesson.cardId === nextLesson?.cardId && planSame) return;
    update((previous) => settleDay(previous));
  }, [gate, update]);

  useEffect(() => {
    refreshDate();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refreshDate();
    });
    const timer = setInterval(refreshDate, 30_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [ready, backupBusy, refreshDate]);

  const unlockParent = useCallback(
    (pin: string) => {
      const ok = pin === state.parentPin;
      if (ok) setParentUnlocked(true);
      return ok;
    },
    [state.parentPin],
  );

  const lockParent = useCallback(() => setParentUnlocked(false), []);

  const changePin = useCallback((pin: string) => {
    if (!/^\d{4}$/.test(pin)) return false;
    update((current) => ({ ...current, parentPin: pin }));
    return true;
  }, [update]);

  const upsertWord = useCallback(
    (input: { id?: string; en: string; zh: string; ipa?: string; ketPack?: boolean }) => {
      const en = input.en.trim().replace(/\s+/g, ' ');
      const zh = input.zh.trim();
      if (!en || !zh) return;
      const ipa = input.ipa !== undefined ? normalizeIpa(input.ipa) : undefined;
      update((current) => {
        if (input.id) {
          const words = current.words.map((word) =>
            word.id === input.id
              ? {
                  ...word,
                  en,
                  zh,
                  ipa: ipa !== undefined ? ipa : word.ipa,
                  ketPack: input.ketPack !== undefined ? input.ketPack : word.ketPack,
                }
              : word,
          );
          if (input.ketPack === undefined) return { ...current, words };
          return withActiveQuest({ ...current, words }, (quest) =>
            setWordInKetPack(quest, input.id as string, input.ketPack === true),
          );
        }
        const word: Word = {
          id: createId('word'),
          en,
          zh,
          source: 'parent',
          createdAt: new Date().toISOString(),
          profileId: current.activeProfileId,
        };
        if (ipa) word.ipa = ipa;
        if (input.ketPack) word.ketPack = true;
        const next = { ...current, words: [word, ...current.words] };
        return input.ketPack
          ? withActiveQuest(next, (quest) => setWordInKetPack(quest, word.id, true))
          : next;
      });
    },
    [update],
  );

  const setShowIpa = useCallback(
    (on: boolean) => {
      update((current) => ({ ...current, showIpa: on }));
    },
    [update],
  );

  const removeWord = useCallback(
    (id: string) => {
      let recordingUri: string | null | undefined;
      update((current) => {
        recordingUri = current.words.find((word) => word.id === id)?.recordingUri;
        return detachWord(
          withActiveQuest(
            { ...current, words: current.words.filter((word) => word.id !== id) },
            (quest) => pruneQuestWord(quest, id),
          ),
          id,
        );
      });
      if (recordingUri) cleanupMedia(() => deleteRecordingFile(recordingUri));
    },
    [update, cleanupMedia],
  );

  const setWordKetPack = useCallback(
    (id: string, on: boolean) => {
      update((current) =>
        withActiveQuest(
          {
            ...current,
            words: current.words.map((word) =>
              word.id === id ? { ...word, ketPack: on || undefined } : word,
            ),
          },
          (quest) => setWordInKetPack(quest, id, on),
        ),
      );
    },
    [update],
  );

  const setWordRecording = useCallback(
    async (wordId: string, sourceUri: string | null) => mutateMedia(async () => {
      if (!sourceUri) {
        let previous: string | null | undefined;
        updateFromMedia((current) => {
          previous = current.words.find((word) => word.id === wordId)?.recordingUri;
          return {
            ...current,
            words: current.words.map((word) =>
              word.id === wordId ? { ...word, recordingUri: null } : word,
            ),
          };
        });
        if (previous) await deleteRecordingFile(previous);
        return;
      }
      const stored = await persistRecordingFile(
        sourceUri,
        wordRecordingRelativePath(wordId, guessAudioExt(sourceUri)),
      );
      let previous: string | null | undefined;
      updateFromMedia((current) => {
        previous = current.words.find((word) => word.id === wordId)?.recordingUri;
        if (!current.words.some((word) => word.id === wordId)) return current;
        return {
          ...current,
          words: current.words.map((word) =>
            word.id === wordId ? { ...word, recordingUri: stored } : word,
          ),
        };
      });
      if (previous && previous !== stored) await deleteRecordingFile(previous);
    }),
    [mutateMedia, updateFromMedia],
  );

  const importWordText = useCallback(
    (
      text: string,
      mode: 'append' | 'replace' = 'append',
      options?: { ketPack?: boolean; rebuildPack?: boolean },
    ) => {
      const removedRecordings: string[] = [];
      let added = 0;
      let skipped = 0;
      let packAdded = 0;
      update((current) => {
        const activeId = current.activeProfileId;
        const result = applyWordListImport(
          current.words,
          questOf(current.questByProfile, activeId),
          activeId,
          text,
          {
            mode,
            ketPack: Boolean(options?.ketPack),
            rebuildPack: Boolean(options?.rebuildPack),
          },
        );
        added = result.added;
        skipped = result.skipped;
        packAdded = result.packAdded;
        removedRecordings.push(...result.removedRecordings);
        if (result.added === 0 && result.skipped === 0 && result.packAdded === 0) {
          return current;
        }
        return withActiveQuest({ ...current, words: result.words }, () => result.quest);
      });
      for (const uri of removedRecordings) cleanupMedia(() => deleteRecordingFile(uri));
      return { added, skipped, packAdded };
    },
    [update, cleanupMedia],
  );

  const importFamilyKetPack = useCallback(
    () => importWordText(FAMILY_KET_PACK_TEXT, 'append', { ketPack: true, rebuildPack: true }),
    [importWordText],
  );

  const importPowerUp1Unit = useCallback(
    (unitId: number, options?: { includeSentences?: boolean }) => {
      let added = 0;
      let skipped = 0;
      let packAdded = 0;
      let sentencesAdded = 0;
      let sentencesSkipped = 0;
      update((current) => {
        const activeId = current.activeProfileId;
        const result = applyPowerUp1UnitImport(
          current.words,
          questOf(current.questByProfile, activeId),
          current.sentences,
          activeId,
          unitId,
          { includeSentences: options?.includeSentences !== false },
        );
        added = result.added;
        skipped = result.skipped;
        packAdded = result.packAdded;
        sentencesAdded = result.sentencesAdded;
        sentencesSkipped = result.sentencesSkipped;
        if (
          result.added === 0 &&
          result.skipped === 0 &&
          result.packAdded === 0 &&
          result.sentencesAdded === 0 &&
          result.sentencesSkipped === 0
        ) {
          return current;
        }
        return withActiveQuest(
          { ...current, words: result.words, sentences: result.sentences },
          () => result.quest,
        );
      });
      return { added, skipped, packAdded, sentencesAdded, sentencesSkipped };
    },
    [update],
  );

  const setQuestDailyNewCount = useCallback(
    (count: QuestNewCount) => {
      update((current) =>
        withActiveQuest(current, (quest) => ({
          ...quest,
          dailyNewCount: clampQuestNewCount(count),
        })),
      );
    },
    [update],
  );

  const seedSampleKetPack = useCallback(() => {
    update((current) => {
      const activeId = current.activeProfileId;
      const samples = createSampleWords().filter((word) => word.ketPack);
      const have = new Map(
        wordsForProfile(current.words, activeId).map((word) => [word.en.toLowerCase(), word]),
      );
      const packIds: string[] = [];
      const words = current.words.map((word) => {
        if (profileIdOf(word) !== activeId || !isSampleKetEn(word.en)) return word;
        packIds.push(word.id);
        return { ...word, ketPack: true };
      });
      const incoming: Word[] = [];
      for (const sample of samples) {
        if (have.has(sample.en.toLowerCase())) continue;
        const next = { ...sample, profileId: activeId, ketPack: true };
        incoming.push(next);
        packIds.push(next.id);
      }
      return withActiveQuest({ ...current, words: [...incoming, ...words] }, (quest) => ({
        ...quest,
        packWordIds: mergeKetPackIds(quest.packWordIds, packIds),
      }));
    });
  }, [update]);

  const touchQuestDay = useCallback(() => {
    update((current) => withEnsuredQuest(current));
  }, [update]);

  const submitQuestAnswer = useCallback(async (input: QuestAnswerInput) => {
    await gate.freeze(async () => {
      const current = stateRef.current;
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      if (!readyRef.current || profileId !== input.profileId || input.date !== todayKey()) {
        throw new Error('今天的任务或孩子档案已变化，请重新进入练习。');
      }
      const existing = new Set(wordsForProfile(current.words, profileId).map((word) => word.id));
      const quest = ensureQuestDay(questOf(current.questByProfile, profileId), existing);
      const result = applyQuestAnswer(quest, input);
      if (!result.accepted) return;
      const next = {
        ...current,
        questByProfile: patchQuest(current.questByProfile, profileId, result.quest),
      };
      await saveState(next);
      publish(next);
      setSaveError(null);
    });
  }, [gate, publish]);

  const upsertSentence = useCallback(
    (input: { id?: string; en: string; zh?: string; tags?: string | string[] }) => {
      const en = input.en.trim().replace(/\s+/g, ' ');
      if (!en || !/[A-Za-z]/.test(en)) return;
      const zh = input.zh?.trim() ?? '';
      const tags = Array.isArray(input.tags) ? normalizeTags(input.tags) : parseTagInput(input.tags ?? '');
      update((current) => {
        const wordIds = linkSentenceWordIds(en, wordsForProfile(current.words, current.activeProfileId));
        const patch = {
          en,
          zh: zh || undefined,
          tags: tags.length ? tags : undefined,
          wordIds: wordIds.length ? wordIds : undefined,
        };
        if (input.id) {
          return {
            ...current,
            sentences: current.sentences.map((item) =>
              item.id === input.id ? { ...item, ...patch } : item,
            ),
          };
        }
        const key = normalizeSentenceKey(en);
        const exists = current.sentences.some(
          (item) =>
            profileIdOf(item) === current.activeProfileId && normalizeSentenceKey(item.en) === key,
        );
        if (exists) return current;
        const sentence: Sentence = {
          id: createId('sentence'),
          en,
          createdAt: new Date().toISOString(),
          profileId: current.activeProfileId,
        };
        if (zh) sentence.zh = zh;
        if (tags.length) sentence.tags = tags;
        if (wordIds.length) sentence.wordIds = wordIds;
        return { ...current, sentences: [sentence, ...current.sentences] };
      });
    },
    [update],
  );

  const removeSentence = useCallback(
    (id: string) => {
      let recordingUri: string | null | undefined;
      update((current) => {
        recordingUri = current.sentences.find((item) => item.id === id)?.recordingUri;
        return {
          ...current,
          sentences: current.sentences.filter((item) => item.id !== id),
        };
      });
      if (recordingUri) cleanupMedia(() => deleteRecordingFile(recordingUri));
    },
    [update, cleanupMedia],
  );

  const importSentenceText = useCallback(
    (text: string, mode: 'append' | 'replace' = 'append') => {
      const removedRecordings: string[] = [];
      let added = 0;
      let skipped = 0;
      update((current) => {
        const result = applySentenceListImport(
          current.sentences,
          current.words,
          current.activeProfileId,
          text,
          { mode },
        );
        added = result.added;
        skipped = result.skipped;
        removedRecordings.push(...result.removedRecordings);
        if (result.added === 0 && result.skipped === 0) return current;
        return { ...current, sentences: result.sentences };
      });
      for (const uri of removedRecordings) cleanupMedia(() => deleteRecordingFile(uri));
      return { added, skipped };
    },
    [update, cleanupMedia],
  );

  const setSentenceRecording = useCallback(
    async (sentenceId: string, sourceUri: string | null) => mutateMedia(async () => {
      if (!sourceUri) {
        let previous: string | null | undefined;
        updateFromMedia((current) => {
          previous = current.sentences.find((item) => item.id === sentenceId)?.recordingUri;
          return {
            ...current,
            sentences: current.sentences.map((item) =>
              item.id === sentenceId ? { ...item, recordingUri: null } : item,
            ),
          };
        });
        if (previous) await deleteRecordingFile(previous);
        return;
      }
      const stored = await persistRecordingFile(
        sourceUri,
        sentenceRecordingRelativePath(sentenceId, guessAudioExt(sourceUri)),
      );
      let previous: string | null | undefined;
      updateFromMedia((current) => {
        previous = current.sentences.find((item) => item.id === sentenceId)?.recordingUri;
        if (!current.sentences.some((item) => item.id === sentenceId)) return current;
        return {
          ...current,
          sentences: current.sentences.map((item) =>
            item.id === sentenceId ? { ...item, recordingUri: stored } : item,
          ),
        };
      });
      if (previous && previous !== stored) await deleteRecordingFile(previous);
    }),
    [mutateMedia, updateFromMedia],
  );

  const composeSentenceDrafts = useCallback(() => {
    return buildSentenceDrafts(
      wordsForProfile(state.words, state.activeProfileId),
      state.progress,
      state.daily,
    );
  }, [state]);

  const saveSentenceDrafts = useCallback(
    (drafts: Array<{ en: string; zh?: string }>) => {
      let added = 0;
      let skipped = 0;
      update((current) => {
        const activeId = current.activeProfileId;
        const have = new Set(
          current.sentences
            .filter((item) => profileIdOf(item) === activeId)
            .map((item) => normalizeSentenceKey(item.en)),
        );
        const incoming: Sentence[] = [];
        added = 0;
        skipped = 0;
        const profileWords = wordsForProfile(current.words, activeId);
        for (const draft of drafts) {
          const en = draft.en.trim().replace(/\s+/g, ' ');
          if (!en) {
            skipped += 1;
            continue;
          }
          const key = normalizeSentenceKey(en);
          if (have.has(key)) {
            skipped += 1;
            continue;
          }
          have.add(key);
          added += 1;
          const zh = draft.zh?.trim() ?? '';
          const wordIds = linkSentenceWordIds(en, profileWords);
          const sentence: Sentence = {
            id: createId('sentence'),
            en,
            createdAt: new Date().toISOString(),
            profileId: activeId,
          };
          if (zh) sentence.zh = zh;
          if (wordIds.length) sentence.wordIds = wordIds;
          incoming.push(sentence);
        }
        return incoming.length
          ? { ...current, sentences: [...incoming, ...current.sentences] }
          : current;
      });
      return { added, skipped };
    },
    [update],
  );

  const markSentenceHeard = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        sentenceProgress: {
          ...current.sentenceProgress,
          [id]: applySentenceHeard(current.sentenceProgress[id], id),
        },
      }));
    },
    [update],
  );

  const markSentenceCanSay = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        sentenceProgress: {
          ...current.sentenceProgress,
          [id]: applySentenceCanSay(current.sentenceProgress[id], id),
        },
      }));
    },
    [update],
  );

  const addBookWordToToday = useCallback(
    (en: string, zh: string): 'added' | 'already' => {
      const cleanEn = en.trim().replace(/\s+/g, ' ');
      const cleanZh = zh.trim() || cleanEn;
      if (!cleanEn) return 'already';
      let result: 'added' | 'already' = 'added';
      update((current) => {
        const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
        let words = current.words;
        let word = findProfileWord(words, profileId, cleanEn);
        if (!word) {
          word = {
            id: createId('word'),
            en: cleanEn,
            zh: cleanZh,
            source: 'parent',
            createdAt: new Date().toISOString(),
            profileId,
          };
          words = [word, ...words];
        }
        const settled = settleDay({ ...current, words });
        const today = settled.dailyByProfile[profileId] ?? settled.daily;
        if (!today) return settled;
        const already =
          today.vocabWordIds.includes(word.id) || today.dictationWordIds.includes(word.id);
        result = already ? 'already' : 'added';
        return withActiveDaily(settled, addWordToDaily(today, word.id));
      });
      return result;
    },
    [update],
  );

  const restoreSampleWords = useCallback(() => {
    const removed = state.words
      .filter((word) => word.source === 'sample' && word.recordingUri)
      .map((word) => word.recordingUri as string);
    update((current) => {
      const samples = createSampleWords();
      const parentWords = current.words.filter((word) => word.source === 'parent');
      const have = new Set(parentWords.map((word) => word.en.toLowerCase()));
      const restored = samples
        .filter((word) => !have.has(word.en.toLowerCase()))
        .map((word) => ({ ...word, profileId: current.activeProfileId }));
      const words = [...parentWords, ...restored];
      const packIds = words
        .filter((word) => profileIdOf(word) === current.activeProfileId && word.ketPack)
        .map((word) => word.id);
      return withActiveQuest({ ...current, words }, (quest) => ({
        ...quest,
        packWordIds: mergeKetPackIds(quest.packWordIds, packIds),
      }));
    });
    for (const uri of removed) cleanupMedia(() => deleteRecordingFile(uri));
  }, [state.words, update, cleanupMedia]);

  const setDictationType = useCallback(
    (type: DictationType, on: boolean) => {
      update((current) => {
        const enabled = new Set(current.dictationSettings.enabledTypes);
        if (on) enabled.add(type);
        else enabled.delete(type);
        return {
          ...current,
          dictationSettings: {
            ...current.dictationSettings,
            enabledTypes: clampEnabledTypes([...enabled]),
          },
        };
      });
    },
    [update],
  );

  const setAutoAdjust = useCallback(
    (on: boolean) => {
      update((current) => ({
        ...current,
        dictationSettings: { ...current.dictationSettings, autoAdjust: on },
      }));
    },
    [update],
  );

  const enableChallengeModes = useCallback(() => {
    update((current) => ({
      ...current,
      dictationSettings: {
        ...current.dictationSettings,
        enabledTypes: withChallengeModes(current.dictationSettings.enabledTypes),
      },
    }));
  }, [update]);

  const progressFor = useCallback(
    (wordId: string) => state.progress[wordId] ?? emptyProgress(wordId),
    [state.progress],
  );

  const dictationTypeFor = useCallback(
    (wordId: string) => currentDictationType(progressFor(wordId), state.dictationSettings),
    [progressFor, state.dictationSettings],
  );

  const maybeAwardStreak = (current: PersistedState): PersistedState => {
    if (!isDailyComplete(current.daily)) return current;
    return {
      ...current,
      streak: applyDailyComplete(current.streak, todayKey()),
    };
  };

  const markVocab = useCallback(
    (wordId: string, known: boolean, daily = false, claim?: DailyClaim) => {
      update((current) => {
        if (daily && !acceptDailyClaim(current, claim, wordId, 'vocab')) return current;
        const prev = current.progress[wordId] ?? emptyProgress(wordId);
        const progress = {
          ...current.progress,
          [wordId]: {
            ...prev,
            vocabSeen: prev.vocabSeen + 1,
            vocabKnown: known,
            lastPracticedAt: new Date().toISOString(),
          },
        };
        const activeId = resolveActiveProfileId(current.profiles, current.activeProfileId);
        const lesson = current.dailyByProfile[activeId] ?? current.daily;
        const nextDaily = daily && lesson ? markVocabDone(lesson, wordId) : lesson;
        const event: PracticeEvent = {
          id: createId('pr'),
          date: todayKey(),
          kind: 'vocab',
          source: daily ? 'daily' : 'free',
          wordId,
          correct: known,
        };
        const next = {
          ...current,
          progress,
          practiceLog: capPracticeLog([event, ...current.practiceLog]),
        };
        return maybeAwardStreak(nextDaily ? withActiveDaily(next, nextDaily) : next);
      });
    },
    [update],
  );

  const markDictation = useCallback(
    (wordId: string, correct: boolean, daily = false, source?: PracticeEvent['source'], claim?: DailyClaim) => {
      let nextProgress = emptyProgress(wordId);
      update((current) => {
        if (daily && !acceptDailyClaim(current, claim, wordId, 'dictation')) return current;
        const prev = current.progress[wordId] ?? emptyProgress(wordId);
        nextProgress = applyDictationResult(
          prev,
          correct,
          current.dictationSettings,
          new Date().toISOString(),
        );
        const progress = { ...current.progress, [wordId]: nextProgress };
        const activeId = resolveActiveProfileId(current.profiles, current.activeProfileId);
        const lesson = current.dailyByProfile[activeId] ?? current.daily;
        const nextDaily = daily && lesson ? markDictationDone(lesson, wordId) : lesson;
        const event: PracticeEvent = {
          id: createId('pr'),
          date: todayKey(),
          kind: 'dictation',
          source: source ?? (daily ? 'daily' : 'free'),
          wordId,
          correct,
        };
        const practiceLog = capPracticeLog([event, ...current.practiceLog]);
        const dictationJustFinished =
          Boolean(daily) &&
          nextDaily != null &&
          nextDaily.dictationWordIds.length > 0 &&
          nextDaily.dictationWordIds.every((id) => nextDaily.completedDictationIds.includes(id));
        let stars = current.stars;
        if (dictationJustFinished) {
          const counted = countSession(practiceLog, todayKey(), 'daily');
          stars = applySessionStars(
            current.stars,
            todayKey(),
            starsForSession(counted.correct, counted.wrong),
          ).next;
        }
        const next = { ...current, progress, practiceLog, stars };
        return maybeAwardStreak(nextDaily ? withActiveDaily(next, nextDaily) : next);
      });
      return nextProgress;
    },
    [update],
  );

  const awardDictationStars = useCallback(
    (correct: number, wrong: number) => {
      const stars = starsForSession(correct, wrong);
      let celebrate = false;
      update((current) => {
        const applied = applySessionStars(current.stars, todayKey(), stars);
        celebrate = applied.celebrate;
        return { ...current, stars: applied.next };
      });
      return { stars, celebrate };
    },
    [update],
  );

  const addFeedback = useCallback(
    (kind: FeedbackKind, note = '') => {
      const text = buildFeedbackText(kind, note);
      if (!text) return;
      update((current) => ({
        ...current,
        feedback: [
          {
            id: createId('fb'),
            text,
            kind,
            createdAt: new Date().toISOString(),
            read: false,
            handled: false,
          },
          ...current.feedback,
        ],
      }));
    },
    [update],
  );

  const markFeedbackRead = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        feedback: current.feedback.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      }));
    },
    [update],
  );

  const markFeedbackHandled = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        feedback: current.feedback.map((item) =>
          item.id === id ? { ...item, handled: true, read: true } : item,
        ),
      }));
    },
    [update],
  );

  const addAlbumBook = useCallback(
    async (book: Omit<AlbumBook, 'id' | 'createdAt'> & { id?: string }) => mutateMedia(async () => {
      const id = book.id ?? createId('album');
      const pages: AlbumPage[] = [];
      for (const page of book.pages) {
        const pageId = page.id || createId('page');
        pages.push(
          buildAlbumPage(
            {
              id: pageId,
              photoUri: await persistAlbumPhoto(page.photoUri, id, pageId),
              caption: page.caption,
              captionZh: page.captionZh,
              recordingUri: page.recordingUri
                ? await persistRecordingFile(
                    page.recordingUri,
                    albumPageRecordingRelativePath(id, pageId, guessAudioExt(page.recordingUri)),
                  )
                : null,
            },
            () => pageId,
          ),
        );
      }
      const next = {
        ...buildAlbumBook(
          { id, title: book.title, pages, createdAt: new Date().toISOString() },
          () => id,
          () => new Date().toISOString(),
        ),
        profileId: state.activeProfileId,
      };
      updateFromMedia((current) => ({
        ...current,
        albumBooks: upsertAlbumBook(current.albumBooks, next),
      }));
      return id;
    }),
    [state.activeProfileId, mutateMedia, updateFromMedia],
  );

  const updateAlbumBook = useCallback(
    (id: string, patch: { title?: string }) => {
      update((current) => ({
        ...current,
        albumBooks: current.albumBooks.map((item) =>
          item.id === id
            ? { ...item, title: patch.title !== undefined ? patch.title : item.title }
            : item,
        ),
      }));
    },
    [update],
  );

  const addAlbumPage = useCallback(
    async (bookId: string, page: Omit<AlbumPage, 'id'> & { id?: string }) => mutateMedia(async () => {
      const pageId = page.id ?? createId('page');
      const photoUri = await persistAlbumPhoto(page.photoUri, bookId, pageId);
      const recordingUri = page.recordingUri
        ? await persistRecordingFile(
            page.recordingUri,
            albumPageRecordingRelativePath(bookId, pageId, guessAudioExt(page.recordingUri)),
          )
        : null;
      const nextPage = buildAlbumPage(
        { id: pageId, photoUri, caption: page.caption, captionZh: page.captionZh, recordingUri },
        () => pageId,
      );
      let added = false;
      updateFromMedia((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        if (!book) return current;
        added = true;
        return {
          ...current,
          albumBooks: replaceBook(current.albumBooks, addPageToBook(book, nextPage)),
        };
      });
      return added ? pageId : null;
    }),
    [mutateMedia, updateFromMedia],
  );

  const updateAlbumPage = useCallback(
    (
      bookId: string,
      pageId: string,
      patch: Partial<Pick<AlbumPage, 'caption' | 'captionZh' | 'photoUri' | 'recordingUri'>>,
    ) => {
      update((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        if (!book) return current;
        return {
          ...current,
          albumBooks: replaceBook(current.albumBooks, patchPageInBook(book, pageId, patch)),
        };
      });
    },
    [update],
  );

  const setAlbumPageRecording = useCallback(
    async (bookId: string, pageId: string, sourceUri: string | null) => mutateMedia(async () => {
      if (!sourceUri) {
        let previous: string | null | undefined;
        updateFromMedia((current) => {
          const book = current.albumBooks.find((item) => item.id === bookId);
          previous = book?.pages.find((item) => item.id === pageId)?.recordingUri;
          if (!book) return current;
          return {
            ...current,
            albumBooks: replaceBook(
              current.albumBooks,
              patchPageInBook(book, pageId, { recordingUri: null }),
            ),
          };
        });
        if (previous) await deleteRecordingFile(previous);
        return;
      }
      const stored = await persistRecordingFile(
        sourceUri,
        albumPageRecordingRelativePath(bookId, pageId, guessAudioExt(sourceUri)),
      );
      let previous: string | null | undefined;
      updateFromMedia((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        previous = book?.pages.find((item) => item.id === pageId)?.recordingUri;
        if (!book) return current;
        return {
          ...current,
          albumBooks: replaceBook(
            current.albumBooks,
            patchPageInBook(book, pageId, { recordingUri: stored }),
          ),
        };
      });
      if (previous && previous !== stored) await deleteRecordingFile(previous);
    }),
    [mutateMedia, updateFromMedia],
  );

  const removeAlbumPage = useCallback(
    async (bookId: string, pageId: string) => mutateMedia(async () => {
      let photoUri: string | undefined;
      let recordingUri: string | null | undefined;
      updateFromMedia((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        const page = book?.pages.find((item) => item.id === pageId);
        photoUri = page?.photoUri;
        recordingUri = page?.recordingUri;
        if (!book) return current;
        return {
          ...current,
          albumBooks: replaceBook(current.albumBooks, removePageFromBook(book, pageId)),
        };
      });
      if (photoUri) await deleteAlbumPhoto(photoUri);
      if (recordingUri) await deleteRecordingFile(recordingUri);
    }),
    [mutateMedia, updateFromMedia],
  );

  const removeAlbumBook = useCallback(
    async (id: string) => mutateMedia(async () => {
      await deleteAlbumBookFiles(id);
      await deleteAlbumBookRecordings(id);
      updateFromMedia((current) => ({
        ...current,
        albumBooks: removeAlbumBookById(current.albumBooks, id),
      }));
    }),
    [mutateMedia, updateFromMedia],
  );

  const renameActiveProfile = useCallback(
    (name: string) => {
      update((current) => ({
        ...current,
        profiles: renameProfile(current.profiles, current.activeProfileId, name),
      }));
    },
    [update],
  );

  const addProfile = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const id = createId('profile');
      update((current) =>
        settleDay(seedDefaultKetPackIfEmpty({
          ...current,
          profiles: [
            ...current.profiles,
            { id, name: trimmed, createdAt: new Date().toISOString(), archived: false },
          ],
          activeProfileId: id,
        })),
      );
      return id;
    },
    [update],
  );

  const switchProfile = useCallback(
    (id: string) => {
      update((current) =>
        settleDay(seedDefaultKetPackIfEmpty({
          ...current,
          activeProfileId: resolveActiveProfileId(current.profiles, id),
        })),
      );
    },
    [update],
  );

  const archiveProfile = useCallback(
    (id: string) => {
      update((current) => {
        const profiles = setProfileArchived(current.profiles, id, true);
        return settleDay({
          ...current,
          profiles,
          activeProfileId: resolveActiveProfileId(profiles, current.activeProfileId),
        });
      });
    },
    [update],
  );

  const resetDemo = useCallback(async () => mutateMedia(async () => {
    await clearAllAlbumFiles();
    await clearAllRecordingFiles();
    await clearState();
    const fresh = defaultState();
    const next = settleDay(fresh);
    await saveState(next);
    publish(next);
    setParentUnlocked(false);
  }), [mutateMedia, publish]);

  const saveWeeklySelection = useCallback((selection: WeeklySelection) => {
    update((current) => {
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      const date = todayKey();
      const plan = commitWeeklySelection(
        current.weeklyByProfile[profileId],
        profileId,
        selection,
        date,
        current.dailyByProfile[profileId] ?? null,
      );
      const withPlan = {
        ...current,
        weeklyByProfile: { ...current.weeklyByProfile, [profileId]: plan },
      };
      return plan.pending ? withPlan : resolveActiveLearningDay(withPlan, date);
    });
  }, [update]);

  const setWeeklyWordReadiness = useCallback((wordId: string, readiness: WeeklyReadiness) => {
    update((current) => {
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      const plan = current.weeklyByProfile[profileId];
      if (!plan) return current;
      const next = setWeeklyReadiness(
        plan,
        wordId,
        readiness,
        todayKey(),
        current.dailyByProfile[profileId] ?? null,
      );
      return { ...current, weeklyByProfile: { ...current.weeklyByProfile, [profileId]: next } };
    });
  }, [update]);

  const createWordGroup = useCallback((name: string) => {
    update((current) => {
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      return {
        ...current,
        contentGroups: createContentGroup(current.contentGroups, {
          profileId,
          name,
          now: new Date().toISOString(),
        }),
      };
    });
  }, [update]);

  const addSelectedWordsToGroup = useCallback((groupId: string, wordIds: string[]) => {
    update((current) => {
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      return {
        ...current,
        contentGroups: wordIds.reduce(
          (groups, wordId) => addWordToContentGroups(groups, profileId, wordId, [groupId]),
          current.contentGroups,
        ),
      };
    });
  }, [update]);

  const removeWordGroup = useCallback((groupId: string) => {
    update((current) => ({ ...current, contentGroups: removeContentGroup(current.contentGroups, groupId) }));
  }, [update]);

  const importProofreadStarter = useCallback(() => {
    let added = 0;
    let linked = 0;
    update((current) => {
      const profileId = resolveActiveProfileId(current.profiles, current.activeProfileId);
      const result = importProofreadPack({
        words: current.words,
        groups: current.contentGroups,
        profileId,
        entries: PROOFREAD_STARTER,
        now: new Date().toISOString(),
      });
      added = result.added;
      linked = result.linked;
      return { ...current, words: result.words, contentGroups: result.groups };
    });
    return { added, linked };
  }, [update]);

  const applyWordGlossCorrections = useCallback((picks: Array<{ wordId: string; suggested: string }>) => {
    update((current) => ({ ...current, words: applyGlossCorrections(current.words, picks) }));
  }, [update]);

  const exportSnapshot = useCallback(() => stateRef.current, []);

  const replaceState = useCallback(async (next: PersistedState) => {
    if (loadErrorRef.current) await preserveUnreadableState();
    await saveState(next);
    if (backupTransaction.current) {
      stateRef.current = next;
      backupTransaction.current.replaced = true;
      return;
    }
    publish(next);
    readyRef.current = true;
    loadErrorRef.current = false;
    setReady(true);
    setLoadError(null);
    setSaveError(null);
  }, [publish]);

  const withBackupSnapshot = useCallback(async <T,>(work: (snapshot: PersistedState) => Promise<T>) => {
    if (gate.blocked) throw new Error('正在保存或备份，请稍后再试。');
    setBackupBusy(true);
    try {
      return await gate.freeze(async () => {
        if (readyRef.current) await saveState(stateRef.current);
        const snapshot = JSON.parse(JSON.stringify(stateRef.current)) as PersistedState;
        const transaction = { replaced: false };
        backupTransaction.current = transaction;
        try {
          const result = await work(snapshot);
          if (transaction.replaced) {
            publish(stateRef.current);
            readyRef.current = true;
            loadErrorRef.current = false;
            setReady(true);
            setLoadError(null);
            setSaveError(null);
          }
          return result;
        } catch (error) {
          stateRef.current = snapshot;
          // 回退未完成时保留 journal，停止写入，交给重试或冷启动恢复。
          if (await hasPendingBackupRestore().catch(() => true)) {
            readyRef.current = false;
            loadErrorRef.current = true;
            setReady(false);
            setLoadError('上次恢复尚未完成，已暂停保存以保护原存档。请重试恢复，暂时不要关闭应用。');
          }
          throw error;
        } finally {
          backupTransaction.current = null;
        }
      });
    } finally {
      setBackupBusy(false);
    }
  }, [gate, publish]);

  const visibleState = useMemo(() => projectProfile(state), [state]);
  const quest = useMemo(() => {
    const existing = new Set(visibleState.words.map((word) => word.id));
    return ensureQuestDay(questOf(state.questByProfile, visibleState.activeProfileId), existing);
  }, [state.questByProfile, visibleState.activeProfileId, visibleState.words]);

  const value = useMemo<DeskContextValue>(
    () => ({
      ready,
      loadError,
      saveError,
      backupBusy,
      retryLoad,
      retrySave,
      state: visibleState,
      profiles: state.profiles,
      activeProfileId: visibleState.activeProfileId,
      renameActiveProfile,
      addProfile,
      switchProfile,
      archiveProfile,
      parentUnlocked,
      unlockParent,
      lockParent,
      changePin,
      upsertWord,
      setShowIpa,
      removeWord,
      setWordKetPack,
      setWordRecording,
      importWordText,
      importFamilyKetPack,
      importPowerUp1Unit,
      setQuestDailyNewCount,
      seedSampleKetPack,
      touchQuestDay,
      submitQuestAnswer,
      quest,
      upsertSentence,
      removeSentence,
      importSentenceText,
      setSentenceRecording,
      composeSentenceDrafts,
      saveSentenceDrafts,
      markSentenceHeard,
      markSentenceCanSay,
      addBookWordToToday,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      enableChallengeModes,
      saveWeeklySelection,
      setWeeklyWordReadiness,
      createWordGroup,
      addSelectedWordsToGroup,
      removeWordGroup,
      importProofreadStarter,
      applyWordGlossCorrections,
      markVocab,
      markDictation,
      awardDictationStars,
      addFeedback,
      markFeedbackRead,
      markFeedbackHandled,
      addAlbumBook,
      updateAlbumBook,
      addAlbumPage,
      updateAlbumPage,
      setAlbumPageRecording,
      removeAlbumPage,
      removeAlbumBook,
      resetDemo,
      exportSnapshot,
      replaceState,
      withBackupSnapshot,
      progressFor,
      dictationTypeFor,
    }),
    [
      ready,
      loadError,
      saveError,
      backupBusy,
      retryLoad,
      retrySave,
      state,
      visibleState,
      renameActiveProfile,
      addProfile,
      switchProfile,
      archiveProfile,
      parentUnlocked,
      unlockParent,
      lockParent,
      changePin,
      upsertWord,
      setShowIpa,
      removeWord,
      setWordKetPack,
      setWordRecording,
      importWordText,
      importFamilyKetPack,
      importPowerUp1Unit,
      setQuestDailyNewCount,
      seedSampleKetPack,
      touchQuestDay,
      submitQuestAnswer,
      quest,
      upsertSentence,
      removeSentence,
      importSentenceText,
      setSentenceRecording,
      composeSentenceDrafts,
      saveSentenceDrafts,
      markSentenceHeard,
      markSentenceCanSay,
      addBookWordToToday,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      enableChallengeModes,
      saveWeeklySelection,
      setWeeklyWordReadiness,
      createWordGroup,
      addSelectedWordsToGroup,
      removeWordGroup,
      importProofreadStarter,
      applyWordGlossCorrections,
      markVocab,
      markDictation,
      awardDictationStars,
      addFeedback,
      markFeedbackRead,
      markFeedbackHandled,
      addAlbumBook,
      updateAlbumBook,
      addAlbumPage,
      updateAlbumPage,
      setAlbumPageRecording,
      removeAlbumPage,
      removeAlbumBook,
      resetDemo,
      exportSnapshot,
      replaceState,
      withBackupSnapshot,
      progressFor,
      dictationTypeFor,
    ],
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk(): DeskContextValue {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error('useDesk 必须在 DeskProvider 内使用');
  return ctx;
}
