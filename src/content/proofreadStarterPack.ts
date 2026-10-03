import type { ContentSource } from '../types/models.ts';

/**
 * 校对首包。不是自动布置给孩子的 20 个词。
 * 英文和儿童向释义对照 Cambridge Dictionary（英式，2026-10-03 查阅），
 * 不直接采用 PDF 原文。音标缺省：本包没有逐条听核，不填写。
 */
export type ProofreadEntry = {
  en: string;
  zh: string;
  sourceLabel: string;
  sourceLocator: string;
  conclusion: string;
};

export type GlossSuggestion = {
  en: string;
  zh: string;
  reason: string;
};

export const PROOFREAD_PACK_SOURCE: ContentSource = {
  id: 'src-proofread-starter',
  kind: 'pdf',
  label: '艾莱恩KET 听力写作默写词汇.pdf',
  locator: '第 1、2、7、8 页里挑出的 20 个词，经剑桥词典核对',
};

export const PROOFREAD_STARTER: ProofreadEntry[] = [
  {
    en: 'breakfast',
    zh: '早餐',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「早餐」。Cambridge：the meal eaten in the morning。保留。',
  },
  {
    en: 'lunch',
    zh: '午餐',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「午餐」。Cambridge：a meal eaten in the middle of the day。保留。',
  },
  {
    en: 'dinner',
    zh: '晚餐',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「晚餐」。Cambridge：the main meal of the day，通常在晚上。保留，不用「正餐」以免和中午混淆。',
  },
  {
    en: 'milk',
    zh: '牛奶',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「牛奶」。保留。',
  },
  {
    en: 'juice',
    zh: '果汁',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「果汁」。保留。',
  },
  {
    en: 'fruit',
    zh: '水果',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 1 页 Food and drinks',
    conclusion: 'PDF 作「水果」。保留。',
  },
  {
    en: 'family',
    zh: '家人；家庭',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 只写「家庭」。Cambridge 指有亲属关系的一群人。儿童释义补上「家人」。',
  },
  {
    en: 'mother',
    zh: '妈妈；母亲',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 作「妈妈」。补书面语「母亲」，不改成其他亲属。',
  },
  {
    en: 'father',
    zh: '爸爸；父亲',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 作「爸爸」。补「父亲」。',
  },
  {
    en: 'friend',
    zh: '朋友',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 作「朋友」。保留。',
  },
  {
    en: 'house',
    zh: '房子',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 作「房子」。Cambridge 指建筑物。不写成「家」，以免和 home 混成同一个词。',
  },
  {
    en: 'home',
    zh: '家',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 2 页 family and home',
    conclusion: 'PDF 作「家」。保留，并和 house 分开。',
  },
  {
    en: 'school',
    zh: '学校',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 8 页 Education and Work',
    conclusion: 'PDF 作「学校」。保留。',
  },
  {
    en: 'Monday',
    zh: '星期一',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 作「周一」。儿童释义写成完整的「星期一」。大小写保持周一专名。',
  },
  {
    en: 'afternoon',
    zh: '下午',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 误作「中午」。Cambridge：大约从中午开始到傍晚的一段时间。改为「下午」。',
  },
  {
    en: 'morning',
    zh: '早上；上午',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 作「早上」。补「上午」。不把中午算进来。',
  },
  {
    en: 'evening',
    zh: '晚上',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 作「晚上」。保留。',
  },
  {
    en: 'weekday',
    zh: '工作日；平日',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 作「工作日」，与 Cambridge「除周六、周日以外的日子」一致。内置词库旧释义里的「周日」是错的，这里明确不采用。',
  },
  {
    en: 'weekend',
    zh: '周末',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 7 页 Time',
    conclusion: 'PDF 作「周末」。保留。',
  },
  {
    en: 'homework',
    zh: '作业',
    sourceLabel: PROOFREAD_PACK_SOURCE.label,
    sourceLocator: '第 8 页 Education and Work',
    conclusion: 'PDF 作「作业」。保留。',
  },
];

/** 已核对的内置词义。新装词库直接使用修正后的正文；已在本机的旧词只进入预览。 */
export const BUILTIN_GLOSS_CORRECTIONS: GlossSuggestion[] = [
  {
    en: 'spell',
    zh: '拼写',
    reason: 'Cambridge verb A2：to form a word with the letters in the correct order，简体中文作「拼写」。旧释义「符咒；魅力」是另一词义，不适合当前拼写练习。',
  },
  {
    en: 'weekday',
    zh: '工作日；平日',
    reason: 'Cambridge：any day of the week except Sunday and Saturday，简体中文作「工作日」。旧释义里的「周日」不准确。',
  },
  {
    en: 'special',
    zh: '特别的；特殊的',
    reason: 'Cambridge adjective A2：not ordinary or usual，简体中文作「特殊的，特别的」。旧释义「专辑；专车」不是当前学习义。',
  },
  {
    en: 'tidy',
    zh: '整洁的；整理',
    reason: 'Cambridge adjective A2：having everything ordered；verb A2：to make a place tidy。儿童释义用「整洁的；整理」。旧释义「椅子的背罩；装杂物的容器」是不常用的名词义。',
  },
];

export function glossSuggestions(): GlossSuggestion[] {
  const byEn = new Map<string, GlossSuggestion>();
  for (const item of BUILTIN_GLOSS_CORRECTIONS) byEn.set(item.en.toLowerCase(), item);
  for (const item of PROOFREAD_STARTER) {
    const key = item.en.toLowerCase();
    if (!byEn.has(key)) {
      byEn.set(key, { en: item.en, zh: item.zh, reason: item.conclusion });
    }
  }
  return [...byEn.values()];
}
