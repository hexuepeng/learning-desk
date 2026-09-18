import * as Speech from 'expo-speech';

export { hasRecordingOverride, resolveSpeakSource } from './speakSource.ts';

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
