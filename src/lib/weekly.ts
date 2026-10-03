import {
  PROOFREAD_PACK_SOURCE,
  type GlossSuggestion,
  type ProofreadEntry,
} from '../content/proofreadStarterPack.ts';
import type {
  ContentGroup,
  ContentMigration,
  ContentSource,
  DailyLesson,
  DailyScope,
  PersistedState,
  WeeklyPlan,
  WeeklyReadiness,
  WeeklySelection,
  Word,
  WordProgress,
} from '../types/models.ts';
import { buildDailyLesson, ensureTodayLesson } from './daily.ts';
import { profileIdOf, resolveActiveProfileId, wordsForProfile } from './profile.ts';
import { addDays, createId } from './util.ts';

export type DailyClaim = {
  profileId: string;
  cardId: string;
};

const READINESS: WeeklyReadiness[] = ['ready-to-spell', 'familiarize'];

export function normalizeWordKey(en: string): string {
  return en.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function emptyWeeklyPlan(profileId: string): WeeklyPlan {
  return { profileId, enabled: false, wordIds: [], readiness: {}, pending: null };
}

export function editableWeeklySelection(plan: WeeklyPlan | undefined, profileId: string): WeeklySelection {
  if (plan?.pending) {
    return {
      enabled: plan.pending.enabled,
      wordIds: plan.pending.wordIds,
      readiness: plan.pending.readiness,
    };
  }
  if (plan) return { enabled: plan.enabled, wordIds: plan.wordIds, readiness: plan.readiness };
  return { enabled: false, wordIds: [], readiness: {} };
}

export function hasStartedTodayCard(
  lesson: DailyLesson | null | undefined,
  date: string,
  profileId: string,
): boolean {
  if (!lesson || lesson.date !== date) return false;
  if (lesson.profileId && lesson.profileId !== profileId) return false;
  const count = lesson.vocabWordIds.length + lesson.dictationWordIds.length;
  if (count > 0) return true;
  return lesson.scope === 'weekly';
}

export function weeklyEffectCopy(
  lesson: DailyLesson | null | undefined,
  profileId: string,
  date: string,
): string {
  if (hasStartedTodayCard(lesson, date, profileId)) {
    return `今天的今日卡会保留。这次修改从 ${addDays(date, 1)} 起生效，周一也不会自动清空。`;
  }
  return '今天还没有已经开始的今日卡。保存后，下一张今日卡使用这次选择。';
}

export function weeklyEmptyChildCopy(): string {
  return '本周清单里还没有可以练的词。请爸爸到书桌的「本周选词」勾选。不会从别的词库补词，今天也还没有完成。';
}

export function legacyDailyCopy(lesson: DailyLesson | null | undefined): string | null {
  if (!lesson) return null;
  return '有一张更早的今日卡无法确定属于哪一个孩子，已保留为旧记录。完成进度没有复制给任何一个孩子。';
}

export function rollWeeklyPlan(plan: WeeklyPlan | undefined, date: string): WeeklyPlan | undefined {
  if (!plan?.pending || plan.pending.effectiveOn > date) return plan;
  const { effectiveOn: _effectiveOn, ...selection } = plan.pending;
  return { ...plan, ...selection, pending: null };
}

export function commitWeeklySelection(
  plan: WeeklyPlan | undefined,
  profileId: string,
  next: WeeklySelection,
  date: string,
  todayCard: DailyLesson | null | undefined,
): WeeklyPlan {
  const base = plan ?? emptyWeeklyPlan(profileId);
  const selection = sanitizeSelection(next);
  if (!hasStartedTodayCard(todayCard, date, profileId)) {
    return { ...base, ...selection, profileId, pending: null };
  }
  return {
    ...base,
    profileId,
    pending: { ...selection, effectiveOn: addDays(date, 1) },
  };
}

export function setWeeklyReadiness(
  plan: WeeklyPlan,
  wordId: string,
  readiness: WeeklyReadiness,
  date: string,
  todayCard: DailyLesson | null | undefined,
): WeeklyPlan {
  const current = editableWeeklySelection(plan, plan.profileId);
  if (!current.wordIds.includes(wordId)) return plan;
  return commitWeeklySelection(
    plan,
    plan.profileId,
    { ...current, readiness: { ...current.readiness, [wordId]: readiness } },
    date,
    todayCard,
  );
}

export function attributeLegacyDaily(
  daily: DailyLesson | null | undefined,
  words: Word[],
  createCardId: () => string = () => createId('card'),
):
  | { kind: 'none' }
  | { kind: 'assigned'; profileId: string; lesson: DailyLesson }
  | { kind: 'legacy'; lesson: DailyLesson } {
  if (!daily) return { kind: 'none' };
  const ids = lessonWordIds(daily);
  if (ids.length === 0) return { kind: 'none' };
  const byId = new Map(words.map((word) => [word.id, word]));
  const profiles = new Set<string>();
  for (const id of ids) {
    const word = byId.get(id);
    if (!word) return { kind: 'legacy', lesson: daily };
    profiles.add(profileIdOf(word));
  }
  if (profiles.size !== 1) return { kind: 'legacy', lesson: daily };
  const profileId = [...profiles][0];
  return {
    kind: 'assigned',
    profileId,
    lesson: {
      ...daily,
      profileId,
      cardId: daily.cardId || createCardId(),
      scope: daily.scope ?? 'library',
    },
  };
}

export function ensureProfileLesson(input: {
  current: DailyLesson | null;
  words: Word[];
  progress: Record<string, WordProgress>;
  plan: WeeklyPlan | undefined;
  profileId: string;
  date: string;
  random?: () => number;
  createCardId?: () => string;
}): DailyLesson {
  const random = input.random ?? Math.random;
  const createCardId = input.createCardId ?? (() => createId('card'));
  const plan = rollWeeklyPlan(input.plan, input.date) ?? emptyWeeklyPlan(input.profileId);
  const current = input.current;
  const sameDay = Boolean(current && current.date === input.date && current.profileId === input.profileId);
  if (sameDay && current?.scope === 'weekly') {
    return current.cardId ? current : { ...current, cardId: createCardId() };
  }
  const count = sameDay && current ? current.vocabWordIds.length + current.dictationWordIds.length : 0;
  if (sameDay && current && count > 0 && current.scope !== 'weekly') {
    const next = ensureTodayLesson(current, input.words, input.progress, input.date, random);
    if (next === current) {
      return current.cardId && current.scope
        ? current
        : { ...current, profileId: input.profileId, scope: 'library', cardId: current.cardId || createCardId() };
    }
    return stampLesson(next, input.profileId, 'library', createCardId);
  }
  if (plan.enabled) {
    const pool = wordsInOrder(plan.wordIds, input.words);
    if (pool.length === 0) return blankLesson(input.date, input.profileId, 'weekly', createCardId());
    return stampLesson(
      buildDailyLesson(pool, input.progress, input.date, undefined, random),
      input.profileId,
      'weekly',
      createCardId,
    );
  }
  if (sameDay && current?.scope === 'library') {
    return current.cardId ? current : { ...current, cardId: createCardId() };
  }
  return stampLesson(
    buildDailyLesson(input.words, input.progress, input.date, undefined, random),
    input.profileId,
    'library',
    createCardId,
  );
}

export function resolveActiveLearningDay(
  state: PersistedState,
  date: string,
  random: () => number = Math.random,
  createCardId?: () => string,
): PersistedState {
  const profileId = resolveActiveProfileId(state.profiles, state.activeProfileId);
  const rolled = rollWeeklyPlan(state.weeklyByProfile[profileId], date);
  const weeklyByProfile = rolled
    ? { ...state.weeklyByProfile, [profileId]: rolled }
    : state.weeklyByProfile;
  const lesson = ensureProfileLesson({
    current: state.dailyByProfile[profileId] ?? null,
    words: wordsForProfile(state.words, profileId),
    progress: state.progress,
    plan: weeklyByProfile[profileId],
    profileId,
    date,
    random,
    createCardId,
  });
  return withActiveDaily(
    { ...state, weeklyByProfile, activeProfileId: profileId },
    lesson,
  );
}

export function withActiveDaily(state: PersistedState, lesson: DailyLesson): PersistedState {
  const profileId = lesson.profileId ?? resolveActiveProfileId(state.profiles, state.activeProfileId);
  return {
    ...state,
    daily: lesson,
    dailyByProfile: { ...state.dailyByProfile, [profileId]: lesson },
  };
}

export function acceptDailyClaim(
  state: PersistedState,
  claim: DailyClaim | undefined,
  wordId: string,
  kind: 'vocab' | 'dictation',
): boolean {
  if (!claim?.profileId || !claim.cardId) return false;
  const active = resolveActiveProfileId(state.profiles, state.activeProfileId);
  if (claim.profileId !== active) return false;
  const lesson = state.dailyByProfile[active];
  if (!lesson || lesson.cardId !== claim.cardId || lesson.profileId !== claim.profileId) return false;
  const ids = kind === 'vocab' ? lesson.vocabWordIds : lesson.dictationWordIds;
  return ids.includes(wordId);
}

export function detachWord(state: PersistedState, wordId: string): PersistedState {
  const contentGroups = state.contentGroups.map((group) =>
    group.wordIds.includes(wordId) ? { ...group, wordIds: group.wordIds.filter((id) => id !== wordId) } : group,
  );
  const weeklyByProfile = Object.fromEntries(
    Object.entries(state.weeklyByProfile).map(([profileId, plan]) => [profileId, removeFromPlan(plan, wordId)]),
  );
  const dailyByProfile = Object.fromEntries(
    Object.entries(state.dailyByProfile).map(([profileId, lesson]) => [profileId, removeFromLesson(lesson, wordId)]),
  );
  const active = resolveActiveProfileId(state.profiles, state.activeProfileId);
  return {
    ...state,
    contentGroups,
    weeklyByProfile,
    dailyByProfile,
    daily: dailyByProfile[active] ?? state.daily,
  };
}

export function findProfileWord(words: Word[], profileId: string, en: string): Word | undefined {
  const key = normalizeWordKey(en);
  return words.find((word) => profileIdOf(word) === profileId && normalizeWordKey(word.en) === key);
}

export function addWordToContentGroups(
  groups: ContentGroup[],
  profileId: string,
  wordId: string,
  groupIds: string[],
): ContentGroup[] {
  const wanted = new Set(groupIds);
  return groups.map((group) => {
    if (group.profileId !== profileId || !wanted.has(group.id) || group.wordIds.includes(wordId)) return group;
    return { ...group, wordIds: [...group.wordIds, wordId] };
  });
}

export function createContentGroup(
  groups: ContentGroup[],
  input: { profileId: string; name: string; now: string; createId?: (prefix: string) => string; source?: ContentSource },
): ContentGroup[] {
  const name = input.name.trim();
  if (!name) return groups;
  const makeId = input.createId ?? createId;
  const source = input.source ?? {
    id: makeId('src'),
    kind: 'parent' as const,
    label: '家长自建',
  };
  return [
    ...groups,
    {
      id: makeId('group'),
      profileId: input.profileId,
      name,
      sources: [source],
      wordIds: [],
      createdAt: input.now,
    },
  ];
}

export function removeContentGroup(groups: ContentGroup[], groupId: string): ContentGroup[] {
  return groups.filter((group) => group.id !== groupId);
}

export function importProofreadPack(input: {
  words: Word[];
  groups: ContentGroup[];
  profileId: string;
  entries?: ProofreadEntry[];
  now: string;
  createId?: (prefix: string) => string;
}): { words: Word[]; groups: ContentGroup[]; added: number; linked: number; groupId: string } {
  const entries = input.entries ?? [];
  const makeId = input.createId ?? createId;
  const groupId = `group_proofread_${input.profileId}`;
  let groups = input.groups;
  let group = groups.find((item) => item.id === groupId && item.profileId === input.profileId);
  if (!group) {
    group = {
      id: groupId,
      profileId: input.profileId,
      name: '校对首包',
      sources: [PROOFREAD_PACK_SOURCE],
      wordIds: [],
      createdAt: input.now,
    };
    groups = [...groups, group];
  } else if (!group.sources.some((source) => source.id === PROOFREAD_PACK_SOURCE.id)) {
    group = { ...group, sources: [...group.sources, PROOFREAD_PACK_SOURCE] };
    groups = groups.map((item) => (item.id === groupId ? group! : item));
  }
  let words = input.words;
  let added = 0;
  let linked = 0;
  const wordIds = [...group.wordIds];
  for (const entry of entries) {
    let word = findProfileWord(words, input.profileId, entry.en);
    if (!word) {
      word = {
        id: makeId('word'),
        en: entry.en.trim().replace(/\s+/g, ' '),
        zh: entry.zh,
        source: 'parent',
        createdAt: input.now,
        profileId: input.profileId,
      };
      words = [...words, word];
      added += 1;
    } else {
      linked += 1;
    }
    if (!wordIds.includes(word.id)) wordIds.push(word.id);
  }
  groups = groups.map((item) => (item.id === groupId ? { ...item, wordIds } : item));
  return { words, groups, added, linked, groupId };
}

export type CorrectionPreview = {
  wordId: string;
  en: string;
  field: 'zh';
  current: string;
  suggested: string;
  reason: string;
};

export function previewGlossCorrections(
  words: Word[],
  profileId: string,
  suggestions: GlossSuggestion[],
): CorrectionPreview[] {
  const out: CorrectionPreview[] = [];
  for (const suggestion of suggestions) {
    const word = findProfileWord(words, profileId, suggestion.en);
    if (!word || word.zh === suggestion.zh) continue;
    out.push({
      wordId: word.id,
      en: word.en,
      field: 'zh',
      current: word.zh,
      suggested: suggestion.zh,
      reason: suggestion.reason,
    });
  }
  return out;
}

export function applyGlossCorrections(
  words: Word[],
  picks: Array<{ wordId: string; suggested: string }>,
): Word[] {
  const chosen = new Map(picks.map((pick) => [pick.wordId, pick.suggested]));
  return words.map((word) => {
    const suggested = chosen.get(word.id);
    if (!suggested || suggested === word.zh) return word;
    return { ...word, zh: suggested };
  });
}

export function migrateContentFields(
  raw: Partial<PersistedState>,
  words: Word[],
  activeProfileId: string,
): Pick<
  PersistedState,
  | 'contentGroups'
  | 'weeklyByProfile'
  | 'dailyByProfile'
  | 'legacyDaily'
  | 'daily'
  | 'contentSchema'
  | 'contentMigration'
> {
  if (raw.contentSchema !== undefined && raw.contentSchema !== 1) {
    throw new Error('这份存档的数据版本暂不支持，请先更新学习台');
  }
  const contentGroups = readGroups(raw.contentGroups);
  const weeklyByProfile = readWeekly(raw.weeklyByProfile);
  let dailyByProfile = readDailyMap(raw.dailyByProfile);
  let legacyDaily = raw.legacyDaily === undefined || raw.legacyDaily === null ? null : readLesson(raw.legacyDaily, '旧今日卡');
  const already = raw.contentMigration?.legacyDailyAttributed === true || raw.dailyByProfile !== undefined;
  if (!already) {
    const attributed = attributeLegacyDaily(raw.daily ?? null, words);
    if (attributed.kind === 'assigned') {
      dailyByProfile = { ...dailyByProfile, [attributed.profileId]: attributed.lesson };
    } else if (attributed.kind === 'legacy') {
      legacyDaily = attributed.lesson;
    }
  }
  const migration: ContentMigration = { legacyDailyAttributed: true };
  return {
    contentGroups,
    weeklyByProfile,
    dailyByProfile,
    legacyDaily,
    daily: dailyByProfile[activeProfileId] ?? null,
    contentSchema: 1,
    contentMigration: migration,
  };
}

export function lessonWordIds(lesson: DailyLesson): string[] {
  return [...new Set([
    ...lesson.vocabWordIds,
    ...lesson.dictationWordIds,
    ...lesson.completedVocabIds,
    ...lesson.completedDictationIds,
  ])];
}

function sanitizeSelection(next: WeeklySelection): WeeklySelection {
  const wordIds: string[] = [];
  const seen = new Set<string>();
  for (const id of next.wordIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    wordIds.push(id);
  }
  const readiness: WeeklySelection['readiness'] = {};
  for (const id of wordIds) {
    const value = next.readiness[id];
    readiness[id] = value === 'ready-to-spell' ? 'ready-to-spell' : 'familiarize';
  }
  return { enabled: Boolean(next.enabled), wordIds, readiness };
}

function stampLesson(
  lesson: DailyLesson,
  profileId: string,
  scope: DailyScope,
  createCardId: () => string,
): DailyLesson {
  return {
    ...lesson,
    profileId,
    scope,
    cardId: createCardId(),
  };
}

function blankLesson(date: string, profileId: string, scope: DailyScope, cardId: string): DailyLesson {
  return {
    date,
    vocabWordIds: [],
    dictationWordIds: [],
    completedVocabIds: [],
    completedDictationIds: [],
    profileId,
    cardId,
    scope,
  };
}

function wordsInOrder(ids: string[], words: Word[]): Word[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  const out: Word[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const word = byId.get(id);
    if (!word || seen.has(word.id)) continue;
    seen.add(word.id);
    out.push(word);
  }
  return out;
}

function removeFromPlan(plan: WeeklyPlan, wordId: string): WeeklyPlan {
  return {
    ...plan,
    wordIds: plan.wordIds.filter((id) => id !== wordId),
    readiness: omitKey(plan.readiness, wordId),
    pending: plan.pending
      ? {
          ...plan.pending,
          wordIds: plan.pending.wordIds.filter((id) => id !== wordId),
          readiness: omitKey(plan.pending.readiness, wordId),
        }
      : null,
  };
}

function omitKey(readiness: Record<string, WeeklyReadiness>, wordId: string): Record<string, WeeklyReadiness> {
  if (!(wordId in readiness)) return readiness;
  const next = { ...readiness };
  delete next[wordId];
  return next;
}

function removeFromLesson(lesson: DailyLesson, wordId: string): DailyLesson {
  return {
    ...lesson,
    vocabWordIds: lesson.vocabWordIds.filter((id) => id !== wordId),
    dictationWordIds: lesson.dictationWordIds.filter((id) => id !== wordId),
    completedVocabIds: lesson.completedVocabIds.filter((id) => id !== wordId),
    completedDictationIds: lesson.completedDictationIds.filter((id) => id !== wordId),
  };
}

function fail(label: string): never {
  throw new Error(`这份存档的数据版本暂不支持，请先更新学习台（${label}）`);
}

function readGroups(raw: unknown): ContentGroup[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail('内容分组');
  return raw.map((item) => {
    if (!item || typeof item !== 'object') fail('内容分组');
    const group = item as Partial<ContentGroup>;
    if (!group.id || !group.profileId || typeof group.name !== 'string' || !group.createdAt) fail('内容分组');
    return {
      id: group.id,
      profileId: group.profileId,
      name: group.name,
      sources: readSources(group.sources),
      wordIds: readIdList(group.wordIds, '分组词'),
      createdAt: group.createdAt,
    };
  });
}

function readSources(raw: unknown): ContentSource[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail('内容来源');
  return raw.map((item) => {
    if (!item || typeof item !== 'object') fail('内容来源');
    const source = item as Partial<ContentSource>;
    if (!source.id || !source.label || (source.kind !== 'pdf' && source.kind !== 'textbook' && source.kind !== 'parent')) {
      fail('内容来源');
    }
    return {
      id: source.id,
      kind: source.kind,
      label: source.label,
      ...(source.locator ? { locator: source.locator } : {}),
    };
  });
}

function readWeekly(raw: unknown): Record<string, WeeklyPlan> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('本周清单');
  const out: Record<string, WeeklyPlan> = {};
  for (const [profileId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') fail('本周清单');
    const plan = value as Partial<WeeklyPlan>;
    if (plan.profileId !== profileId || typeof plan.enabled !== 'boolean') fail('本周清单');
    const selection = sanitizeSelection({
      enabled: plan.enabled,
      wordIds: readIdList(plan.wordIds, '本周词'),
      readiness: readReadiness(plan.readiness),
    });
    out[profileId] = {
      profileId,
      ...selection,
      pending: plan.pending == null ? null : readPending(plan.pending),
    };
  }
  return out;
}

function readPending(raw: unknown): WeeklyPlan['pending'] {
  if (!raw || typeof raw !== 'object') fail('本周清单生效时间');
  const pending = raw as WeeklyPlan['pending'];
  if (!pending || typeof pending.enabled !== 'boolean' || typeof pending.effectiveOn !== 'string') fail('本周清单生效时间');
  const selection = sanitizeSelection({
    enabled: pending.enabled,
    wordIds: readIdList(pending.wordIds, '待生效本周词'),
    readiness: readReadiness(pending.readiness),
  });
  return { ...selection, effectiveOn: pending.effectiveOn };
}

function readReadiness(raw: unknown): Record<string, WeeklyReadiness> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('准备情况');
  const out: Record<string, WeeklyReadiness> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!READINESS.includes(value as WeeklyReadiness)) fail('准备情况');
    out[id] = value as WeeklyReadiness;
  }
  return out;
}

