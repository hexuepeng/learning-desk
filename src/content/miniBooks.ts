import type { MiniBook } from '../types/models.ts';

/** 原创短绘本，仅供家庭学习台内使用。 */
export const MINI_BOOKS: MiniBook[] = [
  {
    id: 'book-little-desk',
    titleZh: '小小书桌',
    titleEn: 'The Little Desk',
    coverArt: '📚',
    pages: [
      { art: '🪑', en: 'This is my little desk.', zh: '这是我的小小书桌。' },
      { art: '✏️', en: 'A red pencil sits on the desk.', zh: '一支红铅笔在书桌上。' },
      { art: '🔤', en: 'I write a new word.', zh: '我写一个新单词。' },
      { art: '😊', en: 'Dad smiles.', zh: '爸爸笑了。' },
    ],
  },
  {
    id: 'book-morning-cat',
    titleZh: '早晨的猫',
    titleEn: 'Morning Cat',
    coverArt: '🐱',
    pages: [
      { art: '🌅', en: 'The cat wakes up.', zh: '猫醒来了。' },
      { art: '🥛', en: 'The cat drinks milk.', zh: '猫喝牛奶。' },
      { art: '☀️', en: 'The cat sits in the sun.', zh: '猫坐在太阳下。' },
      { art: '👋', en: 'I say, "Good morning, cat!"', zh: '我说：“早上好，猫！”' },
    ],
  },
];
