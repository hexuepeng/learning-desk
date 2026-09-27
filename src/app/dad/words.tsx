import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { IpaText } from '@/components/IpaText';
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
import { QUEST_NEW_COUNTS } from '@/lib/quest';
import { parseWordList } from '@/lib/parseWordList';
import { filterWords } from '@/lib/wordsView';

export default function DadWords() {
  const {
    state,
    quest,
    upsertWord,
    removeWord,
    importWordText,
    importFamilyKetPack,
    restoreSampleWords,
    setWordRecording,
    setShowIpa,
    setWordKetPack,
    setQuestDailyNewCount,
  } = useDesk();
  const [en, setEn] = useState('');
  const [zh, setZh] = useState('');
  const [ipa, setIpa] = useState('');
  const [ketPack, setKetPack] = useState(false);
  const [importKet, setImportKet] = useState(true);
  const [bulk, setBulk] = useState('');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const clip = useParentClipRecorder(async (target, uri) => {
    if (target.kind === 'word') await setWordRecording(target.id, uri);
  });

  const preview = parseWordList(bulk);
  const rows = useMemo(() => filterWords(state.words, query), [state.words, query]);

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

  return (
    <Screen
      title="词表"
      subtitle="英文 + 中文释义 + 可选英式音标。勾选「用于闯关词库」后，KET 闯关按导入顺序学。只留本机。"
      back
      scroll={false}
    >
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(word) => word.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
      <Card style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>每天新词</Text>
          <Text style={styles.meta}>
            KET 闯关每天新学 10 / 20 / 30 个（默认 20）。今日已抽好的卡从明天起按新数量。词库 {quest.packWordIds.length}{' '}
            · 已安排 {quest.cursor}
          </Text>
          <View style={styles.countRow}>
            {QUEST_NEW_COUNTS.map((count) => (
              <KidButton
                key={count}
                label={`${count}`}
                compact
                variant={quest.dailyNewCount === count ? 'primary' : 'secondary'}
                onPress={() => setQuestDailyNewCount(count)}
                style={styles.countBtn}
              />
            ))}
          </View>
        </View>
      </Card>
      <Card style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>显示音标</Text>
          <Text style={styles.meta}>开着时，孩子背词和揭晓答案会看到英式 IPA。默认开。</Text>
        </View>
        <Switch
          value={state.showIpa}
          onValueChange={setShowIpa}
          trackColor={{ true: Colors.success }}
        />
      </Card>
      <SearchField value={query} onChangeText={setQuery} placeholder="搜英文、中文或音标" />
      <Card>
        <Text style={styles.label}>加一个词</Text>
        <TextInput
          placeholder="apple"
          value={en}
          onChangeText={setEn}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput placeholder="苹果" value={zh} onChangeText={setZh} style={styles.input} />
        <TextInput
          placeholder="英式音标，如 /ˈæpl/（可空）"
          value={ipa}
          onChangeText={setIpa}
          style={styles.input}
          autoCapitalize="none"
        />
        <View style={styles.toggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>用于闯关词库</Text>
            <Text style={styles.meta}>加到 KET 闯关顺序里，不替代今日卡。</Text>
          </View>
          <Switch value={ketPack} onValueChange={setKetPack} trackColor={{ true: Colors.success }} />
        </View>
        <KidButton
          label="加到词表"
          onPress={() => {
            upsertWord({ en, zh, ipa, ketPack });
            setEn('');
            setZh('');
            setIpa('');
          }}
        />
        <Text style={[styles.label, { marginTop: Space.md }]}>发音</Text>
        <Text style={styles.meta}>
          默认优先英式英语朗读。录一段后，孩子点「听一听」会先听你的声音。删掉录音就回到设备朗读。录音不会上传。
        </Text>
      </Card>
      <Card style={styles.block}>
        <Text style={styles.label}>导入 KET 包</Text>
        <Text style={styles.meta}>
          内置约 1792 个词。新装或闯关词库为空时会自动种入。也可再点这里按文件顺序重排。英文词目对照公开的剑桥 A2 Key 词汇指引整理；中文释义和音标是家里自己准备的，不是剑桥官方文本。只留本机，不主张剑桥授权。
        </Text>
        <KidButton
          label="导入 KET 包"
          onPress={() =>
            Alert.alert(
              '导入内置 KET 包？',
              '会追加约 1792 个词，并按文件顺序重排闯关词库。已有的相同英文会跳过。今日英语卡不受影响。',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '导入',
                  onPress: () => {
                    const result = importFamilyKetPack();
                    Alert.alert(
                      '已导入 KET 包',
                      `新增 ${result.added} 个，跳过重复 ${result.skipped} 个，闯关词库现有 ${result.packAdded} 个。`,
                    );
                  },
                },
              ],
            )
          }
        />
      </Card>
      <KidButton
        label={showImport ? '收起粘贴导入' : '粘贴词表导入'}
        variant="secondary"
        style={{ marginTop: Space.md }}
        onPress={() => setShowImport((value) => !value)}
      />
      {showImport ? (
        <Card style={styles.block}>
          <Text style={styles.label}>粘贴词表</Text>
          <Text style={styles.meta}>
            每行 english,chinese，也可第三列英式 IPA：apple,苹果,/ˈæpl/。也认空格/分号/CSV。可把导出的词表文件内容整段粘进来。默认追加，重复英文跳过。这是家里自己用的本机词包，不要写成上架的商业词库。
          </Text>
          <View style={styles.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>用于闯关词库</Text>
              <Text style={styles.meta}>
                勾选后按粘贴顺序加入 KET 闯关。已在词表里的词会跳过新增，但仍标进闯关顺序。
              </Text>
            </View>
            <Switch value={importKet} onValueChange={setImportKet} trackColor={{ true: Colors.success }} />
          </View>
          <TextInput
            multiline
            value={bulk}
            onChangeText={setBulk}
            placeholder={'apple,苹果,/ˈæpl/\nice cream,冰淇淋'}
            placeholderTextColor={Colors.muted}
            style={[styles.input, styles.bulk]}
          />
          <Text style={styles.meta}>
            预览 {preview.length} 个词 · 当前词表 {state.words.length} 个
          </Text>
          <KidButton
            label={preview.length ? `追加 ${preview.length} 个词` : '追加到词表'}
            disabled={preview.length === 0}
            onPress={() => {
              const result = importWordText(bulk, 'append', { ketPack: importKet });
              Alert.alert(
                '已追加',
                `新增 ${result.added} 个，跳过重复 ${result.skipped} 个${importKet ? `，闯关词库 +${result.packAdded}` : ''}。`,
              );
              setBulk('');
            }}
          />
          <KidButton
            label="清空后导入（替换）"
            variant="danger"
            style={{ marginTop: Space.sm }}
            disabled={preview.length === 0}
            onPress={() =>
              Alert.alert('替换全部词表？', '现有词和本机录音会清掉，换成这次粘贴的内容。', [
                { text: '取消', style: 'cancel' },
                {
                  text: '替换',
                  style: 'destructive',
                  onPress: () => {
                    const result = importWordText(bulk, 'replace', { ketPack: importKet });
                    Alert.alert(
                      '已替换',
                      `现在有 ${result.added} 个词${importKet ? `，并重排了闯关词库` : ''}。`,
                    );
                    setBulk('');
                  },
                },
              ])
            }
          />
        </Card>
      ) : null}
      <KidButton
        label="补回示例词包"
        variant="ghost"
        style={{ marginTop: Space.sm }}
        onPress={restoreSampleWords}
      />
      <Text style={styles.count}>
        {query.trim() ? `找到 ${rows.length} / ${state.words.length}` : `${state.words.length} 个词`}
      </Text>
          </View>
        }
        renderItem={({ item: word }) => {
          const recording =
            clip.target != null && clipKey(clip.target) === clipKey({ kind: 'word', id: word.id });
          return (
            <Card style={styles.row}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.en}>{word.en}</Text>
                  <IpaText ipa={word.ipa} show style={styles.ipaLine} />
                  <Text style={styles.meta}>
                    {word.zh} · {word.source === 'sample' ? '示例' : '家长'}
                    {word.ketPack ? ' · 闯关' : ''}
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
              <TextInput
                key={`${word.id}-${word.ipa ?? ''}`}
                defaultValue={word.ipa ?? ''}
                placeholder="英式音标，如 /ˈæpl/"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                style={styles.input}
                onEndEditing={(event) =>
                  upsertWord({ id: word.id, en: word.en, zh: word.zh, ipa: event.nativeEvent.text })
                }
              />
              <View style={styles.toggle}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>用于闯关词库</Text>
                </View>
                <Switch
                  value={Boolean(word.ketPack)}
                  onValueChange={(on) => setWordKetPack(word.id, on)}
                  trackColor={{ true: Colors.success }}
                />
              </View>
              <VoiceClipBar
                status={voiceClipStatus(word.recordingUri, recording, clip.isRecording)}
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
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.sm,
  },
  ipaLine: {
    fontSize: 16,
    marginBottom: 2,
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
  count: {
    color: Colors.muted,
    fontWeight: '700',
    marginVertical: Space.sm,
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Space.sm,
  },
  countBtn: {
    flex: 1,
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
