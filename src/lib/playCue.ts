import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

import { displayRecordingUri } from './recordingFiles.ts';
import { resolveSpeakSource } from './speakSource.ts';
import { speakEnglish, stopSpeaking } from './tts.ts';

let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null);
  }
  return player;
}

function pauseRecordingPlayer(): void {
  try {
    getPlayer().pause();
  } catch {
    // 播放器尚未就绪
  }
}

export function stopCue(): void {
  stopSpeaking();
  pauseRecordingPlayer();
}

async function playRecording(stored: string, fallbackText: string): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
    const uri = displayRecordingUri(stored);
    const audio = getPlayer();
    audio.replace({ uri });
    await audio.seekTo(0);
    audio.play();
  } catch {
    speakEnglish(fallbackText);
  }
}

/** 孩子点「听一听」：有家长录音就播录音，否则设备英语 TTS（优先 en-GB）。 */
export function playCue(text: string, recordingUri?: string | null): void {
  const source = resolveSpeakSource(text, recordingUri);
  stopCue();
  if (source.kind === 'recording') {
    void playRecording(source.uri, source.text);
    return;
  }
  speakEnglish(source.text);
}
