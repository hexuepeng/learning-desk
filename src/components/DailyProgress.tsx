import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { dailyProgressDetail, formatDailyProgress } from '@/lib/daily';
import type { DailyLesson } from '@/types/models';

export function DailyProgress({ daily }: { daily: DailyLesson | null }) {
  const { bodySize } = useLayout();
  const detail = dailyProgressDetail(daily);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { fontSize: bodySize }]}>{formatDailyProgress(daily)}</Text>
      <View style={styles.bars}>
        <ProgressLane label="背词" done={detail.vocabDone} total={detail.vocabTotal} color={Colors.english} />
        <ProgressLane
          label="默写"
          done={detail.dictationDone}
          total={detail.dictationTotal}
          color={Colors.accent}
        />
      </View>
    </View>
  );
}

function ProgressLane({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color: string;
}) {
  const ratio = total === 0 ? 0 : Math.min(1, done / total);
  return (
    <View style={styles.lane}>
      <Text style={styles.laneLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.count}>
        {done}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.sm,
  },
  label: {
    color: Colors.ink,
    fontWeight: '800',
  },
  bars: {
    gap: 8,
  },
  lane: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laneLabel: {
    width: 40,
    color: Colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.paperSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  count: {
    width: 40,
    textAlign: 'right',
    color: Colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
});
