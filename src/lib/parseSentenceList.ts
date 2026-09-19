export type ParsedSentence = { en: string; zh: string };

const HEADER_RE =
  /^(en|english|sentence|短句)\s*[,，;；|\t]\s*(zh|chinese|中文|释义|translation)$/i;
const QUOTED_RE = /^"([^"]+)"\s*[,，;；]\s*(.+)$/;
const PUNCT_MARKS = [',', '，', ';', '；', '\t', '|'] as const;

/** 轻量去重键：去首尾空白、压空格、小写，并去掉句末标点。 */
export function normalizeSentenceKey(en: string): string {
  return en
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.!?…]+$/g, '');
}

export function cleanSentenceEn(en: string): string {
  return en.trim().replace(/\s+/g, ' ');
}

export function cleanSentenceZh(zh: string): string {
  return zh.trim();
}

/** 解析家长粘贴的短句。每行一句英文；也可两列 english,chinese 或 sentence|chinese。 */
export function parseSentenceList(text: string): ParsedSentence[] {
  const seen = new Set<string>();
  const out: ParsedSentence[] = [];
  const body = text.replace(/^\uFEFF/, '');
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (HEADER_RE.test(line) && !hasChinese(line.split(/[,，;；|\t]/)[0] ?? '')) continue;
    const parsed = parseSentenceLine(line);
    if (!parsed) continue;
    const key = normalizeSentenceKey(parsed.en);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

export function parseSentenceLine(line: string): ParsedSentence | null {
  const quoted = line.match(QUOTED_RE);
  if (quoted) {
    const packed = pack(quoted[1], quoted[2]);
    if (packed) return packed;
  }
  const punct = splitOnPunct(line);
  if (punct) return punct;
  return packEnglishOnly(line);
}

function splitOnPunct(line: string): ParsedSentence | null {
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

function pack(enRaw: string, zhRaw: string): ParsedSentence | null {
  const en = cleanSentenceEn(enRaw);
  const zh = cleanSentenceZh(zhRaw);
  if (!looksLikeEnglish(en)) return null;
  return { en, zh };
}

function packEnglishOnly(line: string): ParsedSentence | null {
  const en = cleanSentenceEn(line);
  if (!looksLikeEnglish(en)) return null;
  if (HEADER_RE.test(en)) return null;
  return { en, zh: '' };
}

function looksLikeEnglish(value: string): boolean {
  return value.length >= 2 && /[A-Za-z]/.test(value);
}

function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}
