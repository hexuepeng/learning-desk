import { DEFAULT_KET_PACK_TEXT } from '../content/ket-a2-default-bundle.ts';
import type { PersistedState, QuestState, Word } from '../types/models.ts';
import { parseWordList } from './parseWordList.ts';
import { profileIdOf, resolveActiveProfileId, wordsForProfile } from './profile.ts';
import {
  ketPackIdsInFileOrder,
  livingPackIds,
  mergeKetPackIds,
  patchQuest,
  planWordImportForQuest,
  pruneQuestWord,
  questOf,
} from './quest.ts';
import { createId } from './util.ts';

export const DEFAULT_KET_PACK_SIZE = 1792;

export type WordImportMode = 'append' | 'replace';

export type ApplyWordListImportOptions = {
  mode?: WordImportMode;
  ketPack?: boolean;
  rebuildPack?: boolean;
  /** 追加进闯关词库时：默认接在后面；prepend 把这次的词排到前面，方便先练新单元。 */
  packMerge?: 'append' | 'prepend';
  now?: string;
  createId?: (prefix: string) => string;
};

export type ApplyWordListImportResult = {
  words: Word[];
  quest: QuestState;
  added: number;
  skipped: number;
  packAdded: number;
  removedIds: string[];
  removedRecordings: string[];
};

/** 追加或替换词表；勾选闯关时按文件行序排本机 KET 词库。 */
export function applyWordListImport(
  words: Word[],
  quest: QuestState,
  profileId: string,
  text: string,
  options: ApplyWordListImportOptions = {},
): ApplyWordListImportResult {
  const parsed = parseWordList(text);
  if (parsed.length === 0) {
    return {
      words,
      quest,
      added: 0,
      skipped: 0,
      packAdded: 0,
      removedIds: [],
      removedRecordings: [],
    };
  }
  const mode = options.mode ?? 'append';
  const ketPack = Boolean(options.ketPack);
  const rebuildPack = Boolean(options.rebuildPack);
  const now = options.now ?? new Date().toISOString();
  const makeId = options.createId ?? createId;

  const removedRecordings: string[] = [];
  const removedIds: string[] = [];
  if (mode === 'replace') {
    for (const word of words) {
      if (profileIdOf(word) !== profileId) continue;
      removedIds.push(word.id);
      if (word.recordingUri) removedRecordings.push(word.recordingUri);
    }
  }

  const base = mode === 'replace' ? words.filter((word) => profileIdOf(word) !== profileId) : words;
  const profileWords = wordsForProfile(base, profileId);
  const plan = planWordImportForQuest(parsed, profileWords);
  const have = new Set(base.map((word) => word.en.toLowerCase()));
  const incoming: Word[] = [];
  let added = 0;
  let skipped = plan.skipped;
  for (const item of plan.newItems) {
    if (have.has(item.en.toLowerCase())) {
      skipped += 1;
      continue;
    }
    have.add(item.en.toLowerCase());
    added += 1;
    incoming.push({
      id: makeId('word'),
      en: item.en,
      zh: item.zh,
      ipa: item.ipa,
      source: 'parent',
      createdAt: now,
      profileId,
      ketPack: ketPack || undefined,
    });
  }
  const incomingByEn = new Map(incoming.map((word) => [word.en.toLowerCase(), word.id]));
  const packIds = ketPack ? ketPackIdsInFileOrder(parsed, profileWords, incomingByEn) : [];
  const marked = ketPack
    ? [...incoming, ...base].map((word) => (packIds.includes(word.id) ? { ...word, ketPack: true } : word))
    : [...incoming, ...base];

  let nextQuest = quest;
  if (mode === 'replace') {
    nextQuest = removedIds.reduce((acc, id) => pruneQuestWord(acc, id), nextQuest);
  }
  if (ketPack) {
    const merged =
      options.packMerge === 'prepend'
        ? mergeKetPackIds(packIds, nextQuest.packWordIds)
        : mergeKetPackIds(nextQuest.packWordIds, packIds);
    nextQuest = {
      ...nextQuest,
      packWordIds: mode === 'replace' || rebuildPack ? packIds : merged,
    };
  }

  return {
    words: marked,
    quest: nextQuest,
    added,
    skipped,
    packAdded: packIds.length,
    removedIds,
    removedRecordings,
  };
}

export function applyDefaultKetPack(
  words: Word[],
  quest: QuestState,
  profileId: string,
  options: Omit<ApplyWordListImportOptions, 'ketPack' | 'rebuildPack' | 'mode'> = {},
): ApplyWordListImportResult {
  return applyWordListImport(words, quest, profileId, DEFAULT_KET_PACK_TEXT, {
    ...options,
    mode: 'append',
    ketPack: true,
    rebuildPack: true,
  });
}

/** 本机闯关词库没有任何仍存在的词时，种入内置默认包。 */
export function seedDefaultKetPackIfEmpty(state: PersistedState): PersistedState {
  const profileId = resolveActiveProfileId(state.profiles, state.activeProfileId);
  const profileWords = wordsForProfile(state.words, profileId);
  const quest = questOf(state.questByProfile, profileId);
  const living = livingPackIds(
    quest.packWordIds,
    new Set(profileWords.map((word) => word.id)),
  );
  if (living.length > 0) return state;
  const result = applyDefaultKetPack(state.words, quest, profileId);
  return {
    ...state,
    words: result.words,
    questByProfile: patchQuest(state.questByProfile ?? {}, profileId, result.quest),
  };
}
