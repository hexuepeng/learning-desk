import { getPowerUp1Unit } from '../content/powerUp1Packs.ts';
import type { QuestState, Sentence, Word } from '../types/models.ts';

import { applySentenceListImport } from './sentenceImport.ts';
import { applyWordListImport, type ApplyWordListImportOptions } from './wordImport.ts';

export type ApplyPowerUp1UnitImportOptions = Omit<
  ApplyWordListImportOptions,
  'mode' | 'ketPack' | 'rebuildPack' | 'packMerge'
> & {
  includeSentences?: boolean;
};

export type ApplyPowerUp1UnitImportResult = {
  words: Word[];
  quest: QuestState;
  sentences: Sentence[];
  added: number;
  skipped: number;
  packAdded: number;
  sentencesAdded: number;
  sentencesSkipped: number;
};

function emptyResult(
  words: Word[],
  quest: QuestState,
  sentences: Sentence[],
): ApplyPowerUp1UnitImportResult {
  return {
    words,
    quest,
    sentences,
    added: 0,
    skipped: 0,
    packAdded: 0,
    sentencesAdded: 0,
    sentencesSkipped: 0,
  };
}

/**
 * 按单元追加 Power Up 1 家庭词包。
 * 相同英文跳过；闯关顺序把本单元插到前面，不重排、不清空已有 KET 词库和进度。
 */
export function applyPowerUp1UnitImport(
  words: Word[],
  quest: QuestState,
  sentences: Sentence[],
  profileId: string,
  unitId: number,
  options: ApplyPowerUp1UnitImportOptions = {},
): ApplyPowerUp1UnitImportResult {
  const unit = getPowerUp1Unit(unitId);
  if (!unit) return emptyResult(words, quest, sentences);

  const wordResult = applyWordListImport(words, quest, profileId, unit.wordsText, {
    now: options.now,
    createId: options.createId,
    mode: 'append',
    ketPack: true,
    rebuildPack: false,
    packMerge: 'prepend',
  });

  if (options.includeSentences === false) {
    return {
      words: wordResult.words,
      quest: wordResult.quest,
      sentences,
      added: wordResult.added,
      skipped: wordResult.skipped,
      packAdded: wordResult.packAdded,
      sentencesAdded: 0,
      sentencesSkipped: 0,
    };
  }

  const sentenceResult = applySentenceListImport(
    sentences,
    wordResult.words,
    profileId,
    unit.sentencesText,
    {
      mode: 'append',
      now: options.now,
      createId: options.createId,
      tags: ['power-up-1', unit.slug],
    },
  );

  return {
    words: wordResult.words,
    quest: wordResult.quest,
    sentences: sentenceResult.sentences,
    added: wordResult.added,
    skipped: wordResult.skipped,
    packAdded: wordResult.packAdded,
    sentencesAdded: sentenceResult.added,
    sentencesSkipped: sentenceResult.skipped,
  };
}
