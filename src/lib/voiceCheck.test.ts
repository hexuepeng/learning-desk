import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateEnglishVoices } from './voiceCheck.ts';

describe('voiceCheck', () => {
  it('accepts an english voice', () => {
    const result = evaluateEnglishVoices([
      { language: 'zh-CN', name: ' Tingting' },
      { language: 'en-US', name: 'Samantha' },
    ]);
    assert.equal(result.ok, true);
    assert.equal(result.voiceName, 'Samantha');
  });

  it('fails when only other languages exist', () => {
    const result = evaluateEnglishVoices([{ language: 'zh-CN', name: 'Tingting' }]);
    assert.equal(result.ok, false);
    assert.equal(result.voiceName, undefined);
  });
});
