export const RECORDING_DIR_NAME = 'recordings';
export const MAX_CLIP_MS = 10_000;

export function guessAudioExt(uri: string): string {
  const clean = uri.split('?')[0]?.split('#')[0] ?? '';
  const match = clean.match(/\.(m4a|caf|aac|mp3|wav|webm|3gp|mp4)$/i);
  if (!match) return '.m4a';
  return `.${match[1].toLowerCase()}`;
}

export function wordRecordingRelativePath(wordId: string, ext = '.m4a'): string {
  return `${RECORDING_DIR_NAME}/words/${wordId}${ext}`;
}

export function albumPageRecordingRelativePath(
  bookId: string,
  pageId: string,
  ext = '.m4a',
): string {
  return `${RECORDING_DIR_NAME}/albums/${bookId}/${pageId}${ext}`;
}

export function sentenceRecordingRelativePath(sentenceId: string, ext = '.m4a'): string {
  return `${RECORDING_DIR_NAME}/sentences/${sentenceId}${ext}`;
}

export function toStoredRecordingRef(uri: string, documentDirectory: string | null): string {
  if (documentDirectory && uri.startsWith(documentDirectory)) {
    return uri.slice(documentDirectory.length);
  }
  return uri;
}

export function resolveStoredRecordingRef(
  stored: string,
  documentDirectory: string | null,
): string {
  if (!stored) return stored;
  if (/^(file|content|ph|assets-library|http|https|data|blob):/i.test(stored)) {
    return stored;
  }
  if (documentDirectory && !/^[a-z][a-z0-9+.-]*:/i.test(stored)) {
    return `${documentDirectory}${stored}`;
  }
  return stored;
}

export function isManagedRecordingRef(stored: string, documentDirectory: string | null): boolean {
  if (stored.startsWith(`${RECORDING_DIR_NAME}/`)) return true;
  return Boolean(
    documentDirectory && stored.startsWith(`${documentDirectory}${RECORDING_DIR_NAME}/`),
  );
}
