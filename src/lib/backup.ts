import type { PersistedState } from '../types/models.ts';

import { hydrateState } from './storage.ts';

export const BACKUP_KIND = 'learning-desk-backup';
export const BACKUP_FORMAT = 1;

export type DeskBackup = {
  kind: typeof BACKUP_KIND;
  format: 1;
  exportedAt: string;
  state: PersistedState;
};

export type BackupParseResult =
  | { ok: true; state: PersistedState }
  | { ok: false; reason: string };

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

function looksLikeState(raw: unknown): raw is PersistedState {
  if (!raw || typeof raw !== 'object') return false;
  const data = raw as Partial<PersistedState>;
  return data.version === 1 && Array.isArray(data.words);
}

export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: '不是备份文件' };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: '备份内容空了' };
  }
  const data = raw as Partial<DeskBackup> & Partial<PersistedState>;
  if (data.kind === BACKUP_KIND && looksLikeState(data.state)) {
    return { ok: true, state: hydrateState(data.state) };
  }
  if (looksLikeState(data)) {
    return { ok: true, state: hydrateState(data) };
  }
  return { ok: false, reason: '对不上学习台备份格式' };
}
