import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { countBackupContent, type BackupCounts } from '@/lib/backup';
import {
  exportCompleteBackup,
  exportDataBackup,
  importPreparedBackup,
  pickBackupFile,
  prepareLegacyBackup,
  type PreparedBackup,
} from '@/lib/backupFiles';

function countsText(counts: BackupCounts): string {
  return `${counts.profiles} 个孩子档案、${counts.words} 个词、${counts.sentences} 条短句、${counts.photos} 张照片、${counts.recordings} 段录音`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作没有完成，请重试。';
}

export default function DadBackup({ recoveryMode = false }: { recoveryMode?: boolean }) {
  const { exportSnapshot, replaceState, withBackupSnapshot, loadError, retryLoad } = useDesk();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<PreparedBackup | null>(null);
  const [confirming, setConfirming] = useState(false);
  const native = Platform.OS !== 'web';

  const exportNow = async (complete: boolean) => {
    setBusy(true);
    setNote(complete ? '正在收集所有孩子的内容、照片和录音…' : '正在生成仅数据 JSON…');
    try {
      await withBackupSnapshot(async (snapshot) => {
        if (complete) await exportCompleteBackup(snapshot);
        else await exportDataBackup(snapshot);
      });
      setNote(native ? `${complete ? '完整备份文件' : '仅数据备份'}已生成，分享面板已结束。请确认你已选择外部保存位置；取消分享不会保存备份。` : '仅数据 JSON 已生成并发起浏览器下载，请检查下载列表。文件不包含照片或录音。');
    } catch (error) {
      setNote(errorText(error));
      Alert.alert('备份没有完成', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const prepare = async (fromFile: boolean) => {
    setBusy(true);
    setNote('');
    setPreview(null);
    setConfirming(false);
    try {
      const selected = fromFile ? await pickBackupFile() : await prepareLegacyBackup(paste);
      if (selected) setPreview(selected);
      else setNote('已取消选择，当前数据未改变。');
    } catch (error) {
      setNote(errorText(error));
      Alert.alert('读不了这份备份', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (selected: PreparedBackup) => {
    setBusy(true);
    setNote('正在暂存并校验媒体，请保持学习台打开…');
    try {
      const result = await withBackupSnapshot((snapshot) => importPreparedBackup(selected, snapshot, replaceState));
      setPreview(null);
      setConfirming(false);
      setPaste('');
      setNote(`${selected.kind === 'complete' ? '完整备份已恢复，媒体已逐文件读回校验。' : '仅数据 JSON 已恢复，照片和录音仍依赖原设备文件。'}现在共有${countsText(countBackupContent(selected.state))}。${result.cleanupPending ? '部分旧媒体未能清理，可继续使用新内容。' : ''}`);
    } catch (error) {
      setNote(errorText(error));
      Alert.alert('没有完成恢复', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={recoveryMode ? '恢复本机存档' : '完整备份'} subtitle="全部孩子的内容一起备份，由你选择保存位置。" back={!recoveryMode}>
      {recoveryMode ? (
        <Card style={styles.block}>
          <Text style={styles.label}>原存档已保留</Text>
          <Text style={styles.body}>{loadError ?? '尚未读入本机存档。请重试或选择备份恢复。'}</Text>
          <KidButton label="重试读取" disabled={busy} onPress={() => void retryLoad()} />
        </Card>
      ) : (
        <Card style={styles.block}>
          <Text style={styles.label}>导出完整备份</Text>
          <Text style={styles.body}>包含所有孩子档案、词表、短句、学习进度、相册照片，以及单词、短句和书页的家长录音。</Text>
          <Text style={styles.body}>本版上限：500 个媒体文件、每个 8 MiB、总内容 48 MiB。请至少额外留出 16 MiB 空间。备份含家庭照片和家长密码，请保存在自己的位置。</Text>
          {native ? <KidButton label={busy ? '请稍等…' : '导出完整备份文件'} disabled={busy} onPress={() => void exportNow(true)} /> : <Text style={styles.body}>完整媒体备份请在 iPad 或 Android 应用中操作。</Text>}
          <KidButton label="仅导出数据 JSON（不含照片和录音）" variant="secondary" disabled={busy} onPress={() => void exportNow(false)} />
        </Card>
      )}
      <Card style={styles.block}>
        <Text style={styles.label}>选择备份并预览</Text>
        <Text style={styles.body}>先检查备份内容，再确认替换。选择文件或取消预览都不会改动本机数据。</Text>
        {native ? <KidButton label={busy ? '请稍等…' : '选择 ZIP / JSON 备份文件'} disabled={busy} onPress={() => void prepare(true)} /> : null}
        <Text style={styles.body}>也可以粘贴以前的 JSON 备份：</Text>
        <TextInput multiline editable={!busy} value={paste} onChangeText={setPaste} placeholder='{"kind":"learning-desk-backup",...}' placeholderTextColor={Colors.muted} style={styles.input} />
        <KidButton label="检查粘贴的 JSON" variant="secondary" disabled={busy || !paste.trim()} onPress={() => void prepare(false)} />
      </Card>
      {preview ? (
        <Card style={styles.block}>
          <Text style={styles.label}>{preview.kind === 'complete' ? '完整备份预览' : '旧 JSON 预览（不含媒体）'}</Text>
          <Text style={styles.body}>来源版本：{preview.kind === 'complete' ? preview.manifest.appVersion : '旧文字备份'}</Text>
          <Text style={styles.body}>导出时间：{(preview.kind === 'complete' ? preview.manifest.exportedAt : preview.exportedAt) ?? '未记录'}</Text>
          <Text style={styles.body}>{countsText(countBackupContent(preview.state))}</Text>
          {!recoveryMode ? <Text style={styles.body}>本机将被替换：{countsText(countBackupContent(exportSnapshot()))}</Text> : null}
          {preview.kind === 'legacy' ? <Text style={styles.body}>这份文件不包含照片或录音。{preview.missingMedia.length ? `当前无法读取 ${preview.missingMedia.length} 处引用：${preview.missingMedia.slice(0, 8).join('、')}${preview.missingMedia.length > 8 ? '等' : ''}。` : '目前引用仍可在本机读取，换设备后不保证可用。'}</Text> : <Text style={styles.body}>已核对媒体清单和文件校验值。恢复后将使用本机新路径。</Text>}
          {confirming ? <>
            <Text style={styles.label}>替换本机所有孩子的内容？</Text>
            <Text style={styles.body}>备份中的所有档案、进度、设置和家长密码将成为当前内容。{recoveryMode ? '无法读取的原始存档会保留一份恢复副本。' : ''}{preview.kind === 'legacy' ? '这份 JSON 不能补回缺失的照片和录音。' : ''}</Text>
            <KidButton label="确认替换所有档案" variant="danger" disabled={busy} onPress={() => void restore(preview)} />
            <KidButton label="返回预览" variant="secondary" disabled={busy} onPress={() => setConfirming(false)} />
          </> : <KidButton label="使用这份备份恢复" disabled={busy} onPress={() => setConfirming(true)} />}
          <KidButton label="取消预览" variant="secondary" disabled={busy} onPress={() => { setPreview(null); setConfirming(false); }} />
        </Card>
      ) : null}
      {note ? <Card style={styles.block}><Text style={styles.note}>{note}</Text></Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: Space.sm, marginBottom: Space.md },
  label: { fontWeight: '800', color: Colors.ink, fontSize: 18 },
  body: { color: Colors.muted, fontSize: 16, lineHeight: 24 },
  note: { color: Colors.ink, fontWeight: '700', lineHeight: 24 },
  input: { minHeight: 140, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.sm, padding: Space.sm, fontSize: 14, color: Colors.ink, textAlignVertical: 'top' },
});
