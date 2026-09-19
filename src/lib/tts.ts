import * as Speech from 'expo-speech';

import { buildSpeakOptions, pickPreferredEnglishVoice, type SpeechVoiceHint } from './ttsVoice.ts';

export { hasRecordingOverride, resolveSpeakSource } from './speakSource.ts';

let voiceReady: Promise<SpeechVoiceHint | undefined> | null = null;

function loadPreferredVoice(): Promise<SpeechVoiceHint | undefined> {
  if (!voiceReady) {
    voiceReady = Speech.getAvailableVoicesAsync()
      .then((voices) => pickPreferredEnglishVoice(voices))
      .catch(() => undefined);
  }
  return voiceReady;
}

function speakWithOptions(text: string, options: Parameters<typeof Speech.speak>[1]): void {
  Speech.speak(text, options);
}

/** 优先英式 en-GB 语音；没有则退回任意英语或只带 language，不抛错。 */
export function speakEnglish(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    Speech.stop();
  } catch {
    // 停不掉也不要影响这次朗读
  }
  void (async () => {
    try {
      const voice = await loadPreferredVoice();
      speakWithOptions(trimmed, buildSpeakOptions(voice));
    } catch {
      try {
        speakWithOptions(trimmed, buildSpeakOptions());
      } catch {
        try {
          speakWithOptions(trimmed, { rate: 0.85, pitch: 1.05 });
        } catch {
          // 没有语音也不要崩
        }
      }
    }
  })();
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // 忽略
  }
}
