import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { parseWordList } from '@/lib/parseWordList';

export default function DadWords() {
  const { state, upsertWord, removeWord, importWordText, restoreSampleWords } = useDesk();
  const [en, setEn] = useState('');
  const [zh, setZh] = useState('');
  const [bulk, setBulk] = useState('');
  const preview = parseWordList(bulk);

  return (
    <Screen title="词表" subtitle="英文 + 中文释义。可一条条加，也可整段粘贴。" back>
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
          v0.1 使用设备自带英语朗读。家长录音覆盖会在后续版本接上（词条已预留 recordingUri）。
        </Text>
        <KidButton label="录一段发音（即将支持）" variant="ghost" disabled onPress={() => {}} />
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
        {state.words.map((word) => (
          <Card key={word.id} style={styles.row}>
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
          </Card>
        ))}
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
