import type { PersistedState } from '../types/models.ts';

import { hydrateState } from './storage.ts';
import { assertPersistedStateShape as validateBackupState } from './stateValidation.ts';

export { assertPersistedStateShape as validateBackupState } from './stateValidation.ts';

export const BACKUP_KIND = 'learning-desk-backup';
/** 旧文字备份格式；完整媒体容器使用独立的 format: 2。 */
export const BACKUP_FORMAT = 1;

export type DeskBackup = {
  kind: typeof BACKUP_KIND;
  format: 1;
  exportedAt: string;
  state: PersistedState;
};

export type BackupParseResult =
  | { ok: true; state: PersistedState; exportedAt?: string }
  | { ok: false; reason: string };

export type MediaReference = {
  key: string;
  kind: 'photo' | 'word-recording' | 'sentence-recording' | 'page-recording';
  stored: string;
  label: string;
  bookId?: string;
};

export type BackupCounts = {
  profiles: number;
  words: number;
  sentences: number;
  photos: number;
  recordings: number;
};

export function serializeBackup(
  state: PersistedState,
  exportedAt = new Date().toISOString(),
): string {
  const payload: DeskBackup = {
    kind: BACKUP_KIND,
    format: BACKUP_FORMAT,
    exportedAt,
    state,
  };
  return JSON.stringify(payload);
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseBackup(text: string): BackupParseResult {
  try {
    const raw: unknown = JSON.parse(text);
    if (!object(raw)) return { ok: false, reason: '备份内容空了' };
    let state: unknown = raw;
    let exportedAt: string | undefined;
    if ('kind' in raw || 'format' in raw) {
      if (raw.kind !== BACKUP_KIND) return { ok: false, reason: '对不上学习台备份格式' };
      if (raw.format !== BACKUP_FORMAT) return { ok: false, reason: '不支持这份备份格式，请更新学习台或选择完整 ZIP 文件' };
      state = raw.state;
      exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined;
    }
    validateBackupState(state);
    return { ok: true, state: hydrateState(state), exportedAt };
  } catch (error) {
    return { ok: false, reason: error instanceof SyntaxError ? '不是有效的备份 JSON' : error instanceof Error ? error.message : '备份内容损坏' };
  }
}

/** 按全量存档引用收集，仅访问家庭媒体，不扫描设备目录。key 不依赖用户生成的 ID。 */
export function collectBackupMedia(state: PersistedState): MediaReference[] {
  const refs: MediaReference[] = [];
  state.words.forEach((word, index) => {
    if (word.recordingUri) refs.push({ key: `words/${index}/recordingUri`, kind: 'word-recording', stored: word.recordingUri, label: `单词「${word.en}」录音` });
  });
  state.sentences.forEach((sentence, index) => {
    if (sentence.recordingUri) refs.push({ key: `sentences/${index}/recordingUri`, kind: 'sentence-recording', stored: sentence.recordingUri, label: `短句「${sentence.en}」录音` });
  });
  state.albumBooks.forEach((book, bookIndex) => book.pages.forEach((page, pageIndex) => {
    const key = `albumBooks/${bookIndex}/pages/${pageIndex}`;
    refs.push({ key: `${key}/photoUri`, kind: 'photo', stored: page.photoUri, label: `《${book.title}》第 ${pageIndex + 1} 页照片`, bookId: book.id });
    if (page.recordingUri) refs.push({ key: `${key}/recordingUri`, kind: 'page-recording', stored: page.recordingUri, label: `《${book.title}》第 ${pageIndex + 1} 页录音`, bookId: book.id });
  }));
  return refs;
}

export function remapBackupMedia(state: PersistedState, paths: ReadonlyMap<string, string>): PersistedState {
  return {
    ...state,
    words: state.words.map((word, index) => ({ ...word, ...(word.recordingUri ? { recordingUri: paths.get(`words/${index}/recordingUri`) ?? word.recordingUri } : {}) })),
    sentences: state.sentences.map((sentence, index) => ({ ...sentence, ...(sentence.recordingUri ? { recordingUri: paths.get(`sentences/${index}/recordingUri`) ?? sentence.recordingUri } : {}) })),
    albumBooks: state.albumBooks.map((book, bi) => ({ ...book, pages: book.pages.map((page, pi) => ({
      ...page,
      photoUri: paths.get(`albumBooks/${bi}/pages/${pi}/photoUri`) ?? page.photoUri,
      ...(page.recordingUri ? { recordingUri: paths.get(`albumBooks/${bi}/pages/${pi}/recordingUri`) ?? page.recordingUri } : {}),
    })) })),
  };
}

export function countBackupContent(state: PersistedState): BackupCounts {
  const media = collectBackupMedia(state);
  return {
    profiles: state.profiles.length,
    words: state.words.length,
    sentences: state.sentences.length,
    photos: media.filter((ref) => ref.kind === 'photo').length,
    recordings: media.filter((ref) => ref.kind !== 'photo').length,
  };
}
