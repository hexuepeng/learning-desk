import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { collectBackupMedia, parseBackup } from './backup.ts';
import { isManagedAlbumRef } from './album.ts';
import {
  BACKUP_LIMITS,
  backupChecksum,
  createBackupArchive,
  inspectBackupZip,
  parseBackupArchive,
  type BackupManifest,
} from './backupArchive.ts';
import {
  createRestorePlan,
  recoverInterruptedRestore,
  restoreBackupPlan,
  type RestoreIO,
} from './backupRestore.ts';
import { isManagedRecordingRef } from './recording.ts';
import {
  applyQuestAnswer,
  currentQuestMode,
  emptyQuestState,
  ensureQuestDay,
  normalizeQuestState,
  pendingQuestWordIds,
  pruneQuestWord,
  questAnswerKey,
} from './quest.ts';
import { defaultState } from './storage.ts';
import type { PersistedState, QuestModeIndex, QuestState } from '../types/models.ts';

const DATE = '2026-09-30';

function plan(ids: string[]): QuestState {
  return ensureQuestDay(
    { ...emptyQuestState(), packWordIds: ids },
    new Set(ids),
    DATE,
  );
}

function submit(quest: QuestState, mode: QuestModeIndex, wordId: string, correct = true) {
  return applyQuestAnswer(quest, {
    profileId: 'child-a',
    date: DATE,
    mode,
    wordId,
    outcome: mode === 2 ? 'self-reported' : correct ? 'correct' : 'incorrect',
  }, DATE, '2026-09-30T02:00:00.000Z');
}

describe('independent acceptance: daily quest', () => {
  it('AC26-02 leaves the 90 unselected due records unchanged and breaks ties by pack order', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `due-${i}`);
    const quest: QuestState = {
      ...emptyQuestState(),
      dailyNewCount: 30,
      packWordIds: [...ids, 'new-a'],
      items: Object.fromEntries(ids.map((id, i) => [id, {
        learnedOn: '2026-09-01',
        step: 1,
        nextDue: i >= 91 ? '2026-09-01' : '2026-09-15',
      }])),
    };
    const before = JSON.stringify(quest);
    const selected = ensureQuestDay(quest, new Set(quest.packWordIds), DATE);
    assert.deepEqual(selected.day?.ids, [...ids.slice(91), 'due-0']);
    assert.deepEqual(selected.day?.newIds, []);
    assert.deepEqual(selected.items, quest.items);
    assert.equal(selected.items['new-a'], undefined);
    assert.equal(JSON.stringify(quest), before);
  });

  it('AC26-03/05/11 survives a reload after each of nine submissions and settles only once', () => {
    let quest = plan(['a', 'b', 'c']);
    let submitted = 0;
    for (const mode of [0, 1, 2] as const) {
      for (const id of ['a', 'b', 'c']) {
        assert.equal(currentQuestMode(quest.day), mode);
        assert.equal(pendingQuestWordIds(quest.day, mode)[0], id);
        const result = submit(quest, mode, id, !(mode === 0 && id === 'a'));
        assert.equal(result.accepted, true);
        submitted += 1;
        quest = normalizeQuestState(JSON.parse(JSON.stringify(result.quest)));
      }
    }
    assert.equal(submitted, 9);
    assert.equal(quest.day?.complete, true);
    assert.deepEqual(quest.day?.stars, [1, 3, 3]);
    assert.deepEqual(Object.values(quest.items).map((item) => item.step), [1, 1, 1]);
    const duplicate = submit(quest, 2, 'c');
    assert.equal(duplicate.accepted, false);
    assert.equal(duplicate.quest, quest);
    assert.equal(quest.day?.answers?.[questAnswerKey(2, 'c')].outcome, 'self-reported');
  });

  it('AC26-04 keeps a generated plan stable after import and a same-day quota change', () => {
    const quest = plan(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const changed = { ...quest, dailyNewCount: 30 as const, packWordIds: [...quest.packWordIds, 'h'] };
    const sameDay = ensureQuestDay(changed, new Set(changed.packWordIds), DATE);
    assert.deepEqual(sameDay.day?.ids, ['a', 'b', 'c', 'd', 'e']);
    assert.equal(sameDay.items.f, undefined);
    assert.equal(sameDay.items.g, undefined);
    assert.equal(sameDay.items.h, undefined);
    assert.equal(sameDay.cursor, 5);
  });

  it('AC26-07 preserves the first answer and its timestamp when a submitted key is repeated', () => {
    const first = submit(plan(['a', 'b']), 0, 'a', false);
    const second = submit(first.quest, 0, 'a', true);
    assert.equal(second.accepted, false);
    assert.equal(second.quest, first.quest);
    assert.deepEqual(second.quest.day?.answers?.['0:a'], {
      outcome: 'incorrect', submittedAt: '2026-09-30T02:00:00.000Z',
    });
    assert.deepEqual(pendingQuestWordIds(second.quest.day, 0), ['b']);
  });

  it('AC26-09 advances remaining review records when deleting the last unanswered word finishes round three', () => {
    let quest = plan(['a', 'b']);
    for (const mode of [0, 1] as const) {
      for (const id of ['a', 'b']) quest = submit(quest, mode, id).quest;
    }
    quest = submit(quest, 2, 'a').quest;
    const afterDelete = pruneQuestWord(quest, 'b');
    assert.equal(afterDelete.day?.complete, true);
    assert.deepEqual(afterDelete.day?.ids, ['a']);
    assert.equal(afterDelete.items.a.step, 1);
    assert.equal(afterDelete.items.a.nextDue, '2026-10-01');
    assert.equal(afterDelete.items.b, undefined);
    assert.equal(Object.keys(afterDelete.day?.answers ?? {}).length, 3);
  });

  it('AC26-10 rejects a previous-day callback without changing the next-day plan', () => {
    const nextDay = ensureQuestDay(plan(['a', 'b']), new Set(['a', 'b']), '2026-10-01');
    const before = JSON.stringify(nextDay);
    const late = applyQuestAnswer(nextDay, {
      profileId: 'child-a', date: DATE, mode: 0, wordId: 'a', outcome: 'correct',
    }, '2026-10-01');
    assert.equal(late.accepted, false);
    assert.equal(JSON.stringify(late.quest), before);
  });

  it('AC26-12 never awards or completes a task when its last word is deleted', () => {
    const empty = pruneQuestWord(plan(['a']), 'a');
    assert.equal(empty.day?.complete, false);
    assert.deepEqual(empty.day?.stars, [0, 0, 0]);
    assert.deepEqual(empty.items, {});
    assert.equal(currentQuestMode(empty.day), 'done');
    assert.equal(submit(empty, 0, 'a').accepted, false);
  });
});

