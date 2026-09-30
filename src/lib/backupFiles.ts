import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { strFromU8, strToU8 } from 'fflate';

import type { PersistedState } from '../types/models.ts';
import { resolveStoredPhotoRef } from './album.ts';
import {
  collectBackupMedia,
  parseBackup,
  serializeBackup,
  type MediaReference,
} from './backup.ts';
import {
  BACKUP_LIMITS,
  backupChecksum,
  createBackupArchive,
  isSafeBackupPath,
  parseBackupArchive,
  type CompleteBackup,
} from './backupArchive.ts';
import {
  BACKUP_RESTORE_JOURNAL_KEY,
  createRestorePlan,
  recoverInterruptedRestore,
  restoreBackupPlan,
  type RestoreIO,
} from './backupRestore.ts';
import { resolveStoredRecordingRef } from './recording.ts';
import { restoreRawState, saveState, STORAGE_KEY } from './storage.ts';
import { createId } from './util.ts';

export const BACKUP_FILE_NAME = 'learning-desk-backup.json';
export type PreparedBackup = CompleteBackup | {
  kind: 'legacy';
  state: PersistedState;
  exportedAt?: string;
  missingMedia: string[];
};

function documentRoot(): string {
  if (!FileSystem.documentDirectory) throw new Error('这台设备没有可写的文档目录');
  return FileSystem.documentDirectory;
}

function cacheRoot(): string {
  if (!FileSystem.cacheDirectory) throw new Error('这台设备没有可写的缓存目录');
  return FileSystem.cacheDirectory;
}

function mediaUri(ref: MediaReference): string {
  const root = FileSystem.documentDirectory;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(ref.stored) && !isSafeBackupPath(ref.stored)) throw new Error('媒体路径不安全');
  const uri = ref.kind === 'photo' ? resolveStoredPhotoRef(ref.stored, root) : resolveStoredRecordingRef(ref.stored, root);
  if (!/^(file|content|ph|assets-library):/i.test(uri)) throw new Error('完整备份只支持本机照片和录音');
  return uri;
}

async function readBytes(uri: string, maxBytes: number): Promise<Uint8Array> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error('文件不存在');
  if (!Number.isFinite(info.size) || info.size > maxBytes) throw new Error('文件大小超过备份上限');
  const bytes = await new File(uri).bytes();
  if (bytes.length > maxBytes) throw new Error('文件大小超过备份上限');
  return bytes;
}

async function readMediaBytes(ref: MediaReference): Promise<Uint8Array> {
  const uri = mediaUri(ref);
  if (uri.startsWith('file:')) return readBytes(uri, BACKUP_LIMITS.fileBytes);
  // 相册/文件提供器临时 URI 先拷到自己的缓存，再用同样的大小和字节校验读取。
  const temporary = `${cacheRoot()}learning-desk-backups/${createId('media')}`;
  try {
    await FileSystem.makeDirectoryAsync(temporary, { intermediates: true });
    await FileSystem.copyAsync({ from: uri, to: `${temporary}/source` });
    return await readBytes(`${temporary}/source`, BACKUP_LIMITS.fileBytes);
  } finally {
    await removeCacheFile(temporary).catch(() => undefined);
  }
}

async function ensureSpace(requiredBytes: number): Promise<void> {
  const available = await FileSystem.getFreeDiskStorageAsync();
  if (available < requiredBytes + BACKUP_LIMITS.freeSpaceReserve) throw new Error('设备剩余空间不足，请腾出空间后重试。当前数据没有被替换。');
}

