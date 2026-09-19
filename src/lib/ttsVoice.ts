export const TTS_LANGUAGE = 'en-GB';
export const TTS_RATE = 0.85;
export const TTS_PITCH = 1.05;

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

/** 优先英式 en-GB / en-UK；没有再退回任意英语语音。 */
export function pickPreferredEnglishVoice(
  voices: SpeechVoiceHint[],
): SpeechVoiceHint | undefined {
  const english = voices.filter((voice) => isEnglish(voice.language));
  return english.find((voice) => isBritish(voice.language)) ?? english[0];
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
