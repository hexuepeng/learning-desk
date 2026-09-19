import type { Word } from '../types/models.ts';

import { parseWordList } from '../lib/parseWordList.ts';
import { createId } from '../lib/util.ts';
import { KET_A2_STARTER_TEXT, KET_A2_TEXT } from './wordPacks/texts.ts';

/** 新设备 / 空库默认带上的家庭词包。 */
export const DEFAULT_WORD_PACK_ID = 'ket-a2' as const;

export type WordPackId = 'ket-a2' | 'ket-a2-starter';

export type WordPack = {
  id: WordPackId;
  title: string;
  summary: string;
  text: string;
};

/**
 * 家庭自学词包。英文词头来自剑桥 A2 Key 词表，中文为 ECDICT 机检首义。
 * 只随家庭仓库走，不要打进公开上架的安装包。
 */
export const WORD_PACKS: Record<WordPackId, WordPack> = {
  'ket-a2': {
    id: 'ket-a2',
    title: 'KET A2 全表',
    summary: '约 1550 词，剑桥 A2 Key 词头 + ECDICT 首义',
    text: KET_A2_TEXT,
  },
  'ket-a2-starter': {
    id: 'ket-a2-starter',
    title: 'KET A2 精简 120',
    summary: '先给孩子试跑的一小包',
    text: KET_A2_STARTER_TEXT,
  },
};

export function wordPackText(id: WordPackId): string {
  return WORD_PACKS[id].text;
}

export function createPackWords(id: WordPackId, now = new Date().toISOString()): Word[] {
  return parseWordList(WORD_PACKS[id].text).map((item) => ({
    id: createId('word'),
    en: item.en,
    zh: item.zh,
    source: 'pack',
    createdAt: now,
  }));
}
