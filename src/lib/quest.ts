import type { ParsedWord } from './parseWordList.ts';
import { addDays, todayKey } from './util.ts';
import type {
  QuestDay,
  QuestModeIndex,
  QuestNewCount,
  QuestStars,
  QuestState,
  QuestWordItem,
  Word,
} from '../types/models.ts';

/** 首次学会后第 1、2、4、7 天复习。 */
export const QUEST_REVIEW_OFFSETS = [1, 2, 4, 7] as const;
export const DEFAULT_QUEST_NEW_COUNT: QuestNewCount = 20;
export const QUEST_NEW_COUNTS: QuestNewCount[] = [10, 20, 30];
export const QUEST_STARS_TO_CLEAR = 3;
export const QUEST_MODE_COUNT = 3;

export const QUEST_MODES: Array<{
  index: QuestModeIndex;
  title: string;
  hint: string;
}> = [
  { index: 0, title: '听音选词', hint: '听发音，选出正确的英语单词' },
  { index: 1, title: '听中文选词', hint: '看/听中文释义，选出英语单词' },
  { index: 2, title: '跟读单词', hint: '跟着示范读，读完点「我读好了」' },
];

/** 听选关每个选项都带中文，避免只给正确答案加释义。 */
export function listenPickOptionParts(
  en: string,
  zh: string,
): { label: string; subtitle?: string } {
  const label = en.trim();
  const subtitle = zh.trim();
  return subtitle ? { label, subtitle } : { label };
}

/** 空词库时可先练的几个家庭示例词，不是商业词库。 */
export const SAMPLE_KET_ENS = ['apple', 'book', 'cat', 'water', 'school', 'friend'] as const;

export function emptyQuestState(): QuestState {
  return {
    cursor: 0,
    dailyNewCount: DEFAULT_QUEST_NEW_COUNT,
    items: {},
    day: null,
    packWordIds: [],
  };
}

export function clampQuestNewCount(value: unknown): QuestNewCount {
  const n = typeof value === 'number' ? value : Number(value);
  if (n <= 10) return 10;
  if (n >= 30) return 30;
  return 20;
}

export function emptyQuestStars(): QuestStars {
  return [0, 0, 0];
}

function isQuestModeIndex(value: number): value is QuestModeIndex {
  return value === 0 || value === 1 || value === 2;
}

export function normalizeQuestDay(raw: unknown): QuestDay | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<QuestDay>;
  if (typeof data.date !== 'string' || !data.date) return null;
  const starsRaw = Array.isArray(data.stars) ? data.stars : [];
  const stars: QuestStars = [
    Math.min(QUEST_STARS_TO_CLEAR, Math.max(0, Number(starsRaw[0] ?? 0) || 0)),
    Math.min(QUEST_STARS_TO_CLEAR, Math.max(0, Number(starsRaw[1] ?? 0) || 0)),
    Math.min(QUEST_STARS_TO_CLEAR, Math.max(0, Number(starsRaw[2] ?? 0) || 0)),
  ];
  const ids = Array.isArray(data.ids) ? data.ids.filter((id): id is string => typeof id === 'string') : [];
  const newIds = Array.isArray(data.newIds)
    ? data.newIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    date: data.date,
    ids,
    newIds,
    stars,
    complete: Boolean(data.complete),
  };
}

export function normalizeQuestItem(raw: unknown): QuestWordItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<QuestWordItem>;
  if (typeof data.learnedOn !== 'string' || !data.learnedOn) return null;
  const step = Math.max(0, Math.floor(Number(data.step ?? 0) || 0));
  const nextDue = data.nextDue === null || data.nextDue === undefined ? null : String(data.nextDue);
  return {
    learnedOn: data.learnedOn,
    step,
    nextDue: nextDue && nextDue.length > 0 ? nextDue : null,
  };
}

export function normalizeQuestState(raw: unknown): QuestState {
  const empty = emptyQuestState();
  if (!raw || typeof raw !== 'object') return empty;
  const data = raw as Partial<QuestState>;
  const items: Record<string, QuestWordItem> = {};
  if (data.items && typeof data.items === 'object') {
    for (const [id, value] of Object.entries(data.items)) {
      const item = normalizeQuestItem(value);
      if (item) items[id] = item;
    }
  }
  const packWordIds = Array.isArray(data.packWordIds)
    ? data.packWordIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const cursor = Math.max(0, Math.floor(Number(data.cursor ?? 0) || 0));
  return {
    cursor,
    dailyNewCount: clampQuestNewCount(data.dailyNewCount),
    items,
    day: normalizeQuestDay(data.day),
    packWordIds,
  };
}

