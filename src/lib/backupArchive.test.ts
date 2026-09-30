import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { collectBackupMedia } from './backup.ts';
import { BACKUP_LIMITS, backupChecksum, createBackupArchive, parseBackupArchive } from './backupArchive.ts';
import { defaultState } from './storage.ts';

function fixture() {
  const state = defaultState();
  state.words = [{ id: 'w1', en: 'apple', zh: '苹果', source: 'parent', createdAt: 't', recordingUri: 'recordings/words/w1.m4a' }];
  state.sentences = [{ id: 's1', en: 'I like apples.', createdAt: 't', recordingUri: 'recordings/sentences/s1.m4a' }];
  state.albumBooks = [{ id: 'book', title: '我家', createdAt: 't', pages: [{ id: 'page', caption: 'An apple', captionZh: '苹果', photoUri: 'albums/book/page.jpg', recordingUri: 'recordings/albums/book/page.m4a' }] }];
  return state;
}

async function archive() {
  return createBackupArchive(fixture(), async (ref) => strToU8(`binary-${ref.kind}`), { appVersion: '0.1.27', exportedAt: '2026-09-30T00:00:00.000Z' });
}

describe('complete backup integrity', () => {
  it('uses the standard CRC32 checksum', () => {
    assert.equal(backupChecksum(strToU8('123456789')), 'cbf43926');
  });

  it('rejects missing media and state media that were not declared by the manifest', async () => {
    const files = unzipSync(await archive());
    const mediaPath = Object.keys(files).find((path) => path.startsWith('assets/'))!;
    delete files[mediaPath];
    assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })), /完整性|清单/);
  });

  it('rejects a changed media byte without trusting the regenerated ZIP CRC', async () => {
    const files = unzipSync(await archive());
    const path = Object.keys(files).find((name) => name.startsWith('assets/'))!;
    files[path][0] ^= 1;
    assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })), /完整性/);
  });

  it('rejects duplicate reference ownership, unknown schema and wrong content counts', async () => {
    for (const change of [
      (manifest: any) => { manifest.assets[1].references = manifest.assets[0].references; },
      (manifest: any) => { manifest.schemaVersion = 99; },
      (manifest: any) => { manifest.counts.profiles += 1; },
    ]) {
      const files = unzipSync(await archive());
      const manifest = JSON.parse(strFromU8(files['manifest.json']));
      change(manifest);
      files['manifest.json'] = strToU8(JSON.stringify(manifest));
      assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })));
    }
  });

  it('names unreadable media and stops instead of producing an incomplete archive', async () => {
    await assert.rejects(createBackupArchive(fixture(), async () => { throw new Error('失效'); }, { appVersion: '0.1.27' }), /单词「apple」录音.*失效/);
  });

  it('rejects the first file over the single-file cap', async () => {
    await assert.rejects(createBackupArchive(fixture(), async () => new Uint8Array(BACKUP_LIMITS.fileBytes + 1), { appVersion: '0.1.27' }), /容量上限/);
  });

  it('carries a typical synthetic set of 30 photos and 60 recordings byte-for-byte', async () => {
    const state = fixture();
    state.words = Array.from({ length: 30 }, (_, i) => ({ ...state.words[0], id: `w${i}`, recordingUri: `recordings/words/w${i}.m4a` }));
    state.sentences = [];
    state.albumBooks[0].pages = Array.from({ length: 30 }, (_, i) => ({ ...state.albumBooks[0].pages[0], id: `p${i}`, photoUri: `albums/book/p${i}.jpg`, recordingUri: `recordings/albums/book/p${i}.m4a` }));
    const photo = new Uint8Array(256 * 1024).fill(13);
    const recording = new Uint8Array(64 * 1024).fill(27);
    const bytes = await createBackupArchive(state, async (ref) => ref.kind === 'photo' ? photo : recording, { appVersion: '0.1.27' });
    const parsed = parseBackupArchive(bytes);
    assert.equal(parsed.manifest.resourceCount, 90);
    assert.equal(parsed.manifest.counts.photos, 30);
    assert.equal(parsed.manifest.counts.recordings, 60);
    for (const ref of collectBackupMedia(parsed.state)) assert.deepEqual(parsed.files[ref.stored], ref.kind === 'photo' ? photo : recording);
  });
});