describe('independent acceptance: restore transaction', () => {
  it('B27-02/03/10 restores shared media to independently managed paths for safe later deletion', async () => {
    const { bytes } = await familyArchive();
    const backup = parseBackupArchive(bytes);
    const restored = createRestorePlan(backup, 'acceptance-001');
    assert.equal(restored.files.length, 6);
    assert.equal(new Set(restored.files.map((file) => file.path)).size, 6);
    const refs = collectBackupMedia(restored.state);
    assert.notEqual(refs[0].stored, refs[1].stored);
    assert.deepEqual(restored.files[0].bytes, restored.files[1].bytes);
    for (const ref of refs) {
      assert.ok(ref.kind === 'photo' ? isManagedAlbumRef(ref.stored, null) : isManagedRecordingRef(ref.stored, null));
      assert.ok(!ref.stored.includes('old-device'));
    }
  });

  it('B27-07 preserves old media when new-state read-back fails and allows cold-start retry after rollback also fails', async () => {
    const { bytes } = await familyArchive();
    const restored = createRestorePlan(parseBackupArchive(bytes), 'acceptance-002');
    const previous = familyBackupFixture();
    let current = previous;
    let raw: string | null = JSON.stringify(previous);
    let journal: string | null = null;
    let failNewVerification = true;
    let failRollback = true;
    let cleanupCalled = false;
    const files = new Map(collectBackupMedia(previous).map((ref) => [ref.stored, strToU8(ref.stored)]));
    const originalPaths = [...files.keys()];
    const io: RestoreIO = {
      readRawState: async () => raw,
      restoreRawState: async (restoredRaw) => {
        if (failRollback) throw new Error('rollback write failed');
        raw = restoredRaw;
        current = JSON.parse(restoredRaw!);
      },
      readJournal: async () => journal,
      writeJournal: async (text) => { journal = text; },
      clearJournal: async () => { journal = null; },
      writeFile: async (path, contents) => { files.set(path, contents); },
      readFile: async (path) => {
        const contents = files.get(path);
        if (!contents) throw new Error('file missing');
        return contents;
      },
      removeFile: async (path) => { files.delete(path); },
      commitState: async (candidate) => {
        current = candidate;
        raw = JSON.stringify(candidate);
      },
      verifyState: async (candidate) => {
        if (failNewVerification && candidate === restored.state) throw new Error('read-back failed');
        assert.deepEqual(current, candidate);
      },
      cleanupPrevious: async () => { cleanupCalled = true; },
    };
    await assert.rejects(restoreBackupPlan(restored, previous, io), /恢复中断/);
    assert.notEqual(journal, null);
    assert.equal(cleanupCalled, false);
    for (const path of originalPaths) assert.ok(files.has(path));

    // 下一次启动磁盘可写后，仍从保留的日志恢复；无需原导入文件仍在。
    failRollback = false;
    failNewVerification = false;
    assert.equal(await recoverInterruptedRestore(io), true);
    assert.deepEqual(current, previous);
    assert.equal(journal, null);
    assert.deepEqual([...files.keys()], originalPaths);
    assert.equal(cleanupCalled, false);
    assert.equal(await recoverInterruptedRestore(io), false);
  });
});

