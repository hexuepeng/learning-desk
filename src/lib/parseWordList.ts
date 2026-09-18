export type ParsedWord = { en: string; zh: string };

const LINE_RE = /^(.*?)[\s,，;；:：\-|—–\t]+([\u3400-\u9fff].*)$/;

/** 解析家长粘贴的词表。每行：英文 + 中文释义。 */
export function parseWordList(text: string): ParsedWord[] {
  const seen = new Set<string>();
  const out: ParsedWord[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(LINE_RE);
    if (!match) continue;
    const en = match[1].trim().replace(/\s+/g, ' ');
    const zh = match[2].trim();
    if (!en || !zh) continue;
    const key = en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ en, zh });
  }
  return out;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function answersMatch(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}
