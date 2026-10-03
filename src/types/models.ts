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
  /**
   * 可选英式 IPA。约定写成带斜杠：`/ˈæpl/`。
   * 导入或输入时可省略斜杠，存盘时归一成带斜杠；缺省或空字符串表示没有音标。
   * 只收英式，不混美式。
   */
  ipa?: string;
  /** 本机家长录音相对路径；有则播放优先于 TTS */
  recordingUri?: string | null;
  profileId?: string;
  /** 家长导入的闯关词库标记。KET 闯关按词库顺序学，与今日卡分开。 */
  ketPack?: boolean;
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

export type DailyScope = 'library' | 'weekly';

export type DailyLesson = {
  date: string;
  vocabWordIds: string[];
  dictationWordIds: string[];
  completedVocabIds: string[];
  completedDictationIds: string[];
  /** 0.1.31 起按孩子保存。缺省表示尚未归属的旧卡。 */
  profileId?: string;
  /** 旧页面提交必须带上这张卡的标识，避免串到后来的孩子或新卡。 */
  cardId?: string;
  /** library 沿用整份词表；weekly 只从本周清单抽。 */
  scope?: DailyScope;
};

export type ContentSourceKind = 'pdf' | 'textbook' | 'parent';

export type ContentSource = {
  id: string;
  kind: ContentSourceKind;
  /** 文件名、教材名，或「家长自建」。 */
  label: string;
  /** 页码、条目或单元。可以空。 */
  locator?: string;
};

export type ContentGroup = {
  id: string;
  profileId: string;
  name: string;
  sources: ContentSource[];
  wordIds: string[];
  createdAt: string;
};

/** 家长判断，不是考试成绩，也不表示已经会拼。 */
export type WeeklyReadiness = 'ready-to-spell' | 'familiarize';

export type WeeklySelection = {
  enabled: boolean;
  wordIds: string[];
  readiness: Record<string, WeeklyReadiness>;
};

export type WeeklyPlan = WeeklySelection & {
  profileId: string;
  /** 当天已经有卡时，新选择留到 effectiveOn 再生效。 */
  pending: (WeeklySelection & { effectiveOn: string }) | null;
};

export type ContentMigration = {
  /** 旧的全局今日卡只归属一次，避免导入或重启时复制完成记录。 */
  legacyDailyAttributed: boolean;
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

export type Sentence = {
  id: string;
  /** 英文短句，必填 */
  en: string;
  /** 可选中文对照 */
  zh?: string;
  createdAt: string;
  /** 句中能对上当前词表的词 id */
  wordIds?: string[];
  /** 可选标签，如 weekly */
  tags?: string[];
  profileId?: string;
  /** 本机家长录音相对路径；有则播放优先于 TTS */
  recordingUri?: string | null;
};

export type SentenceProgress = {
  sentenceId: string;
  heard: number;
  canSay: boolean;
  lastPracticedAt?: string;
};

export type SentenceSettings = {
  /** 短句练习是否计入今日卡。默认关。 */
  countTowardDaily: boolean;
};

export type QuestNewCount = 5 | 10 | 20 | 30;

export type QuestModeIndex = 0 | 1 | 2;

export type QuestStars = [number, number, number];

export type QuestAnswerOutcome = 'correct' | 'incorrect' | 'self-reported';

export type QuestAnswer = {
  outcome: QuestAnswerOutcome;
  submittedAt: string;
};

/** 每个闯关词的间隔复习进度。nextDue 按首次学会日 + 1/2/4/7 天。 */
export type QuestWordItem = {
  learnedOn: string;
  step: number;
  nextDue: string | null;
};

export type QuestDay = {
  date: string;
  ids: string[];
  newIds: string[];
  stars: QuestStars;
  complete: boolean;
  /** 键为「关卡序号:wordId」；旧存档缺省为空，已有星级仍优先。 */
  answers?: Record<string, QuestAnswer>;
};

/** 按孩子档案保存的闯关状态。默认不计入今日卡。 */
export type QuestState = {
  cursor: number;
  dailyNewCount: QuestNewCount;
  items: Record<string, QuestWordItem>;
  day: QuestDay | null;
  /** 闯关词库顺序（家长导入追加）。游标按这个顺序取新词。 */
  packWordIds: string[];
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
  sentences: Sentence[];
  sentenceProgress: Record<string, SentenceProgress>;
  sentenceSettings: SentenceSettings;
  streak: StreakState;
  stars: StarState;
  practiceLog: PracticeEvent[];
  daily: DailyLesson | null;
  parentPin: string;
  profiles: Profile[];
  activeProfileId: string;
  /** 每个孩子档案一份闯关 / SRS 进度 */
  questByProfile: Record<string, QuestState>;
  /** 按孩子分组。删分组不删词。 */
  contentGroups: ContentGroup[];
  /** 每个孩子一份本周清单。缺省档案表示还没开。 */
  weeklyByProfile: Record<string, WeeklyPlan>;
  /** 0.1.31 起今日卡按档案保存。 */
  dailyByProfile: Record<string, DailyLesson>;
  /** 无法唯一归属的旧全局今日卡。只作说明，不复制完成记录。 */
  legacyDaily: DailyLesson | null;
  /** 本模块添加式迁移。只接受 1；更高版本拒绝而不是清空。 */
  contentSchema: 1;
  contentMigration: ContentMigration;
};