function familyBackupFixture(): PersistedState {
  const base = defaultState();
  return {
    ...base,
    profiles: ['child-a', 'child-b'].map((id) => ({ id, name: id, createdAt: DATE, archived: false })),
    activeProfileId: 'child-a',
    words: ['a', 'b'].map((id) => ({
      id, en: id, zh: id, source: 'parent', createdAt: DATE, profileId: `child-${id}`,
      recordingUri: 'file:///old-device/shared-word.m4a',
    })),
    sentences: [{ id: 'sentence-a', en: 'A short sentence.', createdAt: DATE, profileId: 'child-a', recordingUri: 'recordings/sentence.m4a' }],
    albumBooks: ['a', 'b'].map((id) => ({
      id: `book-${id}`, title: id, createdAt: DATE, profileId: `child-${id}`,
      pages: [{
        id: `page-${id}`, photoUri: 'albums/shared-photo.jpg', caption: id, captionZh: id,
        recordingUri: id === 'a' ? 'recordings/page.m4a' : null,
      }],
    })),
    questByProfile: { 'child-a': submit(plan(['a']), 0, 'a').quest, 'child-b': plan(['b']) },
  };
}

async function familyArchive() {
  const calls: string[] = [];
  const bytes = await createBackupArchive(familyBackupFixture(), async (reference) => {
    calls.push(reference.stored);
    return strToU8(`binary fixture: ${reference.stored}`);
  }, { appVersion: '0.1.27', exportedAt: '2026-09-30T03:00:00.000Z' });
  return { bytes, calls };
}

