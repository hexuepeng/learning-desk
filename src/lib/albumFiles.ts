import * as FileSystem from 'expo-file-system/legacy';

import {
  ALBUM_DIR_NAME,
  albumRelativePath,
  guessPhotoExt,
  isManagedAlbumRef,
  resolveStoredPhotoRef,
} from './album.ts';

function documentDir(): string | null {
  return FileSystem.documentDirectory ?? null;
}

/** 把相册/相机临时图拷进应用文档目录，返回可持久化的相对路径。 */
export async function persistAlbumPhoto(
  sourceUri: string,
  bookId: string,
  pageId: string,
): Promise<string> {
  const root = documentDir();
  if (!root || !sourceUri) return sourceUri;
  if (isManagedAlbumRef(sourceUri, root)) {
    return sourceUri.startsWith(root) ? sourceUri.slice(root.length) : sourceUri;
  }

  const relative = albumRelativePath(bookId, pageId, guessPhotoExt(sourceUri));
  const dest = `${root}${relative}`;
  try {
    await FileSystem.makeDirectoryAsync(`${root}${ALBUM_DIR_NAME}/${bookId}`, {
      intermediates: true,
    });
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return relative;
  } catch {
    // Web 或模拟器没有可拷贝的文件时，先留下原 URI，至少本会话还能看。
    return sourceUri;
  }
}

export function displayAlbumPhotoUri(stored: string): string {
  return resolveStoredPhotoRef(stored, documentDir());
}

export async function deleteAlbumPhoto(stored: string): Promise<void> {
  const root = documentDir();
  if (!root || !isManagedAlbumRef(stored, root)) return;
  const uri = resolveStoredPhotoRef(stored, root);
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // 文件已不在则忽略
  }
}

export async function deleteAlbumBookFiles(bookId: string): Promise<void> {
  const root = documentDir();
  if (!root || !bookId) return;
  try {
    await FileSystem.deleteAsync(`${root}${ALBUM_DIR_NAME}/${bookId}`, { idempotent: true });
  } catch {
    // 目录已不在则忽略
  }
}

export async function clearAllAlbumFiles(): Promise<void> {
  const root = documentDir();
  if (!root) return;
  try {
    await FileSystem.deleteAsync(`${root}${ALBUM_DIR_NAME}`, { idempotent: true });
  } catch {
    // 目录已不在则忽略
  }
}
