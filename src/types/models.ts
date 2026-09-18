export type DictationType =
  | 'pick-word'
  | 'fill-letters'
  | 'arrange-letters'
  | 'write-from-chinese'
  | 'listen-write';

export type WordSource = 'sample' | 'parent';

export type Word = {
  id: string;
  en: string;
  zh: string;
  source: WordSource;
  createdAt: string;
  /** 家长录音覆盖；v0.1 仅预留 */
  recordingUri?: string | null;
};

export type WordProgress = {
  wordId: string;
  vocabSeen: number;
  vocabKnown: boolean;
  dictationLevelIndex: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  lastPracticedAt?: string;
};

export type DictationSettings = {
  enabledTypes: DictationType[];
  autoAdjust: boolean;
};

export type FeedbackItem = {
  id: string;
  text: string;
  createdAt: string;
  read: boolean;
};

export type AlbumPage = {
  id: string;
  /** 本机文档目录相对路径，或尚未拷贝时的临时 URI */
  photoUri: string;
  caption: string;
  /** 可选中文释义，仅展示不朗读 */
  captionZh: string;
};

export type AlbumBook = {
  id: string;
  title: string;
  pages: AlbumPage[];
  createdAt: string;
};

export type MiniBookPage = {
  en: string;
  zh: string;
  art: string;
};

export type MiniBook = {
  id: string;
  titleZh: string;
  titleEn: string;
  coverArt: string;
  pages: MiniBookPage[];
};

export type StreakState = {
  current: number;
  lastDate: string;
  stickers: string[];
};

export type DailyLesson = {
  date: string;
  vocabWordIds: string[];
  dictationWordIds: string[];
  completedVocabIds: string[];
  completedDictationIds: string[];
};

export type PersistedState = {
  version: 1;
  words: Word[];
  progress: Record<string, WordProgress>;
  dictationSettings: DictationSettings;
  feedback: FeedbackItem[];
  albumBooks: AlbumBook[];
  streak: StreakState;
  daily: DailyLesson | null;
  parentPin: string;
};
