import type {
  DailyLesson,
  Sentence,
  SentenceProgress,
  SentenceSettings,
  Word,
  WordProgress,
} from '../types/models.ts';

import { normalizeSentenceKey } from './parseSentenceList.ts';
import { shuffle } from './util.ts';

/** 模板里当动词用的一小撮功能词，不是商业词库。 */
export const TINY_VERBISH = new Set([
  'read',
  'write',
  'listen',
  'play',
  'eat',
  'go',
  'see',
  'like',
  'have',
  'make',
  'come',
  'look',
  'want',
]);

export type SentenceDraft = {
  en: string;
  zh: string;
  wordIds: string[];
};

export function defaultSentenceSettings(): SentenceSettings {
  return { countTowardDaily: false };
}

export function emptySentenceProgress(sentenceId: string): SentenceProgress {
  return { sentenceId, heard: 0, canSay: false };
}

export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = item.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function parseTagInput(text: string): string[] {
  return normalizeTags(text.split(/[,，、\s]+/));
}

export function normalizeSentences(raw: unknown): Sentence[] {
  if (!Array.isArray(raw)) return [];
  const out: Sentence[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const data = item as Partial<Sentence>;
    const en = typeof data.en === 'string' ? data.en.trim().replace(/\s+/g, ' ') : '';
    if (!en || !/[A-Za-z]/.test(en)) continue;
    const key = normalizeSentenceKey(en);
    if (seen.has(key)) continue;
    seen.add(key);
    const zh = typeof data.zh === 'string' ? data.zh.trim() : '';
    const sentence: Sentence = {
      id: typeof data.id === 'string' && data.id ? data.id : `sentence_${out.length}`,
      en,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    };
    if (zh) sentence.zh = zh;
    const wordIds = Array.isArray(data.wordIds)
      ? data.wordIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
      : [];
    if (wordIds.length) sentence.wordIds = wordIds;
    const tags = normalizeTags(data.tags);
    if (tags.length) sentence.tags = tags;
    if (typeof data.profileId === 'string' && data.profileId) sentence.profileId = data.profileId;
    if (data.recordingUri === null || typeof data.recordingUri === 'string') {
      sentence.recordingUri = data.recordingUri;
    }
    out.push(sentence);
  }
  return out;
}

export function normalizeSentenceSettings(raw: unknown): SentenceSettings {
  const data = raw && typeof raw === 'object' ? (raw as Partial<SentenceSettings>) : {};
  return { countTowardDaily: data.countTowardDaily === true };
}

export function normalizeSentenceProgress(raw: unknown): Record<string, SentenceProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, SentenceProgress> = {};
  for (const [id, item] of Object.entries(raw as Record<string, unknown>)) {
    if (!item || typeof item !== 'object') continue;
    const data = item as Partial<SentenceProgress>;
    out[id] = {
      sentenceId: typeof data.sentenceId === 'string' && data.sentenceId ? data.sentenceId : id,
      heard: typeof data.heard === 'number' && data.heard > 0 ? Math.floor(data.heard) : 0,
      canSay: data.canSay === true,
      lastPracticedAt: typeof data.lastPracticedAt === 'string' ? data.lastPracticedAt : undefined,
    };
  }
  return out;
}

