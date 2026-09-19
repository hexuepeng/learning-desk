import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TTS_LANGUAGE, buildSpeakOptions, pickPreferredEnglishVoice } from './ttsVoice.ts';

describe('ttsVoice', () => {
  it('prefers a British voice over US English', () => {
    const picked = pickPreferredEnglishVoice([
      { language: 'zh-CN', name: 'Tingting', identifier: 'zh' },
      { language: 'en-US', name: 'Samantha', identifier: 'us' },
      { language: 'en-GB', name: 'Daniel', identifier: 'gb' },
    ]);
    assert.equal(picked?.identifier, 'gb');
    assert.deepEqual(buildSpeakOptions(picked), {
      language: 'en-GB',
      rate: 0.85,
      pitch: 1.05,
      voice: 'gb',
    });
  });

  it('falls back to any English voice, then to en-GB language only', () => {
    const us = pickPreferredEnglishVoice([{ language: 'en-US', name: 'Samantha', identifier: 'us' }]);
    assert.equal(us?.identifier, 'us');
    assert.equal(buildSpeakOptions(us).language, 'en-US');
    assert.equal(pickPreferredEnglishVoice([{ language: 'zh-CN' }]), undefined);
    assert.deepEqual(buildSpeakOptions(undefined), {
      language: TTS_LANGUAGE,
      rate: 0.85,
      pitch: 1.05,
    });
  });
});
