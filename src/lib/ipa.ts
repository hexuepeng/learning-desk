/** 英式 IPA 约定：存盘与展示都写成 `/ˈæpl/`（带斜杠）。缺省或空 = 没有音标。 */

export function normalizeIpa(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const inner = raw.trim().replace(/^\/+|\/+$/g, '').trim();
  if (!inner) return '';
  return `/${inner}/`;
}

/** 有音标且允许显示时返回 `/ˈæpl/`，否则 null。 */
export function displayIpa(raw: unknown, show = true): string | null {
  if (!show) return null;
  const ipa = normalizeIpa(raw);
  return ipa || null;
}

export function normalizeStoredWord<T extends { ipa?: unknown }>(word: T): T & { ipa: string } {
  return {
    ...word,
    ipa: normalizeIpa(word.ipa),
  };
}

export function normalizeStoredWords<T extends { ipa?: unknown }>(words: T[]): Array<T & { ipa: string }> {
  return words.map((word) => normalizeStoredWord(word));
}