/** 把句中词和当前词表对上（短语优先）。 */
export function linkSentenceWordIds(en: string, words: Word[]): string[] {
  const haystack = ` ${en.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (haystack.trim().length === 0) return [];
  const sorted = [...words].sort((a, b) => b.en.length - a.en.length);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const word of sorted) {
    const needle = word.en.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!needle || seen.has(word.id)) continue;
    if (haystack.includes(` ${needle} `)) {
      seen.add(word.id);
      ids.push(word.id);
    }
  }
  return ids;
}

export function filterSentences(sentences: Sentence[], query: string): Sentence[] {
  const q = query.trim().toLowerCase();
  if (!q) return sentences;
  return sentences.filter((item) => {
    const tags = (item.tags ?? []).join(' ');
    return (
      item.en.toLowerCase().includes(q) ||
      (item.zh ?? '').toLowerCase().includes(q) ||
      tags.includes(q)
    );
  });
}

export function hasWeeklyTag(sentence: Sentence): boolean {
  return (sentence.tags ?? []).includes('weekly');
}

/** 有 weekly 标签时先练本周句；未点「我会说了」的优先。 */
export function orderSentenceDeck(
  sentences: Sentence[],
  progress: Record<string, SentenceProgress>,
  random: () => number = Math.random,
): Sentence[] {
  const weekly = sentences.filter(hasWeeklyTag);
  const pool = weekly.length > 0 ? weekly : sentences;
  const fresh: Sentence[] = [];
  const said: Sentence[] = [];
  for (const item of pool) {
    if (progress[item.id]?.canSay) said.push(item);
    else fresh.push(item);
  }
  return [...shuffle(fresh, random), ...shuffle(said, random)];
}

export function isVerbishWord(word: Word): boolean {
  return TINY_VERBISH.has(word.en.trim().toLowerCase());
}

export function englishArticle(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? 'an' : 'a';
}

export function pickComposeWords(
  words: Word[],
  progress: Record<string, WordProgress>,
  daily: DailyLesson | null,
  count = 4,
  random: () => number = Math.random,
): Word[] {
  if (words.length === 0) return [];
  const byId = new Map(words.map((word) => [word.id, word]));
  const today: Word[] = [];
  if (daily) {
    for (const id of [...daily.vocabWordIds, ...daily.dictationWordIds]) {
      const word = byId.get(id);
      if (word) today.push(word);
    }
  }
  const known = words.filter((word) => progress[word.id]?.vocabKnown);
  const take = Math.min(Math.max(count, 2), 4, words.length);
  const picked: Word[] = [];
  const seen = new Set<string>();
  for (const word of [...shuffle(today, random), ...shuffle(known, random), ...shuffle(words, random)]) {
    if (seen.has(word.id)) continue;
    seen.add(word.id);
    picked.push(word);
    if (picked.length >= take) break;
  }
  return picked;
}

/**
 * 用当前词表拼 1–3 句粗糙短句，供爸爸改完再存。
 * 模板极少，偏英式口语，不内置商业句库。
 */
export function composeSentenceDrafts(
  words: Word[],
  progress: Record<string, WordProgress>,
  daily: DailyLesson | null,
  random: () => number = Math.random,
): SentenceDraft[] {
  const picked = pickComposeWords(words, progress, daily, 4, random);
  if (picked.length === 0) return [];
  const nouns = picked.filter((word) => !isVerbishWord(word));
  const verbs = picked.filter((word) => isVerbishWord(word));
  const drafts: SentenceDraft[] = [];

  if (nouns[0]) {
    drafts.push({ en: `I like ${nouns[0].en}.`, zh: '', wordIds: [nouns[0].id] });
    drafts.push({
      en: `Have you got ${englishArticle(nouns[0].en)} ${nouns[0].en}?`,
      zh: '',
      wordIds: [nouns[0].id],
    });
  } else if (verbs[0]) {
    drafts.push({ en: `I like to ${verbs[0].en}.`, zh: '', wordIds: [verbs[0].id] });
  }

  if (nouns.length >= 2) {
    drafts.push({
      en: `We can see the ${nouns[0].en} and the ${nouns[1].en}.`,
      zh: '',
      wordIds: [nouns[0].id, nouns[1].id],
    });
  } else if (verbs[0] && nouns[0]) {
    drafts.push({
      en: `I can ${verbs[0].en} the ${nouns[0].en}.`,
      zh: '',
      wordIds: [verbs[0].id, nouns[0].id],
    });
  } else if (verbs[0]) {
    drafts.push({ en: `We like to ${verbs[0].en}.`, zh: '', wordIds: [verbs[0].id] });
  } else if (picked[1]) {
    drafts.push({
      en: `This is my ${picked[1].en}.`,
      zh: '',
      wordIds: [picked[1].id],
    });
  }

  const seen = new Set<string>();
  const unique: SentenceDraft[] = [];
  for (const draft of drafts) {
    const key = normalizeSentenceKey(draft.en);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(draft);
    if (unique.length >= 3) break;
  }
  return unique;
}

export function markSentenceHeard(
  prev: SentenceProgress | undefined,
  sentenceId: string,
  at = new Date().toISOString(),
): SentenceProgress {
  const base = prev ?? emptySentenceProgress(sentenceId);
  return {
    ...base,
    sentenceId,
    heard: base.heard + 1,
    lastPracticedAt: at,
  };
}

export function markSentenceCanSay(
  prev: SentenceProgress | undefined,
  sentenceId: string,
  at = new Date().toISOString(),
): SentenceProgress {
  const base = prev ?? emptySentenceProgress(sentenceId);
  return {
    ...base,
    sentenceId,
    canSay: true,
    lastPracticedAt: at,
  };
}
