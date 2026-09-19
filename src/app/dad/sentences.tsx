import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen, SearchField } from '@/components/ui';
import { VoiceClipBar, voiceClipStatus } from '@/components/VoiceClipBar';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  MIC_PERMISSION_COPY,
  clipKey,
  useParentClipRecorder,
} from '@/hooks/useParentClipRecorder';
import { playCue } from '@/lib/playCue';
import { parseSentenceList } from '@/lib/parseSentenceList';
import { filterSentences, type SentenceDraft } from '@/lib/sentences';

export default function DadSentences() {
  const {
    state,
    upsertSentence,
    removeSentence,
    importSentenceText,
    setSentenceRecording,
    composeSentenceDrafts,
    saveSentenceDrafts,
  } = useDesk();
  const [en, setEn] = useState('');
  const [zh, setZh] = useState('');
  const [tags, setTags] = useState('');
  const [bulk, setBulk] = useState('');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [drafts, setDrafts] = useState<SentenceDraft[] | null>(null);
  const clip = useParentClipRecorder(async (target, uri) => {
    if (target.kind === 'sentence') await setSentenceRecording(target.id, uri);
  });

  const preview = parseSentenceList(bulk);
  const rows = useMemo(() => filterSentences(state.sentences, query), [state.sentences, query]);

  const startClip = async (sentenceId: string) => {
    const outcome = await clip.start({ kind: 'sentence', id: sentenceId });
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

  const runComposer = () => {
    const next = composeSentenceDrafts();
    if (next.length === 0) {
      Alert.alert('词表还空', '先加几个词，再用来拼短句。');
      return;
    }
    setDrafts(next);
  };

  return (
    <Screen
      title="今日短句"
      subtitle="家庭短句库。可粘贴导入，或用当前词表拼几句再改。默认不计入今日卡。"
      back
      scroll={false}
    >
      <SearchField value={query} onChangeText={setQuery} placeholder="搜英文、中文或标签" />
      <Card>
        <Text style={styles.label}>加一句</Text>
        <TextInput
          placeholder="I like apples."
          value={en}
          onChangeText={setEn}
          style={styles.input}
          autoCapitalize="sentences"
        />
        <TextInput
          placeholder="我喜欢苹果（可空）"
          value={zh}
          onChangeText={setZh}
          style={styles.input}
        />
        <TextInput
          placeholder="标签，如 weekly（可空）"
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          autoCapitalize="none"
        />
        <KidButton
          label="加到短句库"
          onPress={() => {
            upsertSentence({ en, zh, tags });
            setEn('');
            setZh('');
            setTags('');
          }}
        />
      </Card>
      <KidButton
        label="用当前词表拼几句"
        variant="secondary"
        style={{ marginTop: Space.md }}
        onPress={runComposer}
      />
      {drafts ? (
        <Card style={styles.block}>
          <Text style={styles.label}>本地拼句（请改完再存）</Text>
          <Text style={styles.meta}>
            只用当前词表和几条英式槽位，不是句库。存之前请改成家里会说的话。
          </Text>
          {drafts.map((draft, index) => (
            <View key={`${draft.en}-${index}`} style={styles.draft}>
              <TextInput
                value={draft.en}
                onChangeText={(value) =>
                  setDrafts((current) =>
                    current
                      ? current.map((item, i) => (i === index ? { ...item, en: value } : item))
                      : current,
                  )
                }
                style={styles.input}
                autoCapitalize="sentences"
              />
              <TextInput
                value={draft.zh}
                onChangeText={(value) =>
                  setDrafts((current) =>
                    current
                      ? current.map((item, i) => (i === index ? { ...item, zh: value } : item))
                      : current,
                  )
                }
                placeholder="中文对照（可空）"
                placeholderTextColor={Colors.muted}
                style={styles.input}
              />
            </View>
          ))}
          <KidButton
            label="保存这几句"
            onPress={() => {
              const result = saveSentenceDrafts(drafts);
              Alert.alert('已保存', `新增 ${result.added} 句，跳过重复 ${result.skipped} 句。`);
              setDrafts(null);
            }}
          />
          <KidButton
            label="丢掉草稿"
            variant="ghost"
            style={{ marginTop: Space.sm }}
            onPress={() => setDrafts(null)}
          />
        </Card>
      ) : null}
      <KidButton
        label={showImport ? '收起粘贴导入' : '粘贴短句导入'}
        variant="secondary"
        style={{ marginTop: Space.md }}
        onPress={() => setShowImport((value) => !value)}
      />
      {showImport ? (
        <Card style={styles.block}>
          <Text style={styles.label}>粘贴短句</Text>
          <Text style={styles.meta}>
            每行一句英文。也可两列：english,chinese 或 sentence|chinese，CSV
            两列同样认。重复英文会跳过（去空格、大小写）。可追加，或清空后整库替换。不要把商业句库打进应用包，由你在外面写好再粘进来。
          </Text>
          <TextInput
            multiline
            value={bulk}
            onChangeText={setBulk}
            placeholder={'I like apples.\nWe can see the sun,我们能看见太阳\nHave you got a pencil?|你有铅笔吗？'}
            placeholderTextColor={Colors.muted}
            style={[styles.input, styles.bulk]}
          />
          <Text style={styles.meta}>
            预览 {preview.length} 句 · 当前短句 {state.sentences.length} 句
          </Text>
          <KidButton
            label={preview.length ? `追加 ${preview.length} 句` : '追加到短句库'}
            disabled={preview.length === 0}
            onPress={() => {
              const result = importSentenceText(bulk, 'append');
              Alert.alert('已追加', `新增 ${result.added} 句，跳过重复 ${result.skipped} 句。`);
              setBulk('');
            }}
          />
          <KidButton
            label="清空后导入（替换）"
            variant="danger"
            style={{ marginTop: Space.sm }}
            disabled={preview.length === 0}
            onPress={() =>
              Alert.alert('替换全部短句？', '现有短句和本机录音会清掉，换成这次粘贴的内容。', [
                { text: '取消', style: 'cancel' },
                {
                  text: '替换',
                  style: 'destructive',
                  onPress: () => {
                    const result = importSentenceText(bulk, 'replace');
                    Alert.alert('已替换', `现在有 ${result.added} 句。`);
                    setBulk('');
                  },
                },
              ])
            }
          />
        </Card>
      ) : null}
      <Text style={styles.count}>
        {query.trim()
          ? `找到 ${rows.length} / ${state.sentences.length}`
          : `${state.sentences.length} 句`}
      </Text>
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const recording =
            clip.target != null &&
            clipKey(clip.target) === clipKey({ kind: 'sentence', id: item.id });
          return (
            <Card style={styles.row}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.en}>{item.en}</Text>
                  <Text style={styles.meta}>
                    {item.zh ? `${item.zh} · ` : ''}
                    {(item.tags ?? []).join(' ') || '无标签'}
                    {item.wordIds?.length ? ` · 对上 ${item.wordIds.length} 个词` : ''}
                  </Text>
                </View>
                <KidButton
                  label="删"
                  variant="ghost"
                  compact
                  onPress={() =>
                    Alert.alert('删掉这句？', item.en, [
                      { text: '取消', style: 'cancel' },
                      { text: '删除', style: 'destructive', onPress: () => removeSentence(item.id) },
                    ])
                  }
                />
              </View>
              <TextInput
                key={`${item.id}-en`}
                defaultValue={item.en}
                placeholder="英文短句"
                placeholderTextColor={Colors.muted}
                autoCapitalize="sentences"
                style={styles.input}
                onEndEditing={(event) =>
                  upsertSentence({
                    id: item.id,
                    en: event.nativeEvent.text,
                    zh: item.zh,
                    tags: item.tags,
                  })
                }
              />
              <TextInput
                key={`${item.id}-zh`}
                defaultValue={item.zh ?? ''}
                placeholder="中文对照（可空）"
                placeholderTextColor={Colors.muted}
                style={styles.input}
                onEndEditing={(event) =>
                  upsertSentence({
                    id: item.id,
                    en: item.en,
                    zh: event.nativeEvent.text,
                    tags: item.tags,
                  })
                }
              />
              <TextInput
                key={`${item.id}-tags`}
                defaultValue={(item.tags ?? []).join(', ')}
                placeholder="标签，如 weekly"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                style={styles.input}
                onEndEditing={(event) =>
                  upsertSentence({
                    id: item.id,
                    en: item.en,
                    zh: item.zh,
                    tags: event.nativeEvent.text,
                  })
                }
              />
              <VoiceClipBar
                status={voiceClipStatus(item.recordingUri, recording, clip.isRecording)}
                disabled={Boolean(clip.target) && !recording}
                elapsedMs={recording ? clip.durationMillis : 0}
                onRecord={() => void startClip(item.id)}
                onStop={() => void stopClip()}
                onPreview={() => playCue(item.en, item.recordingUri)}
                onDelete={() =>
                  Alert.alert('删掉这段录音？', '孩子会重新听到设备朗读。', [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '删除',
                      style: 'destructive',
                      onPress: () => void setSentenceRecording(item.id, null),
                    },
                  ])
                }
              />
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
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
  draft: {
    marginBottom: Space.sm,
  },
  count: {
    color: Colors.muted,
    fontWeight: '700',
    marginVertical: Space.sm,
  },
  row: {
    gap: 4,
    marginBottom: 10,
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
