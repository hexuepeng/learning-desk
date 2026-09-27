import type { Sentence, Word } from '../types/models.ts';
import { normalizeSentenceKey, parseSentenceList } from './parseSentenceList.ts';
import { profileIdOf, wordsForProfile } from './profile.ts';
import { linkSentenceWordIds, normalizeTags } from './sentences.ts';
import { createId } from './util.ts';

export type SentenceImportMode = 'append' | 'replace';

export type ApplySentenceListImportOptions = {
  mode?: SentenceImportMode;
  now?: string;
  createId?: (prefix: string) => string;
  tags?: string[];
};

export type ApplySentenceListImportResult = {
  sentences: Sentence[];
  added: number;
  skipped: number;
  removedRecordings: string[];
};

/** 追加或替换短句库；重复英文跳过。不碰词表。 */
export function applySentenceListImport(
  sentences: Sentence[],
  words: Word[],
  profileId: string,
  text: string,
  options: ApplySentenceListImportOptions = {},
): ApplySentenceListImportResult {
  const parsed = parseSentenceList(text);
  if (parsed.length === 0) {
    return { sentences, added: 0, skipped: 0, removedRecordings: [] };
  }
  const mode = options.mode ?? 'append';
  const now = options.now ?? new Date().toISOString();
  const makeId = options.createId ?? createId;
  const tags = normalizeTags(options.tags ?? []);

  const removedRecordings: string[] = [];
  if (mode === 'replace') {
    for (const item of sentences) {
      if (profileIdOf(item) === profileId && item.recordingUri) {
        removedRecordings.push(item.recordingUri);
      }
    }
  }

  const base = mode === 'replace' ? sentences.filter((item) => profileIdOf(item) !== profileId) : sentences;
  const have = new Set(
    base.filter((item) => profileIdOf(item) === profileId).map((item) => normalizeSentenceKey(item.en)),
  );
  const incoming: Sentence[] = [];
  let added = 0;
  let skipped = 0;
  const profileWords = wordsForProfile(words, profileId);
  for (const item of parsed) {
    const key = normalizeSentenceKey(item.en);
    if (have.has(key)) {
      skipped += 1;
      continue;
    }
    have.add(key);
    added += 1;
    const wordIds = linkSentenceWordIds(item.en, profileWords);
    const sentence: Sentence = {
      id: makeId('sentence'),
      en: item.en,
      createdAt: now,
      profileId,
    };
    if (item.zh) sentence.zh = item.zh;
    if (tags.length) sentence.tags = tags;
    if (wordIds.length) sentence.wordIds = wordIds;
    incoming.push(sentence);
  }

  return {
    sentences: [...incoming, ...base],
    added,
    skipped,
    removedRecordings,
  };
}
