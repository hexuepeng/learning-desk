import type { PersistedState } from '../types/models.ts';

type Row = Record<string, unknown>;
type Check = (value: unknown) => boolean;

function invalid(label: string): never {
  throw new Error(`存档数据结构不正确：${label}。请保留原文件并检查备份版本。`);
}

function object(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown, label: string): Row {
  if (!object(value) || Object.keys(value).some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) invalid(label);
  return value;
}

const text: Check = (value) => typeof value === 'string';
const nonempty: Check = (value) => typeof value === 'string' && value.trim().length > 0;
const bool: Check = (value) => typeof value === 'boolean';
const integer: Check = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date: Check = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
const strings: Check = (value) => Array.isArray(value) && value.every(nonempty);
const uniqueStrings: Check = (value) => strings(value) && new Set(value as string[]).size === (value as string[]).length;

function field(row: Row, key: string, check: Check, required = true): void {
  if ((!required && row[key] === undefined) || check(row[key])) return;
  invalid(key);
}

function rows(value: unknown, label: string): Row[] {
  if (!Array.isArray(value)) invalid(label);
  const ids = new Set<string>();
  return value.map((value) => {
    const row = record(value, label);
    field(row, 'id', nonempty);
    if (ids.has(row.id as string)) invalid(`${label}含重复标识`);
    ids.add(row.id as string);
    return row;
  });
}

function media(row: Row): void {
  if (row.recordingUri !== null) field(row, 'recordingUri', text, false);
}

