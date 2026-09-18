import type { AlbumBook, AlbumPage } from '../types/models.ts';

/** 孩子能认出来的家庭相册书标签 */
export const FAMILY_ALBUM_LABEL = '我家的书';
export const ALBUM_DIR_NAME = 'albums';

export function defaultAlbumTitle(title?: string): string {
  const trimmed = title?.trim() ?? '';
  return trimmed || FAMILY_ALBUM_LABEL;
}

export function guessPhotoExt(uri: string): string {
  const clean = uri.split('?')[0]?.split('#')[0] ?? '';
  const match = clean.match(/\.(jpe?g|png|heic|heif|webp)$/i);
  if (!match) return '.jpg';
  const ext = match[1].toLowerCase();
  if (ext === 'jpeg') return '.jpg';
  return `.${ext}`;
}

export function albumRelativePath(bookId: string, pageId: string, ext = '.jpg'): string {
  return `${ALBUM_DIR_NAME}/${bookId}/${pageId}${ext}`;
}

export function toStoredPhotoRef(uri: string, documentDirectory: string | null): string {
  if (documentDirectory && uri.startsWith(documentDirectory)) {
    return uri.slice(documentDirectory.length);
  }
  return uri;
}

export function resolveStoredPhotoRef(stored: string, documentDirectory: string | null): string {
  if (!stored) return stored;
  if (/^(file|content|ph|assets-library|http|https|data|blob):/i.test(stored)) {
    return stored;
  }
  if (documentDirectory && !/^[a-z][a-z0-9+.-]*:/i.test(stored)) {
    return `${documentDirectory}${stored}`;
  }
  return stored;
}

export function isManagedAlbumRef(stored: string, documentDirectory: string | null): boolean {
  if (stored.startsWith(`${ALBUM_DIR_NAME}/`)) return true;
  return Boolean(
    documentDirectory && stored.startsWith(`${documentDirectory}${ALBUM_DIR_NAME}/`),
  );
}

export function normalizeAlbumPage(raw: unknown): AlbumPage | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' || !data.id.trim()) return null;
  if (typeof data.photoUri !== 'string' || !data.photoUri.trim()) return null;
  const recordingUri =
    typeof data.recordingUri === 'string' && data.recordingUri.trim()
      ? data.recordingUri.trim()
      : null;
  return {
    id: data.id,
    photoUri: data.photoUri.trim(),
    caption: typeof data.caption === 'string' ? data.caption : '',
    captionZh: typeof data.captionZh === 'string' ? data.captionZh : '',
    recordingUri,
  };
}

export function normalizeAlbumBook(raw: unknown): AlbumBook | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' || !data.id.trim()) return null;
  const pages = Array.isArray(data.pages)
    ? data.pages.map(normalizeAlbumPage).filter((page): page is AlbumPage => page !== null)
    : [];
  return {
    id: data.id,
    title: defaultAlbumTitle(typeof data.title === 'string' ? data.title : ''),
    pages,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
  };
}

export function normalizeAlbumBooks(raw: unknown): AlbumBook[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAlbumBook).filter((book): book is AlbumBook => book !== null);
}

export function buildAlbumPage(
  input: {
    id?: string;
    photoUri: string;
    caption?: string;
    captionZh?: string;
    recordingUri?: string | null;
  },
  makeId: () => string,
): AlbumPage {
  return {
    id: input.id ?? makeId(),
    photoUri: input.photoUri,
    caption: input.caption ?? '',
    captionZh: input.captionZh ?? '',
    recordingUri: input.recordingUri ?? null,
  };
}

export function buildAlbumBook(
  input: { id?: string; title: string; pages?: AlbumPage[]; createdAt?: string },
  makeId: () => string,
  now: () => string,
): AlbumBook {
  return {
    id: input.id ?? makeId(),
    title: defaultAlbumTitle(input.title),
    pages: input.pages ?? [],
    createdAt: input.createdAt ?? now(),
  };
}

export function upsertAlbumBook(books: AlbumBook[], book: AlbumBook): AlbumBook[] {
  if (books.some((item) => item.id === book.id)) {
    return books.map((item) =>
      item.id === book.id ? { ...book, createdAt: item.createdAt } : item,
    );
  }
  return [book, ...books];
}

export function removeAlbumBookById(books: AlbumBook[], id: string): AlbumBook[] {
  return books.filter((item) => item.id !== id);
}

export function addPageToBook(book: AlbumBook, page: AlbumPage): AlbumBook {
  if (book.pages.some((item) => item.id === page.id)) {
    return {
      ...book,
      pages: book.pages.map((item) => (item.id === page.id ? page : item)),
    };
  }
  return { ...book, pages: [...book.pages, page] };
}

export function patchPageInBook(
  book: AlbumBook,
  pageId: string,
  patch: Partial<Pick<AlbumPage, 'caption' | 'captionZh' | 'photoUri' | 'recordingUri'>>,
): AlbumBook {
  return {
    ...book,
    pages: book.pages.map((page) =>
      page.id === pageId ? { ...page, ...patch, id: page.id } : page,
    ),
  };
}

export function removePageFromBook(book: AlbumBook, pageId: string): AlbumBook {
  return { ...book, pages: book.pages.filter((page) => page.id !== pageId) };
}

export function replaceBook(books: AlbumBook[], book: AlbumBook): AlbumBook[] {
  return books.map((item) => (item.id === book.id ? book : item));
}