async function removeCacheFile(uri: string): Promise<void> {
  const root = FileSystem.cacheDirectory;
  if (!root || !uri.startsWith(root)) return;
  const relative = uri.slice(root.length);
  if (!relative || relative.includes('..') || relative.includes('\\')) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/** 只清理旧快照确实引用、且新快照不再引用的受管理文件。 */
async function cleanupPrevious(previous: PersistedState, next: PersistedState): Promise<void> {
  const root = documentRoot();
  const keep = new Set(collectBackupMedia(next).map((ref) => mediaUri(ref)));
  const removed = new Set<string>();
  for (const ref of collectBackupMedia(previous)) {
    let uri: string;
    try { uri = mediaUri(ref); } catch { continue; }
    if (!uri.startsWith(root) || keep.has(uri) || removed.has(uri)) continue;
    const relative = uri.slice(root.length);
    if (!isSafeBackupPath(relative) || (!relative.startsWith('albums/') && !relative.startsWith('recordings/'))) continue;
    await FileSystem.deleteAsync(uri, { idempotent: true });
    removed.add(uri);
  }
}

function restoreIO(commitState: (state: PersistedState) => Promise<void>): RestoreIO {
  const root = documentRoot();
  return {
    readRawState: () => AsyncStorage.getItem(STORAGE_KEY),
    restoreRawState,
    readJournal: () => AsyncStorage.getItem(BACKUP_RESTORE_JOURNAL_KEY),
    writeJournal: (text) => AsyncStorage.setItem(BACKUP_RESTORE_JOURNAL_KEY, text),
    clearJournal: () => AsyncStorage.removeItem(BACKUP_RESTORE_JOURNAL_KEY),
    writeFile: async (path, bytes) => {
      if (!isSafeBackupPath(path)) throw new Error('恢复路径不安全');
      const uri = `${root}${path}`;
      if ((await FileSystem.getInfoAsync(uri)).exists) throw new Error('恢复路径已存在，请重新选择备份后重试');
      await FileSystem.makeDirectoryAsync(uri.slice(0, uri.lastIndexOf('/')), { intermediates: true });
      const file = new File(uri);
      file.create();
      file.write(bytes);
    },
    readFile: (path) => readBytes(`${root}${path}`, BACKUP_LIMITS.fileBytes),
    removeFile: (path) => FileSystem.deleteAsync(`${root}${path}`, { idempotent: true }),
    commitState,
    verifyState: async (state) => {
      if (await AsyncStorage.getItem(STORAGE_KEY) !== JSON.stringify(state)) throw new Error('恢复后的状态读回校验失败');
    },
    cleanupPrevious,
  };
}

/** 必须在 loadState 前调用；只使用 storage.saveState 的统一写队列。 */
export async function hasPendingBackupRestore(): Promise<boolean> {
  return (await AsyncStorage.getItem(BACKUP_RESTORE_JOURNAL_KEY)) !== null;
}

export async function recoverInterruptedBackupRestore(): Promise<void> {
  const pending = await AsyncStorage.getItem(BACKUP_RESTORE_JOURNAL_KEY);
  if (pending === null) return;
  if (Platform.OS === 'web') throw new Error('存在尚未完成的媒体恢复，请在原生设备上重试');
  await recoverInterruptedRestore(restoreIO(saveState));
}

async function shareBytes(bytes: Uint8Array, filename: string, mimeType: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('这台设备暂时无法打开系统文件分享');
  await ensureSpace(bytes.length);
  const directory = `${cacheRoot()}learning-desk-backups/${createId('export')}/`;
  const uri = `${directory}${filename}`;
  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const file = new File(uri);
    file.create();
    file.write(bytes);
    const written = await readBytes(uri, BACKUP_LIMITS.archiveBytes);
    if (written.length !== bytes.length || backupChecksum(written) !== backupChecksum(bytes)) throw new Error('备份文件写入不完整');
    await Sharing.shareAsync(uri, { mimeType, UTI: mimeType === 'application/zip' ? 'public.zip-archive' : 'public.json', dialogTitle: '保存学习台备份' });
  } finally {
    await removeCacheFile(directory).catch(() => undefined);
  }
}

export async function exportCompleteBackup(state: PersistedState): Promise<{ bytes: number }> {
  if (Platform.OS === 'web') throw new Error('完整照片和录音备份请在 iPad 或 Android 设备上操作');
  const bytes = await createBackupArchive(state, readMediaBytes, {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    canonicalize: mediaUri,
  });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await shareBytes(bytes, `learning-desk-${stamp}.learningdesk.zip`, 'application/zip');
  return { bytes: bytes.length };
}

export async function exportDataBackup(state: PersistedState): Promise<void> {
  const json = serializeBackup(state);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = BACKUP_FILE_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  await shareBytes(strToU8(json), BACKUP_FILE_NAME, 'application/json');
}

export async function prepareLegacyBackup(text: string): Promise<PreparedBackup> {
  if (strToU8(text).length > BACKUP_LIMITS.fileBytes) throw new Error('JSON 备份超过 8 MiB 上限');
  const parsed = parseBackup(text);
  if (!parsed.ok) throw new Error(parsed.reason);
  const missingMedia: string[] = [];
  for (const ref of collectBackupMedia(parsed.state)) {
    try {
      const info = await FileSystem.getInfoAsync(mediaUri(ref));
      if (!info.exists || info.isDirectory || !info.size) missingMedia.push(ref.label);
    } catch { missingMedia.push(ref.label); }
  }
  return { kind: 'legacy', state: parsed.state, exportedAt: parsed.exportedAt, missingMedia };
}

export async function pickBackupFile(): Promise<PreparedBackup | null> {
  if (Platform.OS === 'web') throw new Error('网页请使用下方 JSON 文字导入；完整备份请在原生设备上恢复');
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  if (!asset) throw new Error('没有读取到所选文件');
  try {
    if (asset.size !== undefined && asset.size > BACKUP_LIMITS.archiveBytes) throw new Error('备份文件超过 50 MiB 上限');
    const bytes = await readBytes(asset.uri, BACKUP_LIMITS.archiveBytes);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return parseBackupArchive(bytes);
    if (bytes.length > BACKUP_LIMITS.fileBytes) throw new Error('JSON 备份超过 8 MiB 上限');
    return await prepareLegacyBackup(strFromU8(bytes));
  } finally {
    await removeCacheFile(asset.uri).catch(() => undefined);
  }
}

/** 由 withBackupSnapshot 包裹，并传入可靠持久化的 replaceState。 */
export async function importPreparedBackup(
  backup: PreparedBackup,
  previous: PersistedState,
  replaceState: (state: PersistedState) => Promise<void>,
): Promise<{ cleanupPending: boolean }> {
  if (backup.kind === 'legacy' && Platform.OS === 'web') {
    await replaceState(backup.state);
    return { cleanupPending: false };
  }
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const plan = backup.kind === 'complete' ? createRestorePlan(backup, token) : { state: backup.state, files: [], bytes: 0, token };
  await ensureSpace(plan.bytes + serializeBackup(previous).length * 4 + serializeBackup(plan.state).length * 4);
  return restoreBackupPlan(plan, previous, restoreIO(replaceState));
}
