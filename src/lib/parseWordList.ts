import { normalizeIpa } from './ipa.ts';

export type ParsedWord = { en: string; zh: string; ipa: string };

const HEADER_RE =
  /^(en|english|word|单词)\s*[,，;；]\s*(zh|chinese|中文|释义|translation)(\s*[,，;；]\s*(ipa|phonetic|音标))?$/i;
const QUOTED_RE = /^"([^"]+)"\s*[,，;；]\s*(.+)$/;
const SPACE_RE = /^(.*?)\s+([\u3400-\u9fff].*)$/;
const SPACED_DASH_RE = /^(.*?)\s+[-—–]\s+(.+)$/;
const PUNCT_MARKS = [',', '，', ';', '；', ':', '：', '\t', '|'] as const;

/** 解析家长粘贴的词表。每行：英文 + 中文释义 + 可选英式 IPA（第三列）。也认 CSV / 带引号。 */
export function parseWordList(text: string): ParsedWord[] {
  const seen = new Set<string>();
  const out: ParsedWord[] = [];
  const body = text.replace(/^\uFEFF/, '');
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (HEADER_RE.test(line) && !/[\u3400-\u9fff]/.test(line)) continue;
    const parsed = parseWordLine(line);
    if (!parsed) continue;
    const key = parsed.en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

export function parseWordLine(line: string): ParsedWord | null {
  const quoted = line.match(QUOTED_RE);
  if (quoted && hasChinese(quoted[2])) {
    return pack(quoted[1], quoted[2]);
  }
  const punct = splitOnPunct(line);
  if (punct) return punct;
  const dashed = line.match(SPACED_DASH_RE);
  if (dashed && hasChinese(dashed[2])) return pack(dashed[1], dashed[2]);
  const spaced = line.match(SPACE_RE);
  if (spaced) return pack(spaced[1], spaced[2]);
  return null;
}

function splitOnPunct(line: string): ParsedWord | null {
  let earliest = -1;
  let markLen = 1;
  for (const mark of PUNCT_MARKS) {
    const idx = line.indexOf(mark);
    if (idx > 0 && (earliest < 0 || idx < earliest) && hasChinese(line.slice(idx + mark.length))) {
      earliest = idx;
      markLen = mark.length;
    }
  }
  if (earliest < 0) return null;
  return pack(line.slice(0, earliest), line.slice(earliest + markLen));
}

function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function looksLikeIpa(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && !hasChinese(trimmed);
}

function splitZhAndIpa(restRaw: string): { zh: string; ipa: string } {
  const rest = restRaw.trim();
  const slash = rest.match(/^(.*?)(?:\s+|[,，;；\t|])\s*(\/[^/\n]+\/)\s*$/);
  if (slash && hasChinese(slash[1])) {
    return { zh: stripWrap(slash[1]), ipa: normalizeIpa(slash[2]) };
  }
  let lastIdx = -1;
  let markLen = 1;
  for (const mark of PUNCT_MARKS) {
    const idx = rest.lastIndexOf(mark);
    if (idx > 0 && idx >= lastIdx) {
      lastIdx = idx;
      markLen = mark.length;
    }
  }
  if (lastIdx > 0) {
    const zh = stripWrap(rest.slice(0, lastIdx));
    const ipaRaw = stripWrap(rest.slice(lastIdx + markLen));
    if (hasChinese(zh) && looksLikeIpa(ipaRaw)) {
      return { zh, ipa: normalizeIpa(ipaRaw) };
    }
  }
  return { zh: stripWrap(rest), ipa: '' };
}

function pack(enRaw: string, restRaw: string): ParsedWord | null {
  const en = stripWrap(enRaw).replace(/\s+/g, ' ');
  const { zh, ipa } = splitZhAndIpa(restRaw);
  if (!en || !zh || !hasChinese(zh)) return null;
  return { en, zh, ipa };
}

function stripWrap(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function answersMatch(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}
