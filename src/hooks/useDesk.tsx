import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createSampleWords } from '@/content/sampleWords';
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
  ensureTodayLesson,
  isDailyComplete,
  markDictationDone,
  markVocabDone,
} from '@/lib/daily';
import { parseWordList } from '@/lib/parseWordList';
import {
  profileIdOf,
  projectProfile,
  renameProfile,
  resolveActiveProfileId,
  setProfileArchived,
} from '@/lib/profile';
import {
  applySessionStars,
  capPracticeLog,
  countSession,
  starsForSession,
} from '@/lib/stars';
import { clearState, defaultState, loadState, saveState } from '@/lib/storage';
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
  StarRating,
  Word,
  WordProgress,
} from '@/types/models';

type DeskContextValue = {
  ready: boolean;
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
  upsertWord: (input: { id?: string; en: string; zh: string }) => void;
  removeWord: (id: string) => void;
  setWordRecording: (wordId: string, sourceUri: string | null) => Promise<void>;
  importWordText: (text: string, mode?: 'append' | 'replace') => { added: number; skipped: number };
  addBookWordToToday: (en: string, zh: string) => 'added' | 'already';
  restoreSampleWords: () => void;
  setDictationType: (type: DictationType, on: boolean) => void;
  setAutoAdjust: (on: boolean) => void;
  enableChallengeModes: () => void;
  markVocab: (wordId: string, known: boolean, daily?: boolean) => void;
  markDictation: (
    wordId: string,
    correct: boolean,
    daily?: boolean,
    source?: PracticeEvent['source'],
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
  replaceState: (next: PersistedState) => void;
  progressFor: (wordId: string) => WordProgress;
  dictationTypeFor: (wordId: string) => DictationType;
};

const DeskContext = createContext<DeskContextValue | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PersistedState>(defaultState);
  const [parentUnlocked, setParentUnlocked] = useState(false);

  useEffect(() => {
    void (async () => {
      const loaded = await loadState();
      const dated = {
        ...loaded,
        daily: ensureTodayLesson(loaded.daily, loaded.words, loaded.progress),
      };
      setState(dated);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveState(state);
  }, [ready, state]);

  const update = useCallback((recipe: (current: PersistedState) => PersistedState) => {
    setState((current) => recipe(current));
  }, []);

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
    (input: { id?: string; en: string; zh: string }) => {
      const en = input.en.trim().replace(/\s+/g, ' ');
      const zh = input.zh.trim();
      if (!en || !zh) return;
      update((current) => {
        if (input.id) {
          return {
            ...current,
            words: current.words.map((word) =>
              word.id === input.id ? { ...word, en, zh } : word,
            ),
          };
        }
        const word: Word = {
          id: createId('word'),
          en,
          zh,
          source: 'parent',
          createdAt: new Date().toISOString(),
          profileId: current.activeProfileId,
        };
        return { ...current, words: [word, ...current.words] };
      });
    },
    [update],
  );

  const removeWord = useCallback(
    (id: string) => {
      let recordingUri: string | null | undefined;
      update((current) => {
        recordingUri = current.words.find((word) => word.id === id)?.recordingUri;
        return {
          ...current,
          words: current.words.filter((word) => word.id !== id),
        };
      });
      if (recordingUri) void deleteRecordingFile(recordingUri);
    },
    [update],
  );

  const setWordRecording = useCallback(
    async (wordId: string, sourceUri: string | null) => {
      if (!sourceUri) {
        let previous: string | null | undefined;
        update((current) => {
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
      update((current) => {
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
    },
    [update],
  );

  const importWordText = useCallback(
    (text: string, mode: 'append' | 'replace' = 'append') => {
      const parsed = parseWordList(text);
      if (parsed.length === 0) return { added: 0, skipped: 0 };
      const removedRecordings: string[] = [];
      let added = 0;
      let skipped = 0;
      update((current) => {
        const activeId = current.activeProfileId;
        if (mode === 'replace') {
          for (const word of current.words) {
            if (profileIdOf(word) === activeId && word.recordingUri) {
              removedRecordings.push(word.recordingUri);
            }
          }
        }
        const base =
          mode === 'replace'
            ? current.words.filter((word) => profileIdOf(word) !== activeId)
            : current.words;
        const have = new Set(base.map((word) => word.en.toLowerCase()));
        const incoming: Word[] = [];
        added = 0;
        skipped = 0;
        for (const item of parsed) {
          if (have.has(item.en.toLowerCase())) {
            skipped += 1;
            continue;
          }
          have.add(item.en.toLowerCase());
          added += 1;
          incoming.push({
            id: createId('word'),
            en: item.en,
            zh: item.zh,
            source: 'parent',
            createdAt: new Date().toISOString(),
            profileId: activeId,
          });
        }
        return { ...current, words: [...incoming, ...base] };
      });
      for (const uri of removedRecordings) void deleteRecordingFile(uri);
      return { added, skipped };
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
        let words = current.words;
        let word = words.find((item) => item.en.toLowerCase() === cleanEn.toLowerCase());
        if (!word) {
          word = {
            id: createId('word'),
            en: cleanEn,
            zh: cleanZh,
            source: 'parent',
            createdAt: new Date().toISOString(),
            profileId: current.activeProfileId,
          };
          words = [word, ...words];
        }
        const today = ensureTodayLesson(current.daily, words, current.progress);
        const already =
          today.vocabWordIds.includes(word.id) || today.dictationWordIds.includes(word.id);
        result = already ? 'already' : 'added';
        return { ...current, words, daily: addWordToDaily(today, word.id) };
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
      return {
        ...current,
        words: [
          ...parentWords,
          ...samples
            .filter((word) => !have.has(word.en.toLowerCase()))
            .map((word) => ({ ...word, profileId: current.activeProfileId })),
        ],
      };
    });
    for (const uri of removed) void deleteRecordingFile(uri);
  }, [state.words, update]);

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
    (wordId: string, known: boolean, daily = false) => {
      update((current) => {
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
        const nextDaily =
          daily && current.daily ? markVocabDone(current.daily, wordId) : current.daily;
        const event: PracticeEvent = {
          id: createId('pr'),
          date: todayKey(),
          kind: 'vocab',
          source: daily ? 'daily' : 'free',
          wordId,
          correct: known,
        };
        return maybeAwardStreak({
          ...current,
          progress,
          daily: nextDaily,
          practiceLog: capPracticeLog([event, ...current.practiceLog]),
        });
      });
    },
    [update],
  );

  const markDictation = useCallback(
    (wordId: string, correct: boolean, daily = false, source?: PracticeEvent['source']) => {
      let nextProgress = emptyProgress(wordId);
      update((current) => {
        const prev = current.progress[wordId] ?? emptyProgress(wordId);
        nextProgress = applyDictationResult(
          prev,
          correct,
          current.dictationSettings,
          new Date().toISOString(),
        );
        const progress = { ...current.progress, [wordId]: nextProgress };
        const nextDaily =
          daily && current.daily ? markDictationDone(current.daily, wordId) : current.daily;
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
        return maybeAwardStreak({
          ...current,
          progress,
          daily: nextDaily,
          practiceLog,
          stars,
        });
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
    async (book: Omit<AlbumBook, 'id' | 'createdAt'> & { id?: string }) => {
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
      update((current) => ({
        ...current,
        albumBooks: upsertAlbumBook(current.albumBooks, next),
      }));
      return id;
    },
    [state.activeProfileId, update],
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
    async (bookId: string, page: Omit<AlbumPage, 'id'> & { id?: string }) => {
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
      update((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        if (!book) return current;
        added = true;
        return {
          ...current,
          albumBooks: replaceBook(current.albumBooks, addPageToBook(book, nextPage)),
        };
      });
      return added ? pageId : null;
    },
    [update],
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
    async (bookId: string, pageId: string, sourceUri: string | null) => {
      if (!sourceUri) {
        let previous: string | null | undefined;
        update((current) => {
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
      update((current) => {
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
    },
    [update],
  );

  const removeAlbumPage = useCallback(
    async (bookId: string, pageId: string) => {
      let photoUri: string | undefined;
      let recordingUri: string | null | undefined;
      update((current) => {
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
    },
    [update],
  );

  const removeAlbumBook = useCallback(
    async (id: string) => {
      await deleteAlbumBookFiles(id);
      await deleteAlbumBookRecordings(id);
      update((current) => ({
        ...current,
        albumBooks: removeAlbumBookById(current.albumBooks, id),
      }));
    },
    [update],
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
      update((current) => ({
        ...current,
        profiles: [
          ...current.profiles,
          { id, name: trimmed, createdAt: new Date().toISOString(), archived: false },
        ],
        activeProfileId: id,
      }));
      return id;
    },
    [update],
  );

  const switchProfile = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        activeProfileId: resolveActiveProfileId(current.profiles, id),
      }));
    },
    [update],
  );

  const archiveProfile = useCallback(
    (id: string) => {
      update((current) => {
        const profiles = setProfileArchived(current.profiles, id, true);
        return {
          ...current,
          profiles,
          activeProfileId: resolveActiveProfileId(profiles, current.activeProfileId),
        };
      });
    },
    [update],
  );

  const resetDemo = useCallback(async () => {
    await clearAllAlbumFiles();
    await clearAllRecordingFiles();
    await clearState();
    const fresh = defaultState();
    setState({
      ...fresh,
      daily: ensureTodayLesson(null, fresh.words, fresh.progress),
    });
    setParentUnlocked(false);
  }, []);

  const exportSnapshot = useCallback(() => state, [state]);

  const replaceState = useCallback((next: PersistedState) => {
    setState({
      ...next,
      daily: ensureTodayLesson(next.daily, next.words, next.progress),
    });
  }, []);

  const visibleState = useMemo(() => projectProfile(state), [state]);

  const value = useMemo<DeskContextValue>(
    () => ({
      ready,
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
      removeWord,
      setWordRecording,
      importWordText,
      addBookWordToToday,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      enableChallengeModes,
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
      progressFor,
      dictationTypeFor,
    }),
    [
      ready,
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
      removeWord,
      setWordRecording,
      importWordText,
      addBookWordToToday,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      enableChallengeModes,
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
