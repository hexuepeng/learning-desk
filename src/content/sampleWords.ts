import type { Word } from '../types/models.ts';

import { createId } from '../lib/util.ts';

const PAIRS: Array<[string, string]> = [
  ['apple', '苹果'],
  ['book', '书'],
  ['cat', '猫'],
  ['dog', '狗'],
  ['water', '水'],
  ['school', '学校'],
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
  return PAIRS.map(([en, zh]) => ({
    id: createId('word'),
    en,
    zh,
    source: 'sample',
    createdAt: now,
  }));
}
