export const TTS_LANGUAGE = 'en-GB';
/** 给 8 岁孩子听的英语语速；中文提示音仍走 tts.ts 里单独的语速。 */
export const TTS_RATE = 0.68;
/** 接近自然音高，避免偏尖的「花栗鼠」听感。 */
export const TTS_PITCH = 1;

export type SpeechVoiceHint = {
  identifier?: string;
  language?: string;
  name?: string;
};

export type SpeakOptions = {
  language: string;
  rate: number;
  pitch: number;
  voice?: string;
};

/**
 * 常见、听感较稳的英式系统音（iOS / 部分 Android）。
 * 实际发音仍取决于本机是否安装了英式语音包，应用不捆绑云端 TTS。
 */
export const PREFERRED_BRITISH_VOICE_NAMES = [
  'daniel',
  'kate',
  'serena',
  'martha',
  'arthur',
  'oliver',
  'gordon',
] as const;

function languageKey(value?: string): string {
  return (value ?? '').trim().toLowerCase().replace(/_/g, '-');
}

function isEnglish(value?: string): boolean {
  return languageKey(value).startsWith('en');
}

function isBritish(value?: string): boolean {
  const key = languageKey(value);
  return key.startsWith('en-gb') || key.startsWith('en-uk');
}

function voiceHaystack(voice: SpeechVoiceHint): string {
  return `${voice.name ?? ''} ${voice.identifier ?? ''}`.trim().toLowerCase();
}

function matchesPreferredBritishName(voice: SpeechVoiceHint, known: string): boolean {
  const haystack = voiceHaystack(voice);
  if (!haystack) return false;
  return haystack.split(/[^a-z0-9]+/).includes(known) || haystack.includes(known);
}

/** 优先知名英式系统音，再任意 en-GB / en-UK，最后任意英语。音质取决于本机语音包。 */
export function pickPreferredEnglishVoice(
  voices: SpeechVoiceHint[],
): SpeechVoiceHint | undefined {
  const english = voices.filter((voice) => isEnglish(voice.language));
  const british = english.filter((voice) => isBritish(voice.language));
  for (const known of PREFERRED_BRITISH_VOICE_NAMES) {
    const named = british.find((voice) => matchesPreferredBritishName(voice, known));
    if (named) return named;
  }
  return british[0] ?? english[0];
}

export function buildSpeakOptions(voice?: SpeechVoiceHint | null): SpeakOptions {
  const language = isEnglish(voice?.language) ? (voice?.language as string) : TTS_LANGUAGE;
  const options: SpeakOptions = {
    language,
    rate: TTS_RATE,
    pitch: TTS_PITCH,
  };
  if (voice?.identifier?.trim()) options.voice = voice.identifier.trim();
  return options;
}
