import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasRecordingOverride, resolveSpeakSource, voiceClipStatus } from './speakSource.ts';

describe('resolveSpeakSource prefers parent recording over TTS', () => {
  it('uses recording when recordingUri is present', () => {
    const source = resolveSpeakSource('apple', 'recordings/words/w1.m4a');
    assert.deepEqual(source, {
      kind: 'recording',
      uri: 'recordings/words/w1.m4a',
      text: 'apple',
    });
    assert.equal(hasRecordingOverride('recordings/words/w1.m4a'), true);
  });

  it('falls back to TTS when recording is missing or blank', () => {
    assert.deepEqual(resolveSpeakSource('  apple  ', null), { kind: 'tts', text: 'apple' });
    assert.deepEqual(resolveSpeakSource('apple', undefined), { kind: 'tts', text: 'apple' });
    assert.deepEqual(resolveSpeakSource('apple', '   '), { kind: 'tts', text: 'apple' });
    assert.equal(hasRecordingOverride(null), false);
    assert.equal(hasRecordingOverride(''), false);
    assert.equal(hasRecordingOverride('  '), false);
  });

  it('delete (null uri) restores TTS even if the word text is unchanged', () => {
    const withClip = resolveSpeakSource('cat', 'recordings/words/cat.m4a');
    const afterDelete = resolveSpeakSource('cat', null);
    assert.equal(withClip.kind, 'recording');
    assert.deepEqual(afterDelete, { kind: 'tts', text: 'cat' });
  });

  it('trims stored uri and still prefers recording over empty caption text', () => {
    const source = resolveSpeakSource('  ', '  recordings/albums/b/p.m4a  ');
    assert.equal(source.kind, 'recording');
    if (source.kind === 'recording') {
      assert.equal(source.uri, 'recordings/albums/b/p.m4a');
    }
  });

  it('maps UI states: empty, has recording, arming, recording in progress', () => {
    assert.equal(voiceClipStatus(null, false), 'empty');
    assert.equal(voiceClipStatus('recordings/words/w1.m4a', false), 'ready');
    assert.equal(voiceClipStatus(null, true, false), 'arming');
    assert.equal(voiceClipStatus(null, true, true), 'recording');
    assert.equal(voiceClipStatus('recordings/words/w1.m4a', true, true), 'recording');
  });
});
