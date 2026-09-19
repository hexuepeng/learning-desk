import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DailyProgress } from '@/components/DailyProgress';
import { StarsRow } from '@/components/StarsRow';
import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { formatDailyProgress, isDailyComplete } from '@/lib/daily';
import { consecutiveThreeStarDays, todaysStars } from '@/lib/stars';
import { todayKey } from '@/lib/util';
import { APP_VERSION } from '@/constants/version';
import { t } from '@/i18n';

export default function HomeScreen() {
  const { ready, state } = useDesk();
  const { isTablet, isLandscape, titleSize, bodySize, tap } = useLayout();
  const taps = useRef(0);
  const [hint, setHint] = useState(false);
  if (!ready) return <LoadingScreen />;

  const daily = state.daily;
  const complete = isDailyComplete(daily);
  const hasWords = (daily?.vocabWordIds.length ?? 0) + (daily?.dictationWordIds.length ?? 0) > 0;
  const todayStars = todaysStars(state.stars, todayKey());
  const threeStarRun = consecutiveThreeStarDays(state.stars.byDate, todayKey());
  const hasStickers = state.streak.stickers.length > 0;

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
        <View style={[styles.streak, { minWidth: tap + 8, minHeight: tap + 8 }]}>
          <Text style={[styles.streakNum, { fontSize: isTablet ? 32 : 28 }]}>{state.streak.current}</Text>
          <Text style={styles.streakLabel}>{t('streak')}</Text>
        </View>
        <Text
          style={[
            hasStickers ? styles.stickers : styles.stickerHint,
            { fontSize: hasStickers ? (isTablet ? 26 : 22) : bodySize },
          ]}
        >
          {hasStickers ? state.streak.stickers.join(' ') : '完成今日卡可集贴纸'}
        </Text>
      </View>

      <View style={isTablet && isLandscape ? styles.landRow : undefined}>
        <Card style={[styles.daily, isTablet && isLandscape && styles.landCol]} onPress={() => router.push('/daily')}>
          <Text style={[styles.kicker, { fontSize: bodySize }]}>{t('todayEnglish')}</Text>
          <Text style={[styles.dailyTitle, { fontSize: Math.min(titleSize, 32) }]}>
            {complete ? t('todayDone') : formatDailyProgress(daily)}
          </Text>
          {hasWords ? (
            <DailyProgress daily={daily} />
          ) : (
            <Text style={[styles.muted, { fontSize: bodySize }]}>请爸爸先加词表</Text>
          )}
          {todayStars ? (
            <>
              <StarsRow stars={todayStars} size={isTablet ? 32 : 26} />
              <Text style={[styles.muted, { fontSize: bodySize }]}>
                {threeStarRun >= 2 ? `连续 ${threeStarRun} 天默写满分` : '今天默写的星'}
              </Text>
            </>
          ) : (
            <Text style={[styles.muted, { fontSize: bodySize }]}>绘本可另外看，不计入今日进度</Text>
          )}
          <KidButton label={complete ? '再练一会儿' : t('startToday')} onPress={() => router.push('/daily')} />
        </Card>

        <View style={isTablet && isLandscape ? styles.landCol : undefined}>
          <Text style={[styles.section, { fontSize: isTablet ? 22 : 20 }]}>{t('subjects')}</Text>
          <SubjectTile
            title={t('english')}
            live
            color={Colors.english}
            onPress={() => router.push('/english')}
          />
          <Text style={[styles.soonLabel, { fontSize: bodySize }]}>还在搭建</Text>
          <View style={styles.soonRow}>
            <SubjectTile title={t('math')} color={Colors.math} onPress={() => router.push('/math')} compact />
            <SubjectTile title={t('chinese')} color={Colors.chinese} onPress={() => router.push('/chinese')} compact />
          </View>
        </View>
      </View>

      <View style={styles.extra}>
        <KidButton
          label={t('todaySentences')}
          variant="secondary"
          onPress={() => router.push('/english/sentences')}
        />
        <KidButton
          label="错词复习（5 分钟）"
          variant="secondary"
          onPress={() => router.push('/english/review')}
        />
        <KidButton label={`💬 ${t('tellDad')}`} variant="secondary" onPress={() => router.push('/tell-dad')} />
      </View>

      <Pressable onPress={openDad} style={styles.version}>
        <Text style={styles.versionText}>v{APP_VERSION}{hint ? ' · 再点几次打开爸爸书桌' : ''}</Text>
      </Pressable>
    </Screen>
  );
}

function SubjectTile({
  title,
  live = false,
  color,
  compact = false,
  onPress,
}: {
  title: string;
  live?: boolean;
  color: string;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      style={[
        styles.subject,
        { borderLeftColor: color },
        compact && styles.subjectCompact,
        !live && styles.subjectSoon,
      ]}
    >
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
  stickerHint: {
    flex: 1,
    color: Colors.muted,
    fontWeight: '600',
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
  section: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  landRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Space.lg,
    marginBottom: Space.md,
  },
  landCol: {
    flex: 1,
    marginBottom: 0,
  },
  soonLabel: {
    color: Colors.muted,
    fontWeight: '700',
    marginTop: Space.sm,
    marginBottom: 8,
  },
  soonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Space.lg,
  },
  subject: {
    minHeight: 112,
    marginBottom: Space.sm,
    borderLeftWidth: 6,
  },
  subjectCompact: {
    flex: 1,
    minHeight: 84,
    marginBottom: 0,
  },
  subjectSoon: {
    opacity: 0.72,
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
  extra: {
    gap: 12,
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
