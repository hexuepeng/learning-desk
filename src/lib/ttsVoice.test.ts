import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TTS_LANGUAGE,
  TTS_PITCH,
  TTS_RATE,
  buildSpeakOptions,
  pickPreferredEnglishVoice,
} from './ttsVoice.ts';

describe('ttsVoice', () => {
  it('uses a slower kid-friendly English rate and near-natural pitch', () => {
    assert.equal(TTS_LANGUAGE, 'en-GB');
    assert.equal(TTS_RATE, 0.68);
    assert.equal(TTS_PITCH, 1);
    assert.ok(TTS_RATE >= 0.65 && TTS_RATE <= 0.72);
  });

  it('prefers a known British system voice over a generic en-GB voice', () => {
    const picked = pickPreferredEnglishVoice([
      { language: 'zh-CN', name: 'Tingting', identifier: 'zh' },
      { language: 'en-US', name: 'Samantha', identifier: 'us' },
      { language: 'en-GB', name: 'British English', identifier: 'gb-generic' },
      { language: 'en-GB', name: 'Daniel (Enhanced)', identifier: 'com.apple.voice.enhanced.en-GB.Daniel' },
    ]);
    assert.equal(picked?.identifier, 'com.apple.voice.enhanced.en-GB.Daniel');
    assert.deepEqual(buildSpeakOptions(picked), {
      language: 'en-GB',
      rate: TTS_RATE,
      pitch: TTS_PITCH,
      voice: 'com.apple.voice.enhanced.en-GB.Daniel',
    });
  });

  it('matches preferred British names case-insensitively and ranks Daniel first', () => {
    const kateFirst = pickPreferredEnglishVoice([
      { language: 'en-GB', name: 'KATE', identifier: 'kate' },
      { language: 'en-UK', name: 'daniel', identifier: 'daniel' },
    ]);
    assert.equal(kateFirst?.identifier, 'daniel');
  });

  it('falls back to any British voice, then any English, then en-GB language only', () => {
    const genericGb = pickPreferredEnglishVoice([
      { language: 'en-US', name: 'Samantha', identifier: 'us' },
      { language: 'en-GB', name: 'UK English', identifier: 'gb' },
    ]);
    assert.equal(genericGb?.identifier, 'gb');

    const us = pickPreferredEnglishVoice([{ language: 'en-US', name: 'Samantha', identifier: 'us' }]);
    assert.equal(us?.identifier, 'us');
    assert.equal(buildSpeakOptions(us).language, 'en-US');
    assert.equal(pickPreferredEnglishVoice([{ language: 'zh-CN' }]), undefined);
    assert.deepEqual(buildSpeakOptions(undefined), {
      language: TTS_LANGUAGE,
      rate: TTS_RATE,
      pitch: TTS_PITCH,
    });
  });
});