export function normalizeQuestByProfile(raw: unknown): Record<string, QuestState> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, QuestState> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!id) continue;
    out[id] = normalizeQuestState(value);
  }
  return out;
}

export function mergeKetPackIds(packWordIds: string[], extra: string[]): string[] {
  const seen = new Set(packWordIds);
  const out = [...packWordIds];
  for (const id of extra) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function packWordsOf(words: Word[], packWordIds: string[]): Word[] {
  const map = new Map(words.map((word) => [word.id, word]));
  const out: Word[] = [];
  for (const id of packWordIds) {
    const word = map.get(id);
    if (word) out.push(word);
  }
  return out;
}

export function livingPackIds(packWordIds: string[], existingIds: Set<string>): string[] {
  return packWordIds.filter((id) => existingIds.has(id));
}

export type WordImportPlan = {
  newItems: ParsedWord[];
  skipped: number;
  existingIds: string[];
};

/** 追加导入：跳过当前档案里已有的英文；已有词可再标进闯关词库。 */
export function planWordImportForQuest(parsed: ParsedWord[], profileWords: Word[]): WordImportPlan {
  const byEn = new Map(profileWords.map((word) => [word.en.toLowerCase(), word]));
  const seen = new Set<string>();
  const newItems: ParsedWord[] = [];
  const existingIds: string[] = [];
  let skipped = 0;
  for (const item of parsed) {
    const key = item.en.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    const hit = byEn.get(key);
    if (hit) {
      skipped += 1;
      existingIds.push(hit.id);
    } else {
      newItems.push(item);
    }
  }
  return { newItems, skipped, existingIds };
}

/** 按粘贴/文件行序排闯关词库：已有词用旧 id，新词用这次生成的 id。 */
export function ketPackIdsInFileOrder(
  parsed: ParsedWord[],
  profileWords: Word[],
  incomingIdsByEn: Map<string, string>,
): string[] {
  const existingByEn = new Map(profileWords.map((word) => [word.en.toLowerCase(), word.id]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    const key = item.en.toLowerCase();
    const id = existingByEn.get(key) ?? incomingIdsByEn.get(key);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isSampleKetEn(en: string): boolean {
  return SAMPLE_KET_ENS.includes(en.toLowerCase() as (typeof SAMPLE_KET_ENS)[number]);
}

export function questOf(
  questByProfile: Record<string, QuestState> | undefined,
  profileId: string,
): QuestState {
  return questByProfile?.[profileId] ?? emptyQuestState();
}

export type QuestDayCounts = {
  newCount: number;
  reviewCount: number;
  total: number;
};

export function questDayCounts(day: QuestDay | null): QuestDayCounts {
  if (!day) return { newCount: 0, reviewCount: 0, total: 0 };
  const newCount = day.newIds.length;
  const total = day.ids.length;
  return { newCount, reviewCount: Math.max(0, total - newCount), total };
}

/** 走完今日这批词一次即过关。旧存档里已有 1～2 星也视为本关已过，方便当天续关。 */
export function questModeCleared(starCount: number): boolean {
  return starCount > 0;
}

export function currentQuestMode(day: QuestDay | null): QuestModeIndex | 'done' {
  if (!day || day.complete) return 'done';
  for (let i = 0; i < QUEST_MODE_COUNT; i += 1) {
    if (!questModeCleared(day.stars[i]) && isQuestModeIndex(i)) return i;
  }
  return 'done';
}

export function formatQuestStars(count: number): string {
  const n = Math.min(QUEST_STARS_TO_CLEAR, Math.max(0, count));
  return `${'★'.repeat(n)}${'☆'.repeat(QUEST_STARS_TO_CLEAR - n)}`;
}

export function nextDueAfterStep(learnedOn: string, step: number): string | null {
  if (step <= 0) return learnedOn;
  if (step > QUEST_REVIEW_OFFSETS.length) return null;
  return addDays(learnedOn, QUEST_REVIEW_OFFSETS[step - 1]);
}

export function advanceQuestItem(item: QuestWordItem): QuestWordItem {
  const step = item.step + 1;
  return {
    ...item,
    step,
    nextDue: nextDueAfterStep(item.learnedOn, step),
  };
}

function pruneDay(day: QuestDay, existingIds: Set<string>): QuestDay {
  return {
    ...day,
    ids: day.ids.filter((id) => existingIds.has(id)),
    newIds: day.newIds.filter((id) => existingIds.has(id)),
  };
}

/**
 * 若今日尚未建卡：未完成的到期复习 + 按词库顺序最多 N 个新词。
 * 今日已有卡则只清掉已删的词，不重抽。
 */
export function ensureQuestDay(
  quest: QuestState,
  existingIds: Set<string>,
  today = todayKey(),
): QuestState {
  const packWordIds = livingPackIds(quest.packWordIds, existingIds);
  const items = { ...quest.items };

  if (quest.day?.date === today) {
    return {
      ...quest,
      packWordIds,
      day: pruneDay(quest.day, existingIds),
    };
  }

  const due = packWordIds.filter((id) => {
    const item = items[id];
    return Boolean(item?.nextDue && item.nextDue <= today);
  });

  const newIds: string[] = [];
  for (const id of packWordIds) {
    if (newIds.length >= quest.dailyNewCount) break;
    if (items[id]) continue;
    newIds.push(id);
    items[id] = { learnedOn: today, step: 0, nextDue: today };
  }

  const assigned = packWordIds.filter((id) => Boolean(items[id])).length;
  return {
    ...quest,
    packWordIds,
    items,
    cursor: assigned,
    day: {
      date: today,
      ids: [...due, ...newIds],
      newIds,
      stars: emptyQuestStars(),
      complete: false,
    },
  };
}

export function completeQuestDay(quest: QuestState): QuestState {
  const day = quest.day;
  if (!day || day.complete) return quest;
  const items = { ...quest.items };
  for (const id of day.ids) {
    const item = items[id];
    if (!item) continue;
    items[id] = advanceQuestItem(item);
  }
  return {
    ...quest,
    items,
    day: { ...day, complete: true },
  };
}

export type QuestRoundResult = {
  quest: QuestState;
  starGained: boolean;
  modeCleared: boolean;
  dayComplete: boolean;
};

/**
 * 走完今日这批词一次即过本关，不再每关连刷三轮。
 * 对错只影响星级：全对 ★★★，有错 ★☆☆；都算做完，不整关重来。
 * 三关都过后才推进间隔复习。
 */
export function applyQuestRound(
  quest: QuestState,
  mode: QuestModeIndex,
  allCorrect: boolean,
): QuestRoundResult {
  const day = quest.day;
  if (!day || day.complete) {
    return { quest, starGained: false, modeCleared: false, dayComplete: Boolean(day?.complete) };
  }
  const stars: QuestStars = [...day.stars];
  if (questModeCleared(stars[mode])) {
    const alreadyDone = stars.every((count) => questModeCleared(count));
    return { quest, starGained: false, modeCleared: true, dayComplete: alreadyDone };
  }
  stars[mode] = allCorrect ? QUEST_STARS_TO_CLEAR : 1;
  const allCleared = stars.every((count) => questModeCleared(count));
  const next: QuestState = { ...quest, day: { ...day, stars } };
  if (allCleared) {
    const completed = completeQuestDay(next);
    return { quest: completed, starGained: true, modeCleared: true, dayComplete: true };
  }
  return { quest: next, starGained: true, modeCleared: true, dayComplete: false };
}

export function setWordInKetPack(quest: QuestState, wordId: string, on: boolean): QuestState {
  if (on) {
    return { ...quest, packWordIds: mergeKetPackIds(quest.packWordIds, [wordId]) };
  }
  return {
    ...quest,
    packWordIds: quest.packWordIds.filter((id) => id !== wordId),
    day: quest.day
      ? {
          ...quest.day,
          ids: quest.day.ids.filter((id) => id !== wordId),
          newIds: quest.day.newIds.filter((id) => id !== wordId),
        }
      : quest.day,
  };
}

export function pruneQuestWord(quest: QuestState, wordId: string): QuestState {
  const { [wordId]: _removed, ...items } = quest.items;
  return {
    ...setWordInKetPack(quest, wordId, false),
    items,
  };
}

/** 用词上的 ketPack 标记补全空词库顺序（旧存档升级）。 */
export function hydrateQuestPacks(
  questByProfile: Record<string, QuestState>,
  words: Word[],
  profileIdOfWord: (word: Word) => string,
): Record<string, QuestState> {
  const next = { ...questByProfile };
  const extras = new Map<string, string[]>();
  for (const word of words) {
    if (!word.ketPack) continue;
    const profileId = profileIdOfWord(word);
    const list = extras.get(profileId) ?? [];
    list.push(word.id);
    extras.set(profileId, list);
  }
  for (const [profileId, ids] of extras) {
    const current = next[profileId] ?? emptyQuestState();
    next[profileId] = {
      ...current,
      packWordIds: mergeKetPackIds(current.packWordIds, ids),
    };
  }
  return next;
}

export function patchQuest(
  questByProfile: Record<string, QuestState>,
  profileId: string,
  quest: QuestState,
): Record<string, QuestState> {
  return { ...questByProfile, [profileId]: quest };
}
