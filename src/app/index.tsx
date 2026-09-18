import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { dailyProgress, isDailyComplete } from '@/lib/daily';
import { APP_VERSION } from '@/constants/version';
import { t } from '@/i18n';

export default function HomeScreen() {
  const { ready, state } = useDesk();
  const taps = useRef(0);
  const [hint, setHint] = useState(false);
  if (!ready) return <LoadingScreen />;

  const daily = state.daily;
  const { done, total } = dailyProgress(daily);
  const complete = isDailyComplete(daily);

  const openDad = () => {
    taps.current += 1;
    if (taps.current >= 5) {
      taps.current = 0;
      router.push('/dad');
    } else {
      setHint(true);
    }
  };

  return (
    <Screen title={t('appName')} subtitle="给孩子的家庭学习台 · 英语先行">
      <View style={styles.topRow}>
        <View style={styles.streak}>
          <Text style={styles.streakNum}>{state.streak.current}</Text>
          <Text style={styles.streakLabel}>{t('streak')}</Text>
        </View>
        <Text style={styles.stickers}>{state.streak.stickers.join(' ') || '完成今日卡可集贴纸'}</Text>
      </View>

      <Card style={styles.daily} onPress={() => router.push('/daily')}>
        <Text style={styles.kicker}>{t('todayEnglish')}</Text>
        <Text style={styles.dailyTitle}>
          {complete ? t('todayDone') : `背词 ${daily?.vocabWordIds.length ?? 0} · 默写 ${daily?.dictationWordIds.length ?? 0}`}
        </Text>
        <Text style={styles.muted}>
          {total === 0 ? '请爸爸先加词表' : `进度 ${done}/${total}（绘本可另外看）`}
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: Math.max(total, 1) }).map((_, index) => (
            <View key={index} style={[styles.dot, index < done && styles.dotOn]} />
          ))}
        </View>
        <KidButton label={complete ? '再练一会儿' : t('startToday')} onPress={() => router.push('/daily')} />
      </Card>

      <Text style={styles.section}>{t('subjects')}</Text>
      <View style={styles.subjects}>
        <SubjectTile title={t('english')} live onPress={() => router.push('/english')} />
        <SubjectTile title={t('math')} onPress={() => router.push('/math')} />
        <SubjectTile title={t('chinese')} onPress={() => router.push('/chinese')} />
      </View>

      <KidButton label={`💬 ${t('tellDad')}`} variant="secondary" onPress={() => router.push('/tell-dad')} />

      <Pressable onPress={openDad} style={styles.version}>
        <Text style={styles.versionText}>v{APP_VERSION}{hint ? ' · 再点几次打开爸爸书桌' : ''}</Text>
      </Pressable>
    </Screen>
  );
}

function SubjectTile({
  title,
  live = false,
  onPress,
}: {
  title: string;
  live?: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.subject}>
      <Text style={styles.subjectTitle}>{title}</Text>
      <Text style={styles.subjectMeta}>{live ? '可以学' : t('comingSoon')}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.md,
  },
  streak: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    minWidth: 72,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  streakNum: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  streakLabel: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  stickers: {
    flex: 1,
    fontSize: 22,
    color: Colors.ink,
  },
  daily: {
    gap: Space.sm,
    marginBottom: Space.lg,
  },
  kicker: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dailyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
  },
  muted: {
    color: Colors.muted,
    fontSize: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.paperSoft,
  },
  dotOn: {
    backgroundColor: Colors.success,
  },
  section: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  subjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Space.lg,
  },
  subject: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: 96,
  },
  subjectTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
  },
  subjectMeta: {
    color: Colors.muted,
    marginTop: 6,
    fontSize: 15,
  },
  version: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space.md,
  },
  versionText: {
    color: Colors.muted,
    fontSize: 13,
  },
});
