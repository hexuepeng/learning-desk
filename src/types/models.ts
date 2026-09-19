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
  /**
   * 可选英式 IPA。约定写成带斜杠：`/ˈæpl/`。
   * 导入或输入时可省略斜杠，存盘时归一成带斜杠；缺省或空字符串表示没有音标。
   * 只收英式，不混美式。
   */
  ipa?: string;
  /** 本机家长录音相对路径；有则播放优先于 TTS */
  recordingUri?: string | null;
  profileId?: string;
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

export type FeedbackKind = 'too-hard' | 'too-easy' | 'boring' | 'note';

export type FeedbackItem = {
  id: string;
  text: string;
  kind: FeedbackKind;
  createdAt: string;
  read: boolean;
  handled: boolean;
};

export type AlbumPage = {
  id: string;
  /** 本机文档目录相对路径，或尚未拷贝时的临时 URI */
  photoUri: string;
  caption: string;
  /** 可选中文释义，仅展示不朗读 */
  captionZh: string;
  /** 本机家长录音相对路径；有则朗读说明时优先播放 */
  recordingUri?: string | null;
};

export type AlbumBook = {
  id: string;
  title: string;
  pages: AlbumPage[];
  createdAt: string;
  profileId?: string;
};

export type Profile = {
  id: string;
  name: string;
  createdAt: string;
  archived: boolean;
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

export type StarRating = 1 | 2 | 3;

export type PracticeEvent = {
  id: string;
  date: string;
  kind: 'vocab' | 'dictation';
  source: 'daily' | 'free' | 'review';
  wordId: string;
  correct?: boolean;
};

export type StarState = {
  /** 按日保存最好的一轮默写星级，用于连续满分日 */
  byDate: Record<string, StarRating>;
  celebrationKey: string | null;
};

export type PersistedState = {
  version: 1;
  words: Word[];
  progress: Record<string, WordProgress>;
  dictationSettings: DictationSettings;
  /** 孩子端是否显示音标。缺省为开。 */
  showIpa: boolean;
  feedback: FeedbackItem[];
  albumBooks: AlbumBook[];
  streak: StreakState;
  stars: StarState;
  practiceLog: PracticeEvent[];
  daily: DailyLesson | null;
  parentPin: string;
  profiles: Profile[];
  activeProfileId: string;
};
