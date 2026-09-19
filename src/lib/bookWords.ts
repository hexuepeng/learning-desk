const SKIP = new Set(['i', 'i\'m', 'don\'t', 'let\'s']);

/** 绘本英文句里可点的词（去掉标点）。 */
export function tokenizeEnglish(text: string): string[] {
  const matches = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const word = raw.replace(/^'+|'+$/g, '');
    if (word.length < 2 && word.toLowerCase() !== 'a') continue;
    const key = word.toLowerCase();
    if (SKIP.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export function bookWordGloss(word: string, pageZh: string): string {
  const zh = pageZh.trim();
  return zh || word;
}
