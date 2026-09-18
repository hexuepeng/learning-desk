import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { VoiceClipBar, voiceClipStatus } from '@/components/VoiceClipBar';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  MIC_PERMISSION_COPY,
  clipKey,
  useParentClipRecorder,
} from '@/hooks/useParentClipRecorder';
import { playCue } from '@/lib/playCue';
import { parseWordList } from '@/lib/parseWordList';

export default function DadWords() {
  const { state, upsertWord, removeWord, importWordText, restoreSampleWords, setWordRecording } =
    useDesk();
  const [en, setEn] = useState('');
  const [zh, setZh] = useState('');
  const [bulk, setBulk] = useState('');
  const clip = useParentClipRecorder(async (target, uri) => {
    if (target.kind === 'word') await setWordRecording(target.id, uri);
  });

  const startClip = async (wordId: string) => {
    const outcome = await clip.start({ kind: 'word', id: wordId });
    if (outcome === 'permission') {
      Alert.alert(MIC_PERMISSION_COPY.title, MIC_PERMISSION_COPY.body);
    } else if (outcome === 'failed') {
      Alert.alert('没录上', '请再试一次。');
    }
  };

  const stopClip = async () => {
    const hadTarget = Boolean(clip.target);
    const result = await clip.stop();
    if (!result && hadTarget) Alert.alert('没录上', '请对着麦克风再说一次。');
  };

  const preview = parseWordList(bulk);

  return (
    <Screen title="词表" subtitle="英文 + 中文释义。每个词可录爸爸的发音，只留本机。" back>
      <Card>
        <Text style={styles.label}>加一个词</Text>
        <TextInput placeholder="apple" value={en} onChangeText={setEn} style={styles.input} autoCapitalize="none" />
        <TextInput placeholder="苹果" value={zh} onChangeText={setZh} style={styles.input} />
        <KidButton
          label="加到词表"
          onPress={() => {
            upsertWord({ en, zh });
            setEn('');
            setZh('');
          }}
        />
        <Text style={[styles.label, { marginTop: Space.md }]}>发音</Text>
        <Text style={styles.meta}>
          默认用设备英语朗读。录一段后，孩子点「听一听」会先听你的声音。删掉录音就回到设备朗读。录音不会上传。
        </Text>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.label}>粘贴词表</Text>
        <Text style={styles.meta}>每行：apple 苹果 或 ice cream,冰淇淋</Text>
        <TextInput
          multiline
          value={bulk}
          onChangeText={setBulk}
          placeholder={'cat 猫\ndog 狗'}
          placeholderTextColor={Colors.muted}
          style={[styles.input, styles.bulk]}
        />
        <KidButton
          label={preview.length ? `导入 ${preview.length} 个词` : '导入'}
          disabled={preview.length === 0}
          onPress={() => {
            const n = importWordText(bulk);
            Alert.alert('已处理', `解析到 ${n} 行（重复英文会跳过）。`);
            setBulk('');
          }}
        />
      </Card>

      <KidButton label="补回示例词包" variant="secondary" onPress={restoreSampleWords} />

      <View style={styles.list}>
        {state.words.map((word) => {
          const recording =
            clip.target != null && clipKey(clip.target) === clipKey({ kind: 'word', id: word.id });
          return (
            <Card key={word.id} style={styles.row}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.en}>{word.en}</Text>
                  <Text style={styles.meta}>
                    {word.zh} · {word.source === 'sample' ? '示例' : '家长'}
                  </Text>
                </View>
                <KidButton
                  label="删"
                  variant="ghost"
                  compact
                  onPress={() =>
                    Alert.alert('删掉这个词？', word.en, [
                      { text: '取消', style: 'cancel' },
                      { text: '删除', style: 'destructive', onPress: () => removeWord(word.id) },
                    ])
                  }
                />
              </View>
              <VoiceClipBar
                status={voiceClipStatus(word.recordingUri, recording)}
                disabled={Boolean(clip.target) && !recording}
                elapsedMs={recording ? clip.durationMillis : 0}
                onRecord={() => void startClip(word.id)}
                onStop={() => void stopClip()}
                onPreview={() => playCue(word.en, word.recordingUri)}
                onDelete={() =>
                  Alert.alert('删掉这段录音？', '孩子会重新听到设备朗读。', [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '删除',
                      style: 'destructive',
                      onPress: () => void setWordRecording(word.id, null),
                    },
                  ])
                }
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 8,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  bulk: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  meta: {
    color: Colors.muted,
    marginBottom: Space.sm,
    fontSize: 15,
  },
  block: {
    marginTop: Space.md,
  },
  list: {
    gap: 10,
    marginTop: Space.lg,
  },
  row: {
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  en: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
  },
});
