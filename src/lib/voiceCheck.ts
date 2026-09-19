export type VoiceHint = {
  language?: string;
  name?: string;
};

export type VoiceCheckResult = {
  ok: boolean;
  voiceName?: string;
};

/** 设备英语语音包是否在。只认 language 以 en 开头的条目。 */
export function evaluateEnglishVoices(voices: VoiceHint[]): VoiceCheckResult {
  const match = voices.find((voice) => (voice.language ?? '').toLowerCase().startsWith('en'));
  if (!match) return { ok: false };
  const name = match.name?.trim();
  return name ? { ok: true, voiceName: name } : { ok: true };
}
