import * as Speech from 'expo-speech';

import { playCue } from './playCue.ts';
import { evaluateEnglishVoices } from './voiceCheck.ts';

export async function runEnglishVoiceCheck(): Promise<{
  ok: boolean;
  voiceName?: string;
  message: string;
}> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const result = evaluateEnglishVoices(voices);
    if (!result.ok) {
      return {
        ok: false,
        message: '这台设备没有英语语音包。请到系统设置下载 English (UK)，没有再试 English，否则听写可能没声音。',
      };
    }
    playCue('apple');
    return {
      ok: true,
      voiceName: result.voiceName,
      message: result.voiceName
        ? `已找到英语语音 ${result.voiceName}，正在读 apple。`
        : '已找到英语语音，正在读 apple。',
    };
  } catch {
    return { ok: false, message: '没法检查语音，请再试一次。' };
  }
}
