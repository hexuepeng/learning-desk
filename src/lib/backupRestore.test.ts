import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8 } from 'fflate';

import { createBackupArchive, parseBackupArchive } from './backupArchive.ts';
import { createRestorePlan, recoverInterruptedRestore, restoreBackupPlan, type RestoreIO, type RestoreJournal } from './backupRestore.ts';
import { defaultState } from './storage.ts';

async function fixture() {
  const state = defaultState();
  state.words[0].recordingUri = 'recordings/words/old.m4a';
  state.albumBooks = [{ id: 'book', title: 'test', createdAt: 't', pages: [{ id: 'page', photoUri: 'albums/book/old.jpg', caption: 'old', captionZh: '' }] }];
  const archive = await createBackupArchive(state, async (ref) => strToU8(ref.kind), { appVersion: '0.1.27' });
  const plan = createRestorePlan(parseBackupArchive(archive), 'test-batch');
  const originalRaw = JSON.stringify(state, null, 2);
  const store = { raw: originalRaw as string | null, journal: null as string | null, files: new Map<string, Uint8Array>([['recordings/words/old.m4a', strToU8('old')]]), commits: 0, cleanups: 0 };
  const io: RestoreIO = {
    readRawState: async () => store.raw,
    restoreRawState: async (raw) => { store.raw = raw; },
    readJournal: async () => store.journal,
    writeJournal: async (text) => { store.journal = text; },
    clearJournal: async () => { store.journal = null; },
    writeFile: async (path, bytes) => { store.files.set(path, bytes.slice()); },
    readFile: async (path) => { const value = store.files.get(path); if (!value) throw new Error('missing file'); return value; },
    removeFile: async (path) => { store.files.delete(path); },
    commitState: async (next) => { store.commits += 1; store.raw = JSON.stringify(next); },
    verifyState: async (next) => { assert.equal(store.raw, JSON.stringify(next)); },
    cleanupPrevious: async () => { store.cleanups += 1; },
  };
  return { state, plan, store, io, originalRaw };
}

describe('backup transaction durability', () => {
  it('treats an empty journal as damaged and blocks both recovery and a new import', async () => {
    const { state, plan, store, io, originalRaw } = await fixture();
    assert.equal(await recoverInterruptedRestore(io), false);
    store.journal = '';
    await assert.rejects(recoverInterruptedRestore(io), /恢复记录损坏/);
    await assert.rejects(restoreBackupPlan(plan, state, io), /未完成的恢复/);
    assert.equal(store.journal, '');
    assert.equal(store.raw, originalRaw);
    assert.equal(store.commits, 0);
    assert.equal(store.cleanups, 0);
    assert.deepEqual([...store.files.keys()], ['recordings/words/old.m4a']);
  });

  it('does not commit state or remove old media when staging runs out of space', async () => {
    const { state, plan, store, io, originalRaw } = await fixture();
    let writes = 0;
    const originalWrite = io.writeFile;
    io.writeFile = async (path, bytes) => { if (++writes === 2) throw new Error('space exhausted'); await originalWrite(path, bytes); };
    await assert.rejects(restoreBackupPlan(plan, state, io), /space exhausted/);
    assert.equal(store.raw, originalRaw);
    assert.equal(store.journal, null);
    assert.equal(store.commits, 0);
    assert.equal(store.cleanups, 0);
    assert.deepEqual([...store.files.keys()], ['recordings/words/old.m4a']);
  });

  it('rolls back corrupted written bytes before state submission', async () => {
    const { state, plan, store, io, originalRaw } = await fixture();
    io.writeFile = async (path) => { store.files.set(path, new Uint8Array([0])); };
    await assert.rejects(restoreBackupPlan(plan, state, io), /媒体写入校验失败/);
    assert.equal(store.raw, originalRaw);
    assert.equal(store.commits, 0);
  });

  for (const stage of ['journal', 'partial-media', 'state-committed'] as const) {
    it(`cold start restores the exact prior bytes after interruption at ${stage}`, async () => {
      const { state, plan, store, io, originalRaw } = await fixture();
      const journal: RestoreJournal = { version: 1, token: plan.token, previous: state, previousRaw: originalRaw, stagedPaths: plan.files.map((file) => file.path) };
      store.journal = JSON.stringify(journal);
      if (stage !== 'journal') store.files.set(plan.files[0].path, plan.files[0].bytes);
      if (stage === 'state-committed') store.raw = JSON.stringify(plan.state);
      assert.equal(await recoverInterruptedRestore(io), true);
      assert.equal(store.raw, originalRaw);
      assert.equal(store.journal, null);
      assert.deepEqual([...store.files.keys()], ['recordings/words/old.m4a']);
    });
  }

  it('preserves an unreadable original raw archive when recovery-mode import fails', async () => {
    const { state, plan, store, io } = await fixture();
    store.raw = '{ damaged original';
    io.commitState = async () => { throw new Error('storage failed'); };
    await assert.rejects(restoreBackupPlan(plan, state, io), /storage failed/);
    assert.equal(store.raw, '{ damaged original');
    assert.equal(store.journal, null);
  });

  it('retains successful new content when only old-file cleanup fails', async () => {
    const { state, plan, store, io } = await fixture();
    io.cleanupPrevious = async () => { throw new Error('cleanup failed'); };
    assert.deepEqual(await restoreBackupPlan(plan, state, io), { cleanupPending: true });
    assert.equal(store.raw, JSON.stringify(plan.state));
    assert.equal(store.journal, null);
    assert.ok(plan.files.every((file) => store.files.has(file.path)));
  });

  it('rejects a damaged journal that attempts to remove an original media path', async () => {
    const { state, plan, store, io, originalRaw } = await fixture();
    store.journal = JSON.stringify({ version: 1, token: plan.token, previous: state, previousRaw: originalRaw, stagedPaths: ['recordings/words/old.m4a'] });
    await assert.rejects(recoverInterruptedRestore(io), /不安全/);
    assert.equal(store.raw, originalRaw);
    assert.ok(store.files.has('recordings/words/old.m4a'));
    assert.ok(store.journal);
  });
});