describe('independent acceptance: complete backup container', () => {
  it('B27-05 keeps the already-supported historical star format importable', () => {
    const parsed = parseBackup(JSON.stringify({
      version: 1, words: [],
      stars: { lastRatedDate: '2026-09-29', lastStars: 3, consecutiveThreeStarDays: 1 },
    }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.state.stars.byDate, { '2026-09-29': 3 });
    assert.equal(parsed.state.stars.celebrationKey, null);
  });

  it('B27-01/02/03 preserves two profiles and quest answers, embeds all four media kinds, and reads shared files only once', async () => {
    const { bytes, calls } = await familyArchive();
    const restored = parseBackupArchive(bytes);
    assert.equal(calls.length, 4);
    assert.equal(restored.manifest.resourceCount, 4);
    assert.deepEqual(restored.manifest.counts, { profiles: 2, words: 2, sentences: 1, photos: 2, recordings: 4 });
    assert.deepEqual(restored.state.questByProfile, familyBackupFixture().questByProfile);
    assert.equal(collectBackupMedia(restored.state).length, 6);
    assert.deepEqual(new Set(collectBackupMedia(restored.state).map((ref) => ref.kind)), new Set([
      'word-recording', 'sentence-recording', 'photo', 'page-recording',
    ]));
    assert.equal(Object.keys(restored.files).length, 6);
    assert.equal(strFromU8(restored.files['state.json']).includes('old-device'), false);
    for (const ref of collectBackupMedia(restored.state)) {
      assert.ok(ref.stored.startsWith('assets/'));
      assert.ok(restored.files[ref.stored].length > 0);
    }
  });

  it('B27-05/06 rejects future JSON and ZIP formats instead of migrating them as old backups', async () => {
    assert.equal(parseBackup(JSON.stringify({ kind: 'learning-desk-backup', format: 999, state: familyBackupFixture() })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ ...familyBackupFixture(), version: 999 })).ok, false);
    const { bytes } = await familyArchive();
    const files = unzipSync(bytes);
    const manifest = JSON.parse(strFromU8(files['manifest.json']));
    manifest.format = 999;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })), /格式/);
  });

  it('B27-06 rejects traversal, absolute, backslash and duplicate-case ZIP names before decompression', () => {
    for (const path of ['../state.json', '/state.json', 'assets/../state.json', 'assets\\state.json', 'C:/state.json']) {
      const bytes = zipSync({ 'manifest.json': strToU8('{}'), [path]: strToU8('{}') }, { level: 0 });
      assert.throws(() => inspectBackupZip(bytes), /路径|重复/);
    }
    const duplicate = zipSync({ 'manifest.json': strToU8('{}'), 'state.json': strToU8('{}'), 'STATE.JSON': strToU8('{}') }, { level: 0 });
    assert.throws(() => inspectBackupZip(duplicate), /路径|重复/);
  });

  it('B27-06 rejects a tiny ZIP whose declared expanded member exceeds the per-file limit', async () => {
    const { bytes } = await familyArchive();
    const changed = bytes.slice();
    const view = new DataView(changed.buffer);
    const end = changed.length - 22;
    const central = view.getUint32(end + 16, true);
    const local = view.getUint32(central + 42, true);
    view.setUint32(central + 24, BACKUP_LIMITS.fileBytes + 1, true);
    view.setUint32(local + 22, BACKUP_LIMITS.fileBytes + 1, true);
    assert.throws(() => inspectBackupZip(changed), /容量上限/);
  });

  it('B27-06 rejects local-header and directory disagreement without reading media', async () => {
    const { bytes } = await familyArchive();
    const changed = bytes.slice();
    const view = new DataView(changed.buffer);
    view.setUint32(22, view.getUint32(22, true) + 1, true);
    assert.throws(() => inspectBackupZip(changed), /文件头与目录不一致/);
  });

  it('B27-06 rejects a deflate stream that expands past the limit despite forged small sizes and matching prefix CRC', async () => {
    const { bytes } = await familyArchive();
    const files = unzipSync(bytes);
    const original = files['manifest.json'];
    const expanded = new Uint8Array(BACKUP_LIMITS.fileBytes + 1).fill(32);
    expanded.set(original);
    files['manifest.json'] = expanded;
    const changed = zipSync(files, { level: 9 });
    const view = new DataView(changed.buffer);
    const end = changed.length - 22;
    let central = view.getUint32(end + 16, true);
    for (let i = 0; i < view.getUint16(end + 10, true); i += 1) {
      const nameLength = view.getUint16(central + 28, true);
      const extraLength = view.getUint16(central + 30, true);
      const commentLength = view.getUint16(central + 32, true);
      if (strFromU8(changed.subarray(central + 46, central + 46 + nameLength)) === 'manifest.json') {
        const local = view.getUint32(central + 42, true);
        const crc = Number.parseInt(backupChecksum(original), 16);
        view.setUint32(central + 24, original.length, true);
        view.setUint32(local + 22, original.length, true);
        view.setUint32(central + 16, crc, true);
        view.setUint32(local + 14, crc, true);
      }
      central += 46 + nameLength + extraLength + commentLength;
    }
    assert.throws(() => parseBackupArchive(changed), /压缩|容量|大小|完整/);
  });

  it('B27-06 rejects an undeclared archive member even when every listed member is intact', async () => {
    const { bytes } = await familyArchive();
    const files = unzipSync(bytes);
    files['unrelated.txt'] = strToU8('not referenced by the state');
    assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })), /未登记/);
  });

  it('B27-06 rejects malformed nested quest progress even when ZIP CRC and manifest checksums match', async () => {
    const { bytes } = await familyArchive();
    const files = unzipSync(bytes);
    const state = JSON.parse(strFromU8(files['state.json']));
    state.questByProfile['child-a'].day.ids = 'damaged-list';
    const previousSize = files['state.json'].length;
    files['state.json'] = strToU8(JSON.stringify(state));
    const manifest = JSON.parse(strFromU8(files['manifest.json'])) as BackupManifest;
    manifest.state.size = files['state.json'].length;
    manifest.state.checksum = backupChecksum(files['state.json']);
    manifest.totalBytes += files['state.json'].length - previousSize;
    files['manifest.json'] = strToU8(JSON.stringify(manifest));
    assert.throws(() => parseBackupArchive(zipSync(files, { level: 0 })), /存档结构|闯关|进度|数据/);
  });
});
