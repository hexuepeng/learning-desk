export const zh = {
  appName: '学习台',
  todayEnglish: '今日英语',
  startToday: '开始今日学习',
  todayDone: '今日完成啦',
  subjects: '学科',
  english: '英语',
  math: '数学',
  chinese: '语文',
  comingSoon: '即将开放',
  tellDad: '告诉爸爸',
  streak: '连胜',
  englishHall: '英语馆',
  vocab: '背单词',
  dictation: '默写',
  pictureBooks: '绘本',
  dadDesk: '爸爸的书桌',
  wordList: '词表',
  dictationSettings: '默写开关',
  feedbackInbox: '孩子留言',
  progress: '进度',
  knowIt: '认识',
  notYet: '还不熟',
  check: '看看对不对',
  next: '下一题',
  listen: '听一听',
  parentLock: '爸爸锁',
  unlock: '打开',
  placeholderMath: '数学馆还在搭建。爸爸会按你的反馈慢慢加。',
  placeholderChinese: '语文馆还在搭建。先把英语学扎实。',
};

export const en = {
  appName: 'Learning Desk',
  todayEnglish: 'Today’s English',
  startToday: 'Start today’s lesson',
  todayDone: 'All done today',
  subjects: 'Subjects',
  english: 'English',
  math: 'Math',
  chinese: 'Chinese',
  comingSoon: 'Coming soon',
  tellDad: 'Tell Dad',
  streak: 'Streak',
  englishHall: 'English hall',
  vocab: 'Vocab',
  dictation: 'Dictation',
  pictureBooks: 'Picture books',
  dadDesk: 'Dad desk',
  wordList: 'Word list',
  dictationSettings: 'Dictation types',
  feedbackInbox: 'Kid notes',
  progress: 'Progress',
  knowIt: 'I know it',
  notYet: 'Not yet',
  check: 'Check',
  next: 'Next',
  listen: 'Listen',
  parentLock: 'Parent lock',
  unlock: 'Unlock',
  placeholderMath: 'Math is a placeholder. Dad will add it from your feedback.',
  placeholderChinese: 'Chinese is a placeholder. English comes first.',
};

export type MessageKey = keyof typeof zh;

let locale: 'zh' | 'en' = 'zh';

export function setLocale(next: 'zh' | 'en'): void {
  locale = next;
}

export function getLocale(): 'zh' | 'en' {
  return locale;
}

export function t(key: MessageKey): string {
  return (locale === 'en' ? en : zh)[key];
}
