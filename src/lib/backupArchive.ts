import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import type { PersistedState } from '../types/models.ts';
import { guessPhotoExt } from './album.ts';
import {
  BACKUP_KIND,
  collectBackupMedia,
  countBackupContent,
  remapBackupMedia,
  validateBackupState,
  type BackupCounts,
  type MediaReference,
} from './backup.ts';
import { guessAudioExt } from './recording.ts';

export const COMPLETE_BACKUP_FORMAT = 2;
/** 保守的内存保护值；不是已完成 iPad 容量实测的声明。 */
export const BACKUP_LIMITS = {
  files: 500,
  references: 1000,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 48 * 1024 * 1024,
  archiveBytes: 50 * 1024 * 1024,
  freeSpaceReserve: 16 * 1024 * 1024,
} as const;

type FileDescriptor = { path: string; size: number; checksum: string };
export type BackupAsset = FileDescriptor & { id: string; references: string[] };
export type BackupManifest = {
  kind: typeof BACKUP_KIND;
  format: 2;
  appVersion: string;
  schemaVersion: 1;
  exportedAt: string;
  counts: BackupCounts;
  resourceCount: number;
  totalBytes: number;
  state: FileDescriptor;
  assets: BackupAsset[];
};
export type CompleteBackup = {
  kind: 'complete';
  state: PersistedState;
  manifest: BackupManifest;
  files: Record<string, Uint8Array>;
};

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

/** CRC32 检测传输和文件损坏，不表示备份经过身份认证或加密。 */
export function backupChecksum(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export function isSafeBackupPath(path: string): boolean {
  return path.length <= 180 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..' && part !== '__proto__' && part !== 'constructor' && part !== 'prototype');
}

function checkSize(size: number, max = BACKUP_LIMITS.fileBytes): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > max) throw new Error('备份超过容量上限：单文件 8 MiB，总内容 48 MiB');
}

function describeFile(path: string, bytes: Uint8Array): FileDescriptor {
  return { path, size: bytes.length, checksum: backupChecksum(bytes) };
}

