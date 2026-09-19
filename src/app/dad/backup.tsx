import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { parseBackup, serializeBackup } from '@/lib/backup';
import { shareBackupText, writeBackupFile } from '@/lib/backupFiles';

export default function DadBackup() {
  const { exportSnapshot, replaceState } = useDesk();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [paste, setPaste] = useState('');

  const exportNow = async () => {
    setBusy(true);
    setNote('');
    try {
      const json = serializeBackup(exportSnapshot());
      const uri = await writeBackupFile(json);
      await shareBackupText(json);
      setNote(`备份已写到本机 ${uri}，也可以从系统分享里存一份。录音和相册照片仍只在这台设备上。`);
    } catch {
      Alert.alert('没导出成', '请再试一次。');
    } finally {
      setBusy(false);
    }
  };

  const importNow = () => {
    const parsed = parseBackup(paste);
    if (!parsed.ok) {
      Alert.alert('读不了这份备份', parsed.reason);
      return;
    }
    Alert.alert('用这份备份替换当前数据？', '词表、进度、留言和设置会换成备份里的内容。', [
      { text: '取消', style: 'cancel' },
      {
        text: '替换',
        style: 'destructive',
        onPress: () => {
          replaceState(parsed.state);
          setPaste('');
          setNote(`已导入。现在词表有 ${parsed.state.words.length} 个词。`);
        },
      },
    ]);
  };

  return (
    <Screen title="本机备份" subtitle="导出一份 JSON。不上传。换机后照片和录音需要重新录。" back>
      <Card style={styles.block}>
        <Text style={styles.body}>
          词表、进度、默写开关、留言和孩子档案可以带走。相册书的照片、家长录音还在原设备文档目录里，备份文件本身不打包它们。
        </Text>
        <KidButton label={busy ? '请稍等…' : '导出备份'} disabled={busy} onPress={() => void exportNow()} />
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </Card>
      <Card style={styles.block}>
        <Text style={styles.label}>导入备份</Text>
        <Text style={styles.body}>把备份 JSON 粘到下面，再替换当前数据。</Text>
        <TextInput
          multiline
          value={paste}
          onChangeText={setPaste}
          placeholder='{"kind":"learning-desk-backup",...}'
          placeholderTextColor={Colors.muted}
          style={styles.input}
        />
        <KidButton label="用粘贴内容替换" variant="danger" disabled={paste.trim().length === 0} onPress={importNow} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Space.sm,
    marginBottom: Space.md,
  },
  label: {
    fontWeight: '800',
    color: Colors.ink,
    fontSize: 18,
  },
  body: {
    color: Colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  note: {
    color: Colors.success,
    fontWeight: '700',
    marginTop: Space.sm,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    padding: Space.sm,
    fontSize: 14,
    color: Colors.ink,
    textAlignVertical: 'top',
  },
});
