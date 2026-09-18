import * as FileSystem from 'expo-file-system/legacy';

import {
  RECORDING_DIR_NAME,
  isManagedRecordingRef,
  resolveStoredRecordingRef,
} from './recording.ts';

function documentDir(): string | null {
  return FileSystem.documentDirectory ?? null;
}

/** 把录音从缓存拷进应用文档目录，返回可持久化的相对路径。 */
export async function persistRecordingFile(
  sourceUri: string,
  relativePath: string,
): Promise<string> {
  const root = documentDir();
  if (!root || !sourceUri || !relativePath) return sourceUri;
  if (isManagedRecordingRef(sourceUri, root)) {
    return sourceUri.startsWith(root) ? sourceUri.slice(root.length) : sourceUri;
  }

  const dest = `${root}${relativePath}`;
  try {
    const dir = dest.slice(0, dest.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return relativePath;
  } catch {
    // Web 或模拟器没有可拷贝的文件时，先留下原 URI，至少本会话还能听。
    return sourceUri;
  }
}

export function displayRecordingUri(stored: string): string {
  return resolveStoredRecordingRef(stored, documentDir());
}

export async function deleteRecordingFile(stored?: string | null): Promise<void> {
  const root = documentDir();
  if (!stored || !root || !isManagedRecordingRef(stored, root)) return;
  const uri = resolveStoredRecordingRef(stored, root);
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // 文件已不在则忽略
  }
}

export async function deleteAlbumBookRecordings(bookId: string): Promise<void> {
  const root = documentDir();
  if (!root || !bookId) return;
  try {
    await FileSystem.deleteAsync(`${root}${RECORDING_DIR_NAME}/albums/${bookId}`, {
      idempotent: true,
    });
  } catch {
    // 目录已不在则忽略
  }
}

export async function clearAllRecordingFiles(): Promise<void> {
  const root = documentDir();
  if (!root) return;
  try {
    await FileSystem.deleteAsync(`${root}${RECORDING_DIR_NAME}`, { idempotent: true });
  } catch {
    // 目录已不在则忽略
  }
}