export async function createBackupArchive(
  state: PersistedState,
  readMedia: (reference: MediaReference) => Promise<Uint8Array>,
  options: { appVersion: string; exportedAt?: string; canonicalize?: (reference: MediaReference) => string },
): Promise<Uint8Array> {
  validateBackupState(state, true);
  const references = collectBackupMedia(state);
  if (references.length > BACKUP_LIMITS.references) throw new Error('备份引用过多，最多支持 1000 处照片和录音引用');
  const groups = new Map<string, MediaReference[]>();
  for (const reference of references) {
    const source = options.canonicalize?.(reference) ?? reference.stored;
    groups.set(source, [...(groups.get(source) ?? []), reference]);
  }
  if (groups.size > BACKUP_LIMITS.files) throw new Error('照片和录音超过 500 个文件的上限');
  const files: Record<string, Uint8Array> = {};
  const assets: BackupAsset[] = [];
  const paths = new Map<string, string>();
  let total = 0;
  for (const group of groups.values()) {
    const reference = group[0];
    let bytes: Uint8Array;
    try {
      bytes = await readMedia(reference);
    } catch (error) {
      throw new Error(`${reference.label}无法读取。${error instanceof Error ? error.message : '请重新选择照片或录音。'}`);
    }
    checkSize(bytes.length);
    if (!bytes.length) throw new Error(`${reference.label}是空文件`);
    total += bytes.length;
    checkSize(total, BACKUP_LIMITS.totalBytes);
    const id = `media-${String(assets.length + 1).padStart(4, '0')}`;
    const extension = reference.kind === 'photo' ? guessPhotoExt(reference.stored) : guessAudioExt(reference.stored);
    const path = `assets/${id}${extension}`;
    files[path] = bytes;
    assets.push({ id, ...describeFile(path, bytes), references: group.map((ref) => ref.key) });
    group.forEach((ref) => paths.set(ref.key, path));
  }
  files['state.json'] = strToU8(JSON.stringify(remapBackupMedia(state, paths)));
  checkSize(files['state.json'].length);
  total += files['state.json'].length;
  const manifest: BackupManifest = {
    kind: BACKUP_KIND,
    format: COMPLETE_BACKUP_FORMAT,
    appVersion: options.appVersion,
    schemaVersion: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    counts: countBackupContent(state),
    resourceCount: assets.length,
    totalBytes: total,
    state: describeFile('state.json', files['state.json']),
    assets,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  checkSize(total + files['manifest.json'].length, BACKUP_LIMITS.totalBytes);
  // 媒体通常已压缩。无压缩 ZIP 限定 CPU/内存占用，也不需要 Worker 或原生库。
  const archive = zipSync(files, { level: 0 });
  checkSize(archive.length, BACKUP_LIMITS.archiveBytes);
  return archive;
}

type ZipEntry = { path: string; size: number; checksum: string };

/** 在 fflate 分配解压内存之前验证中央目录以及对应本地头。 */
export function inspectBackupZip(bytes: Uint8Array): ZipEntry[] {
  checkSize(bytes.length, BACKUP_LIMITS.archiveBytes);
  if (bytes.length < 22) throw new Error('ZIP 文件不完整');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end -= 1) {
    if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
  }
  if (end < Math.max(0, bytes.length - 65557)) throw new Error('ZIP 目录损坏');
  const count = u16(end + 10);
  const directorySize = u32(end + 12);
  const directoryStart = u32(end + 16);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count === 0xffff ||
    directorySize === 0xffffffff || directoryStart === 0xffffffff ||
    (end >= 20 && u32(end - 20) === 0x07064b50)) throw new Error('暂不支持分卷或 ZIP64 备份');
  if (count < 2 || count > BACKUP_LIMITS.files + 2) throw new Error('ZIP 文件数量超限或缺少清单');
  if (directoryStart + directorySize !== end) throw new Error('ZIP 目录范围不正确');
  let offset = directoryStart;
  let total = 0;
  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    if (offset + 46 > end || u32(offset) !== 0x02014b50) throw new Error('ZIP 文件目录损坏');
    const flags = u16(offset + 8);
    const method = u16(offset + 10);
    const compressed = u32(offset + 20);
    const size = u32(offset + 24);
    const nameLength = u16(offset + 28);
    const extraLength = u16(offset + 30);
    const commentLength = u16(offset + 32);
    const local = u32(offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    // 本应用只导出 STORE。拒绝 DEFLATE，防止声明长度小于真实膨胀长度时被解压器截断后绕过限额。
    if (next > end || u16(offset + 34) || (flags & 1) || (flags & 8) || method !== 0) throw new Error('只支持学习台生成的未压缩 ZIP 备份，不支持加密或其他压缩方式');
    if (((u32(offset + 38) >>> 16) & 0xf000) === 0xa000) throw new Error('备份不能包含符号链接');
    checkSize(size);
    total += size;
    checkSize(total, BACKUP_LIMITS.totalBytes);
    if (method === 0 && compressed !== size) throw new Error('ZIP 文件大小不匹配');
    const path = strFromU8(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!isSafeBackupPath(path) || names.has(path.toLowerCase())) throw new Error('ZIP 包含越界路径或重复文件');
    names.add(path.toLowerCase());
    if (local + 30 > directoryStart || u32(local) !== 0x04034b50) throw new Error('ZIP 文件头损坏');
    const localNameLength = u16(local + 26);
    const localExtraLength = u16(local + 28);
    const dataStart = local + 30 + localNameLength + localExtraLength;
    if (dataStart + compressed > directoryStart || u16(local + 6) !== flags || u16(local + 8) !== method ||
      u32(local + 18) !== compressed || u32(local + 22) !== size || u32(local + 14) !== u32(offset + 16) ||
      strFromU8(bytes.subarray(local + 30, local + 30 + localNameLength)) !== path) throw new Error('ZIP 文件头与目录不一致');
    spans.push([local, dataStart + compressed]);
    entries.push({ path, size, checksum: u32(offset + 16).toString(16).padStart(8, '0') });
    offset = next;
  }
  if (offset !== end) throw new Error('ZIP 目录存在多余数据');
  spans.sort((a, b) => a[0] - b[0]);
  if (spans[0][0] !== 0 || spans.some((span, i) => i > 0 && spans[i - 1][1] !== span[0]) || spans[spans.length - 1][1] !== directoryStart) {
    throw new Error('ZIP 文件重叠或存在未登记内容');
  }
  return entries;
}

