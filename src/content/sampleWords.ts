import type { Word } from '../types/models.ts';

import { normalizeIpa } from '../lib/ipa.ts';
import { isSampleKetEn } from '../lib/quest.ts';
import { createId } from '../lib/util.ts';

/** 仅给少量常见词附上核对过的英式 IPA，不批量编造。 */
const PAIRS: Array<[string, string, string?]> = [
  ['apple', '苹果', '/ˈæpl/'],
  ['book', '书', '/bʊk/'],
  ['cat', '猫', '/kæt/'],
  ['dog', '狗'],
  ['water', '水', '/ˈwɔːtə/'],
  ['school', '学校', '/skuːl/'],
  ['friend', '朋友'],
  ['happy', '开心'],
  ['morning', '早上'],
  ['family', '家庭'],
  ['red', '红色'],
  ['blue', '蓝色'],
  ['sun', '太阳'],
  ['home', '家'],
  ['pencil', '铅笔'],
  ['desk', '书桌'],
  ['milk', '牛奶'],
  ['read', '读'],
  ['write', '写'],
  ['listen', '听'],
];

/** 家庭自建示例词包，非正式教材/商业词库。 */
export function createSampleWords(now = new Date().toISOString()): Word[] {
  return PAIRS.map(([en, zh, ipa]) => {
    const word: Word = {
      id: createId('word'),
      en,
      zh,
      source: 'sample',
      createdAt: now,
    };
    const normalized = normalizeIpa(ipa);
    if (normalized) word.ipa = normalized;
    if (isSampleKetEn(en)) word.ketPack = true;
    return word;
  });
}
