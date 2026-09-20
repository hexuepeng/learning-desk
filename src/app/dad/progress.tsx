import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SearchField } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { currentDictationType, DICTATION_TYPE_LABELS, emptyProgress } from '@/lib/dictation';
import { summarizeProgress } from '@/lib/progressView';
import { consecutiveThreeStarDays, starsLabel, todaysStars } from '@/lib/stars';
import { todayKey } from '@/lib/util';
import { filterWords } from '@/lib/wordsView';

export default function DadProgress() {
  const { state, quest } = useDesk();
  const [query, setQuery] = useState('');
  const summary = useMemo(
    () => summarizeProgress(state.words, state.progress, state.dictationSettings),
    [state.words, state.progress, state.dictationSettings],
  );
  const rows = useMemo(() => filterWords(state.words, query), [state.words, query]);

  return (
    <Screen title="进度" subtitle="背词次数、是否认识、默写台阶。全部本机。" back scroll={false}>
      <Card style={styles.block}>
        <Text style={styles.line}>连胜 {state.streak.current} 天</Text>
        <Text style={styles.line}>贴纸 {state.streak.stickers.join(' ') || '还没有'}</Text>
        <Text style={styles.line}>
          今日默写星{' '}
          {todaysStars(state.stars, todayKey())
            ? starsLabel(todaysStars(state.stars, todayKey())!)
            : '还没有'}
          {' · '}
          连续满分 {consecutiveThreeStarDays(state.stars.byDate, todayKey())} 天
        </Text>
        <Text style={styles.line}>
          词表 {summary.total} · 认识 {summary.known} · 还不熟 {summary.unfamiliar}
        </Text>
        <Text style={styles.line}>
          闯关词库 {quest.packWordIds.length} · 每天新词 {quest.dailyNewCount} · 已安排 {quest.cursor}
        </Text>
        <Text style={styles.meta}>
          台阶分布{' '}
          {summary.byType
            .filter((item) => item.count > 0)
            .map((item) => `${DICTATION_TYPE_LABELS[item.type].zh} ${item.count}`)
            .join(' · ') || '还没有'}
        </Text>
      </Card>
      <SearchField value={query} onChangeText={setQuery} placeholder="搜英文、中文或音标" />
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(word) => word.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item: word }) => {
          const progress = state.progress[word.id] ?? emptyProgress(word.id);
          const type = currentDictationType(progress, state.dictationSettings);
          return (
            <View style={styles.row}>
              <Text style={styles.en}>
                {word.en}
                {word.ipa ? `  ${word.ipa}` : ''} · {word.zh}
              </Text>
              <Text style={styles.meta}>
                背词 {progress.vocabSeen} 次 · {progress.vocabKnown ? '认识' : '还不熟'} ·{' '}
                {DICTATION_TYPE_LABELS[type].zh}
              </Text>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Space.md },
  line: { fontSize: 17, color: Colors.ink, marginBottom: 4 },
  list: { flex: 1 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  en: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  meta: { color: Colors.muted, marginTop: 4 },
});