export function parseBackupArchive(bytes: Uint8Array): CompleteBackup {
  const entries = inspectBackupZip(bytes);
  const files = unzipSync(bytes);
  for (const entry of entries) {
    if (files[entry.path]?.length !== entry.size || backupChecksum(files[entry.path]) !== entry.checksum) throw new Error(`文件校验失败：${entry.path}`);
  }
  let manifest: BackupManifest;
  let state: unknown;
  try {
    manifest = JSON.parse(strFromU8(files['manifest.json'])) as BackupManifest;
    state = JSON.parse(strFromU8(files['state.json']));
  } catch {
    throw new Error('备份清单或状态 JSON 损坏');
  }
  if (!manifest || manifest.kind !== BACKUP_KIND || manifest.format !== COMPLETE_BACKUP_FORMAT) throw new Error('不支持这份完整备份格式，请先更新学习台');
  if (manifest.schemaVersion !== 1) throw new Error('这份备份的数据版本暂不支持，请先更新学习台');
  if (typeof manifest.appVersion !== 'string' || typeof manifest.exportedAt !== 'string' || !Number.isFinite(Date.parse(manifest.exportedAt))) throw new Error('备份来源信息不正确');
  validateBackupState(state, true);
  if (!Array.isArray(manifest.assets) || manifest.resourceCount !== manifest.assets.length || manifest.assets.length > BACKUP_LIMITS.files) throw new Error('资源数量与清单不一致');
  const expected = collectBackupMedia(state);
  if (expected.length > BACKUP_LIMITS.references) throw new Error('备份引用数量超过上限');
  const references = new Map(expected.map((ref) => [ref.key, ref]));
  const seenReferences = new Set<string>();
  const seenPaths = new Set<string>(['manifest.json', 'state.json']);
  const seenIds = new Set<string>();
  const verify = (descriptor: FileDescriptor) => {
    if (!descriptor || typeof descriptor.path !== 'string' || !isSafeBackupPath(descriptor.path) ||
      !Number.isSafeInteger(descriptor.size) || typeof descriptor.checksum !== 'string' ||
      files[descriptor.path]?.length !== descriptor.size || backupChecksum(files[descriptor.path]) !== descriptor.checksum) throw new Error('文件大小或完整性与清单不符');
  };
  if (manifest.state?.path !== 'state.json') throw new Error('状态清单不正确');
  verify(manifest.state);
  let total = manifest.state.size;
  for (const asset of manifest.assets) {
    verify(asset);
    if (typeof asset.id !== 'string' || !/^media-\d{4}$/.test(asset.id) || seenIds.has(asset.id) ||
      !new RegExp(`^assets/${asset.id}\\.[a-z0-9]+$`).test(asset.path) || seenPaths.has(asset.path) ||
      !Array.isArray(asset.references) || !asset.references.length || !asset.size) throw new Error('资源清单含重复或非法条目');
    seenIds.add(asset.id);
    seenPaths.add(asset.path);
    total += asset.size;
    for (const key of asset.references) {
      const reference = references.get(key);
      if (!reference || reference.stored !== asset.path || seenReferences.has(key)) throw new Error('资源引用关系与状态不一致');
      seenReferences.add(key);
    }
  }
  if (seenReferences.size !== references.size || Object.keys(files).some((path) => !seenPaths.has(path)) || total !== manifest.totalBytes) throw new Error('备份缺少资源或含未登记文件');
  const counts = countBackupContent(state);
  if (!manifest.counts || (Object.keys(counts) as Array<keyof BackupCounts>).some((key) => manifest.counts[key] !== counts[key])) throw new Error('内容数量与清单不一致');
  return { kind: 'complete', state, manifest, files };
}
