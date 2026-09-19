import {
  createPackWords,
  DEFAULT_WORD_PACK_ID,
  type WordPackId,
} from '../content/familyWordPacks.ts';
import type { PersistedState, Word } from '../types/models.ts';

import { stampWords } from './profile.ts';

export function mergeWordLists(
  base: Word[],
  incoming: Word[],
): { words: Word[]; added: number; skipped: number } {
  const have = new Set(base.map((word) => word.en.toLowerCase()));
  const extra: Word[] = [];
  let skipped = 0;
  for (const word of incoming) {
    const key = word.en.toLowerCase();
    if (have.has(key)) {
      skipped += 1;
      continue;
    }
    have.add(key);
    extra.push(word);
  }
  return { words: [...extra, ...base], added: extra.length, skipped };
}

/** once：每个词包只自动灌一次；fill：补上缺失的词，已有的跳过。 */
export function applyWordPack(
  state: PersistedState,
  packId: WordPackId,
  mode: 'once' | 'fill' = 'once',
): { state: PersistedState; added: number; skipped: number } {
  const applied = state.appliedWordPacks ?? [];
  if (mode === 'once' && applied.includes(packId)) {
    return { state: { ...state, appliedWordPacks: applied }, added: 0, skipped: 0 };
  }
  const incoming = stampWords(createPackWords(packId), state.activeProfileId);
  const merged = mergeWordLists(state.words, incoming);
  const nextApplied = applied.includes(packId) ? applied : [...applied, packId];
  return {
    state: {
      ...state,
      words: merged.words,
      appliedWordPacks: nextApplied,
    },
    added: merged.added,
    skipped: merged.skipped,
  };
}

export function ensureDefaultWordPack(state: PersistedState): PersistedState {
  return applyWordPack(state, DEFAULT_WORD_PACK_ID, 'once').state;
}