function readDailyMap(raw: unknown): Record<string, DailyLesson> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('按档案今日卡');
  const out: Record<string, DailyLesson> = {};
  for (const [profileId, value] of Object.entries(raw)) {
    const lesson = readLesson(value, '按档案今日卡');
    if (lesson.profileId && lesson.profileId !== profileId) fail('按档案今日卡');
    out[profileId] = { ...lesson, profileId };
  }
  return out;
}

function readLesson(raw: unknown, label: string): DailyLesson {
  if (!raw || typeof raw !== 'object') fail(label);
  const lesson = raw as Partial<DailyLesson>;
  if (typeof lesson.date !== 'string') fail(label);
  const next: DailyLesson = {
    date: lesson.date,
    vocabWordIds: readIdList(lesson.vocabWordIds, label),
    dictationWordIds: readIdList(lesson.dictationWordIds, label),
    completedVocabIds: readIdList(lesson.completedVocabIds, label),
    completedDictationIds: readIdList(lesson.completedDictationIds, label),
  };
  if (lesson.profileId) next.profileId = lesson.profileId;
  if (lesson.cardId) next.cardId = lesson.cardId;
  if (lesson.scope) {
    if (lesson.scope !== 'library' && lesson.scope !== 'weekly') fail(label);
    next.scope = lesson.scope;
  }
  return next;
}

function readIdList(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== 'string' || !id)) fail(label);
  if (new Set(raw).size !== raw.length) fail(label);
  return raw;
}
