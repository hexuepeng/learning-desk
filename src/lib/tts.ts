import * as Speech from 'expo-speech';

export function speakEnglish(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  Speech.stop();
  Speech.speak(trimmed, {
    language: 'en-US',
    rate: 0.85,
    pitch: 1.05,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

/** v0.1：家长录音覆盖尚未接通，仅保留钩子。 */
export function hasRecordingOverride(uri?: string | null): boolean {
  return Boolean(uri);
}