/** 历史版本可以缺少后来增加的顶层字段；已有字段必须是可读取的形状。 */
export function assertPersistedStateShape(raw: unknown, complete = false): asserts raw is PersistedState {
  const data = record(raw, '状态');
  if (data.version !== 1) throw new Error('这份存档的数据版本暂不支持，请先更新学习台');
  const words = rows(data.words, '词表');
  const profiles = rows(data.profiles ?? (complete ? undefined : []), '孩子档案');
  const profileIds = new Set(profiles.map((profile) => profile.id as string));
  const contentProfile = (row: Row) => {
    field(row, 'profileId', nonempty, false);
    if (row.profileId !== undefined && profileIds.size && !profileIds.has(row.profileId as string)) invalid('内容所属档案不存在');
  };
  profiles.forEach((row) => {
    field(row, 'name', text);
    field(row, 'createdAt', text, complete);
    field(row, 'archived', bool, complete);
  });
  field(data, 'activeProfileId', nonempty, complete);
  if (complete && (!profileIds.size || !profileIds.has(data.activeProfileId as string))) invalid('当前孩子档案不存在');
  words.forEach((word) => {
    field(word, 'en', nonempty);
    field(word, 'zh', text);
    field(word, 'createdAt', text, complete);
    field(word, 'source', (value) => value === 'sample' || value === 'parent', complete);
    field(word, 'ipa', text, false);
    field(word, 'ketPack', bool, false);
    media(word);
    contentProfile(word);
  });
  rows(data.sentences ?? (complete ? undefined : []), '短句').forEach((sentence) => {
    field(sentence, 'en', nonempty);
    field(sentence, 'zh', text, false);
    field(sentence, 'createdAt', text, complete);
    field(sentence, 'wordIds', strings, false);
    field(sentence, 'tags', strings, false);
    media(sentence);
    contentProfile(sentence);
  });
  rows(data.albumBooks ?? (complete ? undefined : []), '相册书').forEach((book) => {
    field(book, 'title', text);
    field(book, 'createdAt', text, complete);
    contentProfile(book);
    rows(book.pages, '书页').forEach((page) => {
      field(page, 'photoUri', nonempty);
      field(page, 'caption', text, complete);
      field(page, 'captionZh', text, complete);
      media(page);
    });
  });
  for (const [key, value] of Object.entries(record(data.progress ?? (complete ? undefined : {}), '单词进度'))) {
    const progress = record(value, `单词进度 ${key}`);
    field(progress, 'wordId', nonempty);
    for (const fieldName of ['vocabSeen', 'dictationLevelIndex', 'consecutiveCorrect', 'consecutiveWrong']) field(progress, fieldName, integer);
    field(progress, 'vocabKnown', bool);
    field(progress, 'lastPracticedAt', text, false);
  }
  for (const [key, value] of Object.entries(record(data.sentenceProgress ?? (complete ? undefined : {}), '短句进度'))) {
    const progress = record(value, `短句进度 ${key}`);
    field(progress, 'sentenceId', nonempty);
    field(progress, 'heard', integer);
    field(progress, 'canSay', bool);
    field(progress, 'lastPracticedAt', text, false);
  }
  if (data.dictationSettings !== undefined || complete) {
    const settings = record(data.dictationSettings, '默写设置');
    field(settings, 'enabledTypes', (value) => Array.isArray(value) && value.every((item) => ['pick-word', 'fill-letters', 'arrange-letters', 'write-from-chinese', 'listen-write'].includes(item)));
    field(settings, 'autoAdjust', bool, complete);
  }
  if (data.sentenceSettings !== undefined || complete) field(record(data.sentenceSettings, '短句设置'), 'countTowardDaily', bool);
  field(data, 'showIpa', bool, complete);
  field(data, 'parentPin', (value) => typeof value === 'string' && /^\d{4}$/.test(value), complete);
  rows(data.feedback ?? (complete ? undefined : []), '留言').forEach((feedback) => {
    field(feedback, 'text', text);
    field(feedback, 'kind', (value) => ['too-hard', 'too-easy', 'boring', 'note'].includes(value as string));
    field(feedback, 'createdAt', text);
    field(feedback, 'read', bool);
    field(feedback, 'handled', bool, complete);
  });
  rows(data.practiceLog ?? (complete ? undefined : []), '练习记录').forEach((practice) => {
    field(practice, 'date', date);
    field(practice, 'kind', (value) => value === 'vocab' || value === 'dictation');
    field(practice, 'source', (value) => ['daily', 'free', 'review'].includes(value as string));
    field(practice, 'wordId', nonempty);
    field(practice, 'correct', bool, false);
  });
  if (data.streak !== undefined || complete) {
    const streak = record(data.streak, '连续学习');
    field(streak, 'current', integer);
    field(streak, 'lastDate', (value) => value === '' || date(value));
    field(streak, 'stickers', strings);
  }
  if (data.stars !== undefined || complete) {
    const stars = record(data.stars, '星星记录');
    if (stars.byDate !== undefined || complete) {
      for (const [key, value] of Object.entries(record(stars.byDate, '每日星星'))) if (!date(key) || ![1, 2, 3].includes(value as number)) invalid('每日星星');
    } else {
      // 早期 JSON 用最近评分表达星星记录，由 normalizeStarState 迁移。
      field(stars, 'lastRatedDate', (value) => value === '' || date(value), false);
      field(stars, 'lastStars', (value) => value === null || [1, 2, 3].includes(value as number), false);
      field(stars, 'consecutiveThreeStarDays', integer, false);
    }
    field(stars, 'celebrationKey', (value) => value === null || text(value), complete);
  }
  if (data.daily !== undefined && data.daily !== null) {
    const daily = record(data.daily, '今日卡');
    field(daily, 'date', date);
    for (const name of ['vocabWordIds', 'dictationWordIds', 'completedVocabIds', 'completedDictationIds']) field(daily, name, uniqueStrings);
  } else if (complete && data.daily === undefined) invalid('今日卡字段缺失');

  for (const [profileId, value] of Object.entries(record(data.questByProfile ?? (complete ? undefined : {}), '闯关进度'))) {
    if (profileIds.size && !profileIds.has(profileId)) invalid('闯关档案不存在');
    const quest = record(value, '孩子闯关进度');
    field(quest, 'cursor', integer);
    field(quest, 'dailyNewCount', (count) => [5, 10, 20, 30].includes(count as number));
    field(quest, 'packWordIds', uniqueStrings, complete);
    for (const item of Object.values(record(quest.items, '逐词闯关进度'))) {
      const progress = record(item, '逐词闯关进度');
      field(progress, 'learnedOn', date);
      field(progress, 'step', integer);
      field(progress, 'nextDue', (value) => value === null || date(value));
    }
    if (quest.day === null) continue;
    const day = record(quest.day, '当日闯关');
    field(day, 'date', date);
    field(day, 'ids', uniqueStrings);
    field(day, 'newIds', uniqueStrings);
    const ids = day.ids as string[];
    if ((day.newIds as string[]).some((id) => !ids.includes(id))) invalid('当日新词不在任务中');
    field(day, 'stars', (value) => Array.isArray(value) && value.length === 3 && value.every((star) => integer(star) && star <= 3));
    field(day, 'complete', bool);
    if (day.answers !== undefined) {
      for (const [key, value] of Object.entries(record(day.answers, '关内作答'))) {
        const match = /^([012]):(.+)$/.exec(key);
        if (!match || !ids.includes(match[2])) invalid('关内作答词条');
        const answer = record(value, '关内作答');
        field(answer, 'outcome', (outcome) => match[1] === '2' ? outcome === 'self-reported' : outcome === 'correct' || outcome === 'incorrect');
        field(answer, 'submittedAt', nonempty);
      }
    }
  }
}
