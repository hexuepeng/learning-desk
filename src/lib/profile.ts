import type { AlbumBook, PersistedState, Profile, Word } from '../types/models.ts';

export const DEFAULT_PROFILE_ID = 'profile_child';

export function defaultProfile(now = new Date().toISOString()): Profile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: '孩子',
    createdAt: now,
    archived: false,
  };
}

export function normalizeProfiles(raw: unknown): Profile[] {
  if (!Array.isArray(raw) || raw.length === 0) return [defaultProfile()];
  const out = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const data = item as Partial<Profile>;
      return {
        id: typeof data.id === 'string' && data.id ? data.id : DEFAULT_PROFILE_ID,
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '孩子',
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
        archived: Boolean(data.archived),
      };
    });
  return out.length > 0 ? out : [defaultProfile()];
}

export function profileIdOf(item: { profileId?: string }): string {
  return item.profileId || DEFAULT_PROFILE_ID;
}

export function wordsForProfile(words: Word[], profileId: string): Word[] {
  return words.filter((word) => profileIdOf(word) === profileId);
}

export function booksForProfile(books: AlbumBook[], profileId: string): AlbumBook[] {
  return books.filter((book) => profileIdOf(book) === profileId);
}

export function activeProfiles(profiles: Profile[]): Profile[] {
  return profiles.filter((item) => !item.archived);
}

export function resolveActiveProfileId(profiles: Profile[], activeId: string): string {
  const live = activeProfiles(profiles);
  if (live.some((item) => item.id === activeId)) return activeId;
  return live[0]?.id ?? profiles[0]?.id ?? DEFAULT_PROFILE_ID;
}

export function projectProfile(state: PersistedState): PersistedState {
  const activeProfileId = resolveActiveProfileId(state.profiles, state.activeProfileId);
  return {
    ...state,
    activeProfileId,
    words: wordsForProfile(state.words, activeProfileId),
    albumBooks: booksForProfile(state.albumBooks, activeProfileId),
  };
}

export function stampWords(words: Word[], profileId: string): Word[] {
  return words.map((word) => (word.profileId ? word : { ...word, profileId }));
}

export function stampBooks(books: AlbumBook[], profileId: string): AlbumBook[] {
  return books.map((book) => (book.profileId ? book : { ...book, profileId }));
}

export function renameProfile(profiles: Profile[], id: string, name: string): Profile[] {
  const trimmed = name.trim();
  if (!trimmed) return profiles;
  return profiles.map((item) => (item.id === id ? { ...item, name: trimmed } : item));
}

export function setProfileArchived(profiles: Profile[], id: string, archived: boolean): Profile[] {
  const live = activeProfiles(profiles);
  if (archived && live.length <= 1 && live[0]?.id === id) return profiles;
  return profiles.map((item) => (item.id === id ? { ...item, archived } : item));
}
