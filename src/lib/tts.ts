import * as Speech from 'expo-speech';

import {
  TTS_PITCH,
  TTS_RATE,
  buildSpeakOptions,
  pickPreferredEnglishVoice,
  type SpeechVoiceHint,
} from './ttsVoice.ts';

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

/** 优先知名英式系统音（en-GB）；本机没装英式语音包时退回任意英语。 */
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
          speakWithOptions(trimmed, { rate: TTS_RATE, pitch: TTS_PITCH });
        } catch {
          // 没有语音也不要崩
        }
      }
    }
  })();
}

export const TTS_CHINESE_LANGUAGE = 'zh-CN';

/** 中文提示音（闯关「听中文选词」）。英语仍走 en-GB。 */
export function speakChinese(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    Speech.stop();
  } catch {
    // 停不掉也不要影响这次朗读
  }
  try {
    speakWithOptions(trimmed, { language: TTS_CHINESE_LANGUAGE, rate: 0.9, pitch: 1 });
  } catch {
    // 没有中文语音也不要崩
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // 忽略
  }
}
