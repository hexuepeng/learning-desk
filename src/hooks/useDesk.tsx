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
  clampEnabledTypes,
  currentDictationType,
  emptyProgress,
  applyDictationResult,
} from '@/lib/dictation';
import {
  ensureTodayLesson,
  isDailyComplete,
  markDictationDone,
  markVocabDone,
} from '@/lib/daily';
import { parseWordList } from '@/lib/parseWordList';
import { clearState, defaultState, loadState, saveState } from '@/lib/storage';
import { applyDailyComplete } from '@/lib/streak';
import { createId, todayKey } from '@/lib/util';
import type {
  AlbumBook,
  AlbumPage,
  DictationType,
  PersistedState,
  Word,
  WordProgress,
} from '@/types/models';

type DeskContextValue = {
  ready: boolean;
  state: PersistedState;
  parentUnlocked: boolean;
  unlockParent: (pin: string) => boolean;
  lockParent: () => void;
  changePin: (pin: string) => boolean;
  upsertWord: (input: { id?: string; en: string; zh: string }) => void;
  removeWord: (id: string) => void;
  importWordText: (text: string) => number;
  restoreSampleWords: () => void;
  setDictationType: (type: DictationType, on: boolean) => void;
  setAutoAdjust: (on: boolean) => void;
  markVocab: (wordId: string, known: boolean, daily?: boolean) => void;
  markDictation: (wordId: string, correct: boolean, daily?: boolean) => WordProgress;
  addFeedback: (text: string) => void;
  markFeedbackRead: (id: string) => void;
  addAlbumBook: (book: Omit<AlbumBook, 'id' | 'createdAt'> & { id?: string }) => Promise<string>;
  updateAlbumBook: (id: string, patch: { title?: string }) => void;
  addAlbumPage: (
    bookId: string,
    page: Omit<AlbumPage, 'id'> & { id?: string },
  ) => Promise<string | null>;
  updateAlbumPage: (
    bookId: string,
    pageId: string,
    patch: Partial<Pick<AlbumPage, 'caption' | 'captionZh' | 'photoUri'>>,
  ) => void;
  removeAlbumPage: (bookId: string, pageId: string) => Promise<void>;
  removeAlbumBook: (id: string) => Promise<void>;
  resetDemo: () => Promise<void>;
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
        };
        return { ...current, words: [word, ...current.words] };
      });
    },
    [update],
  );

  const removeWord = useCallback(
    (id: string) => {
      update((current) => ({
        ...current,
        words: current.words.filter((word) => word.id !== id),
      }));
    },
    [update],
  );

  const importWordText = useCallback(
    (text: string) => {
      const parsed = parseWordList(text);
      if (parsed.length === 0) return 0;
      update((current) => {
        const have = new Set(current.words.map((word) => word.en.toLowerCase()));
        const added: Word[] = [];
        for (const item of parsed) {
          if (have.has(item.en.toLowerCase())) continue;
          have.add(item.en.toLowerCase());
          added.push({
            id: createId('word'),
            en: item.en,
            zh: item.zh,
            source: 'parent',
            createdAt: new Date().toISOString(),
          });
        }
        return { ...current, words: [...added, ...current.words] };
      });
      return parsed.length;
    },
    [update],
  );

  const restoreSampleWords = useCallback(() => {
    update((current) => {
      const samples = createSampleWords();
      const parentWords = current.words.filter((word) => word.source === 'parent');
      const have = new Set(parentWords.map((word) => word.en.toLowerCase()));
      return {
        ...current,
        words: [...parentWords, ...samples.filter((word) => !have.has(word.en.toLowerCase()))],
      };
    });
  }, [update]);

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
        return maybeAwardStreak({ ...current, progress, daily: nextDaily });
      });
    },
    [update],
  );

  const markDictation = useCallback(
    (wordId: string, correct: boolean, daily = false) => {
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
        return maybeAwardStreak({ ...current, progress, daily: nextDaily });
      });
      return nextProgress;
    },
    [update],
  );

  const addFeedback = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      update((current) => ({
        ...current,
        feedback: [
          {
            id: createId('fb'),
            text: trimmed,
            createdAt: new Date().toISOString(),
            read: false,
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
            },
            () => pageId,
          ),
        );
      }
      const next = buildAlbumBook(
        { id, title: book.title, pages, createdAt: new Date().toISOString() },
        () => id,
        () => new Date().toISOString(),
      );
      update((current) => ({
        ...current,
        albumBooks: upsertAlbumBook(current.albumBooks, next),
      }));
      return id;
    },
    [update],
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
      const nextPage = buildAlbumPage(
        { id: pageId, photoUri, caption: page.caption, captionZh: page.captionZh },
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
      patch: Partial<Pick<AlbumPage, 'caption' | 'captionZh' | 'photoUri'>>,
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

  const removeAlbumPage = useCallback(
    async (bookId: string, pageId: string) => {
      let photoUri: string | undefined;
      update((current) => {
        const book = current.albumBooks.find((item) => item.id === bookId);
        photoUri = book?.pages.find((item) => item.id === pageId)?.photoUri;
        if (!book) return current;
        return {
          ...current,
          albumBooks: replaceBook(current.albumBooks, removePageFromBook(book, pageId)),
        };
      });
      if (photoUri) await deleteAlbumPhoto(photoUri);
    },
    [update],
  );

  const removeAlbumBook = useCallback(
    async (id: string) => {
      await deleteAlbumBookFiles(id);
      update((current) => ({
        ...current,
        albumBooks: removeAlbumBookById(current.albumBooks, id),
      }));
    },
    [update],
  );

  const resetDemo = useCallback(async () => {
    await clearAllAlbumFiles();
    await clearState();
    const fresh = defaultState();
    setState({
      ...fresh,
      daily: ensureTodayLesson(null, fresh.words, fresh.progress),
    });
    setParentUnlocked(false);
  }, []);

  const value = useMemo<DeskContextValue>(
    () => ({
      ready,
      state,
      parentUnlocked,
      unlockParent,
      lockParent,
      changePin,
      upsertWord,
      removeWord,
      importWordText,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      markVocab,
      markDictation,
      addFeedback,
      markFeedbackRead,
      addAlbumBook,
      updateAlbumBook,
      addAlbumPage,
      updateAlbumPage,
      removeAlbumPage,
      removeAlbumBook,
      resetDemo,
      progressFor,
      dictationTypeFor,
    }),
    [
      ready,
      state,
      parentUnlocked,
      unlockParent,
      lockParent,
      changePin,
      upsertWord,
      removeWord,
      importWordText,
      restoreSampleWords,
      setDictationType,
      setAutoAdjust,
      markVocab,
      markDictation,
      addFeedback,
      markFeedbackRead,
      addAlbumBook,
      updateAlbumBook,
      addAlbumPage,
      updateAlbumPage,
      removeAlbumPage,
      removeAlbumBook,
      resetDemo,
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
