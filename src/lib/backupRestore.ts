import type { PersistedState } from '../types/models.ts';
import { collectBackupMedia, remapBackupMedia, validateBackupState } from './backup.ts';
import {
  BACKUP_LIMITS,
  backupChecksum,
  isSafeBackupPath,
  type CompleteBackup,
} from './backupArchive.ts';

export const BACKUP_RESTORE_JOURNAL_KEY = 'learning-desk/backup-restore/v1';

export type RestoreJournal = {
  version: 1;
  token: string;
  previous: PersistedState;
  previousRaw: string | null;
  stagedPaths: string[];
};

export type RestoreFile = { path: string; bytes: Uint8Array };
export type RestorePlan = { state: PersistedState; files: RestoreFile[]; bytes: number; token: string };

export type RestoreIO = {
  readRawState: () => Promise<string | null>;
  restoreRawState: (raw: string | null) => Promise<void>;
  readJournal: () => Promise<string | null>;
  writeJournal: (text: string) => Promise<void>;
  clearJournal: () => Promise<void>;
  writeFile: (path: string, bytes: Uint8Array) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  removeFile: (path: string) => Promise<void>;
  commitState: (state: PersistedState) => Promise<void>;
  verifyState: (state: PersistedState) => Promise<void>;
  cleanupPrevious: (previous: PersistedState, next: PersistedState) => Promise<void>;
};

function safeId(value: string): string {
  // 此目录也供现有删书逻辑使用。拒绝越界 ID，而不是改变书籍标识。
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(value)) throw new Error('相册标识包含不支持的字符，无法安全恢复媒体');
  return value;
}

export function createRestorePlan(backup: CompleteBackup, token: string): RestorePlan {
  if (!/^[a-z0-9-]{6,80}$/.test(token)) throw new Error('恢复批次标识不正确');
  const paths = new Map<string, string>();
  const files: RestoreFile[] = [];
  let bytes = 0;
  collectBackupMedia(backup.state).forEach((ref, index) => {
    const extension = ref.stored.match(/\.[a-z0-9]+$/)?.[0];
    if (!extension) throw new Error('资源扩展名不正确');
    const directory = ref.kind === 'photo' ? `albums/${safeId(ref.bookId!)}` :
      ref.kind === 'page-recording' ? `recordings/albums/${safeId(ref.bookId!)}` :
      ref.kind === 'word-recording' ? 'recordings/words' : 'recordings/sentences';
    const path = `${directory}/restore-${token}-${index}${extension}`;
    const data = backup.files[ref.stored];
    if (!data) throw new Error(`${ref.label}缺少媒体文件`);
    files.push({ path, bytes: data });
    paths.set(ref.key, path);
    bytes += data.length;
  });
  // ZIP 中去重，恢复时各引用独立，保证替换录音或删书不会破坏另一份引用。
  if (bytes > BACKUP_LIMITS.totalBytes) throw new Error('恢复后的媒体总量超过 48 MiB 上限（含重复引用）');
  return { state: remapBackupMedia(backup.state, paths), files, bytes, token };
}

export function parseRestoreJournal(text: string): RestoreJournal {
  let journal: RestoreJournal;
  try {
    journal = JSON.parse(text) as RestoreJournal;
  } catch {
    throw new Error('未完成恢复记录损坏，请保留数据后重试');
  }
  if (!journal || journal.version !== 1 || !/^[a-z0-9-]{6,80}$/.test(journal.token) ||
    (journal.previousRaw !== null && typeof journal.previousRaw !== 'string') ||
    !Array.isArray(journal.stagedPaths) || journal.stagedPaths.length > BACKUP_LIMITS.references) throw new Error('未完成恢复记录损坏，请保留数据后重试');
  validateBackupState(journal.previous, true);
  const previous = collectBackupMedia(journal.previous);
  const pattern = new RegExp(`^(albums/[a-zA-Z0-9_-]+|recordings/(words|sentences|albums/[a-zA-Z0-9_-]+))/restore-${journal.token}-[0-9]+\\.[a-z0-9]+$`);
  if (new Set(journal.stagedPaths).size !== journal.stagedPaths.length || journal.stagedPaths.some((path) =>
    typeof path !== 'string' || !isSafeBackupPath(path) || !pattern.test(path) ||
    previous.some((ref) => ref.stored === path || ref.stored.endsWith(`/${path}`)))) throw new Error('未完成恢复记录包含不安全的文件路径');
  return journal;
}

async function removeStaged(paths: string[], io: RestoreIO): Promise<void> {
  for (const path of paths) await io.removeFile(path);
}

/** journal 存在就回滚。提交后崩溃也宁可回到旧快照，不留下半份新数据。 */
export async function recoverInterruptedRestore(io: RestoreIO): Promise<boolean> {
  const text = await io.readJournal();
  if (text === null) return false;
  const journal = parseRestoreJournal(text);
  await io.restoreRawState(journal.previousRaw);
  if (await io.readRawState() !== journal.previousRaw) throw new Error('原始存档回退校验失败');
  // 清理失败保留 journal，下次启动可继续重试；原媒体始终未被删除。
  await removeStaged(journal.stagedPaths, io);
  await io.clearJournal();
  return true;
}

export async function restoreBackupPlan(
  plan: RestorePlan,
  previous: PersistedState,
  io: RestoreIO,
): Promise<{ cleanupPending: boolean }> {
  if (await io.readJournal() !== null) throw new Error('仍有未完成的恢复，请重启学习台后重试');
  const journal: RestoreJournal = {
    version: 1,
    token: plan.token,
    previous,
    previousRaw: await io.readRawState(),
    stagedPaths: plan.files.map((file) => file.path),
  };
  // 先落盘旧状态和所有新路径，写第一张照片前即具备冷启动回退依据。
  await io.writeJournal(JSON.stringify(journal));
  try {
    for (const file of plan.files) {
      await io.writeFile(file.path, file.bytes);
      const actual = await io.readFile(file.path);
      if (actual.length !== file.bytes.length || backupChecksum(actual) !== backupChecksum(file.bytes)) throw new Error('媒体写入校验失败');
    }
    await io.commitState(plan.state);
    await io.verifyState(plan.state);
    for (const file of plan.files) {
      const actual = await io.readFile(file.path);
      if (actual.length !== file.bytes.length || backupChecksum(actual) !== backupChecksum(file.bytes)) throw new Error('恢复后媒体不可读取');
    }
    await io.clearJournal();
  } catch (error) {
    try {
      await recoverInterruptedRestore(io);
    } catch {
      throw new Error('恢复中断，原内容和恢复记录已保留。请重启学习台以完成回退。');
    }
    throw error;
  }
  // 已成功提交且 journal 清除后才允许清理旧媒体。清理失败不推翻成功恢复。
  try {
    await io.cleanupPrevious(previous, plan.state);
    return { cleanupPending: false };
  } catch {
    return { cleanupPending: true };
  }
}
