import { pickPreferredEnglishVoice, type SpeechVoiceHint } from './ttsVoice.ts';

export type VoiceHint = SpeechVoiceHint;

export type VoiceCheckResult = {
  ok: boolean;
  voiceName?: string;
};

/** 设备英语语音包是否在。优先英式 en-GB，否则任意 en。 */
export function evaluateEnglishVoices(voices: VoiceHint[]): VoiceCheckResult {
  const match = pickPreferredEnglishVoice(voices);
  if (!match) return { ok: false };
  const name = match.name?.trim();
  return name ? { ok: true, voiceName: name } : { ok: true };
}
