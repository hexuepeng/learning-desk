import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RECORDING_DIR_NAME,
  albumPageRecordingRelativePath,
  guessAudioExt,
  isManagedRecordingRef,
  resolveStoredRecordingRef,
  toStoredRecordingRef,
  wordRecordingRelativePath,
} from './recording.ts';

describe('parent recording paths', () => {
  it('guesses audio extensions and defaults to m4a', () => {
    assert.equal(guessAudioExt('file:///tmp/clip.M4A?x=1'), '.m4a');
    assert.equal(guessAudioExt('blob:https://localhost/abc.webm'), '.webm');
    assert.equal(guessAudioExt('file:///tmp/no-ext'), '.m4a');
  });

  it('keeps word and album clips under the app documents directory', () => {
    const root = 'file:///docs/';
    assert.equal(wordRecordingRelativePath('w1', '.m4a'), `${RECORDING_DIR_NAME}/words/w1.m4a`);
    assert.equal(
      albumPageRecordingRelativePath('b1', 'p1', '.webm'),
      `${RECORDING_DIR_NAME}/albums/b1/p1.webm`,
    );
    assert.equal(
      toStoredRecordingRef('file:///docs/recordings/words/w1.m4a', root),
      'recordings/words/w1.m4a',
    );
    assert.equal(
      resolveStoredRecordingRef('recordings/words/w1.m4a', root),
      'file:///docs/recordings/words/w1.m4a',
    );
    assert.equal(isManagedRecordingRef('recordings/words/w1.m4a', root), true);
    assert.equal(isManagedRecordingRef('file:///docs/recordings/albums/b/p.m4a', root), true);
    assert.equal(isManagedRecordingRef('file:///cache/tmp.m4a', root), false);
  });
});
