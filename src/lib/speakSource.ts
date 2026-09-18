export type SpeakSource =
  | { kind: 'recording'; uri: string; text: string }
  | { kind: 'tts'; text: string };

export type VoiceClipStatus = 'empty' | 'ready' | 'recording';

/** 有家长录音时优先播录音，否则用设备英语 TTS。 */
export function hasRecordingOverride(uri?: string | null): boolean {
  return Boolean(uri?.trim());
}

export function resolveSpeakSource(text: string, recordingUri?: string | null): SpeakSource {
  const trimmed = text.trim();
  const uri = recordingUri?.trim() ?? '';
  if (uri) {
    return { kind: 'recording', uri, text: trimmed };
  }
  return { kind: 'tts', text: trimmed };
}

export function voiceClipStatus(
  recordingUri: string | null | undefined,
  recording: boolean,
): VoiceClipStatus {
  if (recording) return 'recording';
  return hasRecordingOverride(recordingUri) ? 'ready' : 'empty';
}
