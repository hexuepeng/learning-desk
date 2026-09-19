import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { currentDictationType, DICTATION_TYPE_LABELS, emptyProgress } from '@/lib/dictation';
import { consecutiveThreeStarDays, starsLabel, todaysStars } from '@/lib/stars';
import { todayKey } from '@/lib/util';

export default function DadProgress() {
  const { state } = useDesk();
  return (
    <Screen title="进度" subtitle="背词次数、是否认识、默写台阶。全部本机。" back>
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
        <Text style={styles.line}>词表 {state.words.length}</Text>
      </Card>
      <View style={styles.col}>
        {state.words.map((word) => {
          const progress = state.progress[word.id] ?? emptyProgress(word.id);
          const type = currentDictationType(progress, state.dictationSettings);
          return (
            <Card key={word.id}>
              <Text style={styles.en}>
                {word.en} · {word.zh}
              </Text>
              <Text style={styles.meta}>
                背词 {progress.vocabSeen} 次 · {progress.vocabKnown ? '认识' : '还不熟'}
              </Text>
              <Text style={styles.meta}>默写台阶：{DICTATION_TYPE_LABELS[type].zh}</Text>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Space.md },
  line: { fontSize: 17, color: Colors.ink, marginBottom: 4 },
  col: { gap: 10 },
  en: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  meta: { color: Colors.muted, marginTop: 4 },
});
