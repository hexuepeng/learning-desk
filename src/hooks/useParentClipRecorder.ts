import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { stopCue } from '@/lib/playCue';
import { MAX_CLIP_MS } from '@/lib/recording';

export const MIC_PERMISSION_COPY = {
  title: '需要麦克风',
  body: '录音只保存在这台设备上，不会上传。',
};

export type ClipTarget =
  | { kind: 'word'; id: string }
  | { kind: 'album'; bookId: string; pageId: string };

export function clipKey(target: ClipTarget): string {
  return target.kind === 'word' ? `word:${target.id}` : `album:${target.bookId}:${target.pageId}`;
}

export function useParentClipRecorder(
  persistClip?: (target: ClipTarget, uri: string) => Promise<void> | void,
) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 200);
  const [target, setTarget] = useState<ClipTarget | null>(null);
  const targetRef = useRef<ClipTarget | null>(null);
  const finishing = useRef(false);
  const persistRef = useRef(persistClip);
  persistRef.current = persistClip;

  const ensureMic = useCallback(async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return true;
    const next = await requestRecordingPermissionsAsync();
    return next.granted;
  }, []);

  const stop = useCallback(async (): Promise<{ target: ClipTarget; uri: string } | null> => {
    if (finishing.current) return null;
    finishing.current = true;
    const current = targetRef.current;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      targetRef.current = null;
      setTarget(null);
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
        });
      } catch {
        // 模式切回失败不影响已录文件
      }
      if (!current || !uri) return null;
      await persistRef.current?.(current, uri);
      return { target: current, uri };
    } catch {
      targetRef.current = null;
      setTarget(null);
      return null;
    } finally {
      finishing.current = false;
    }
  }, [recorder]);

  const start = useCallback(
    async (next: ClipTarget): Promise<'ok' | 'permission' | 'busy' | 'failed'> => {
      if (targetRef.current) return 'busy';
      const granted = await ensureMic();
      if (!granted) return 'permission';
      try {
        stopCue();
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
        });
        await recorder.prepareToRecordAsync();
        targetRef.current = next;
        setTarget(next);
        recorder.record();
        return 'ok';
      } catch {
        targetRef.current = null;
        setTarget(null);
        return 'failed';
      }
    },
    [ensureMic, recorder],
  );

  useEffect(() => {
    if (!target) return;
    if (recState.isRecording && recState.durationMillis >= MAX_CLIP_MS) {
      void stop();
    }
  }, [target, recState.isRecording, recState.durationMillis, stop]);

  return {
    target,
    isRecording: recState.isRecording,
    durationMillis: recState.durationMillis,
    maxMs: MAX_CLIP_MS,
    start,
    stop,
  };
}
