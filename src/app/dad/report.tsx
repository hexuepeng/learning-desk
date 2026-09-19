import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { buildWeekReport, formatAccuracy } from '@/lib/report';
import { todayKey } from '@/lib/util';

export default function DadReport() {
  const { state } = useDesk();
  const report = buildWeekReport(state.practiceLog, state.words, todayKey());

  return (
    <Screen title="本周小结" subtitle={`${report.start} 至 ${report.end} · 只存在这台设备`} back>
      <Card style={styles.block}>
        <Text style={styles.line}>练了 {report.daysPracticed} 天</Text>
        <Text style={styles.line}>
          默写正确率 {report.dictationTotal ? formatAccuracy(report.accuracy) : '还没有默写'}
        </Text>
        <Text style={styles.meta}>
          对 {report.dictationCorrect} · 共 {report.dictationTotal} 题
        </Text>
      </Card>
      <Text style={styles.section}>最常错的词</Text>
      {report.topWrong.length === 0 ? (
        <Card>
          <Text style={styles.meta}>这周还没有记到错词。</Text>
        </Card>
      ) : (
        <View style={styles.col}>
          {report.topWrong.map((item) => (
            <Card key={item.wordId}>
              <Text style={styles.en}>
                {item.en} · {item.zh}
              </Text>
              <Text style={styles.meta}>错了 {item.wrong} 次</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Space.md },
  section: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  col: { gap: 10 },
  line: { fontSize: 20, fontWeight: '800', color: Colors.ink, marginBottom: 6 },
  en: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  meta: { color: Colors.muted, marginTop: 4 },
});
