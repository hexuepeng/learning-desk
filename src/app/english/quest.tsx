import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import {
  QUEST_MODES,
  currentQuestMode,
  formatQuestStars,
  packWordsOf,
  questDayCounts,
  questModeCleared,
} from '@/lib/quest';

export default function QuestHome() {
  const { ready, quest, state, touchQuestDay, seedSampleKetPack } = useDesk();
  const { isTablet, bodySize } = useLayout();

  useEffect(() => {
    if (ready) touchQuestDay();
  }, [ready, touchQuestDay]);

  if (!ready) return <LoadingScreen />;

  const pack = packWordsOf(state.words, quest.packWordIds);
  const counts = questDayCounts(quest.day);
  const mode = currentQuestMode(quest.day);
  const complete = quest.day?.complete === true;

  return (
    <Screen
      title={t('ketQuest')}
      subtitle="和今日英语卡分开，默认不计入今日进度。间隔复习：学会后第 1、2、4、7 天。"
      back
    >
      {pack.length === 0 ? (
        <Card>
          <Text style={[styles.body, { fontSize: bodySize }]}>
            还没有闯关词库。一般新装会自动种入内置默认包。也可请爸爸在书桌词表点「导入 KET 包」，或粘贴
            `english,chinese`（可加英式 IPA）并勾选「用于闯关词库」。也可以先用 6 个家庭示例词试试。
          </Text>
          <KidButton
            label="先用示例词试试"
            onPress={() => {
              seedSampleKetPack();
              touchQuestDay();
            }}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.hero}>
            <Text style={styles.kicker}>今日闯关</Text>
            <Text style={[styles.title, { fontSize: isTablet ? 30 : 26 }]}>
              {complete
                ? '今天的三关都过啦'
                : `今天 ${counts.newCount} 个新词，${counts.reviewCount} 个复习词`}
            </Text>
            <Text style={[styles.meta, { fontSize: bodySize }]}>
              词库 {pack.length} · 每天新词 {quest.dailyNewCount} · 已安排 {quest.cursor}
            </Text>
            <KidButton
              label={complete ? '明天再来复习' : counts.total === 0 ? '词库先学完啦' : t('startQuest')}
              disabled={complete || counts.total === 0}
              onPress={() => router.push('/english/quest-play')}
            />
          </Card>
          <View style={isTablet ? styles.modeRow : styles.modeCol}>
            {QUEST_MODES.map((item) => {
              const stars = quest.day?.stars[item.index] ?? 0;
              const unlocked = item.index === 0 || questModeCleared(quest.day?.stars[item.index - 1] ?? 0);
              const active = mode === item.index;
              const done = questModeCleared(stars);
              return (
                <Card key={item.index} style={isTablet ? styles.modeCard : undefined}>
                  <Text style={styles.modeNum}>第 {item.index + 1} 关</Text>
                  <Text style={styles.modeTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{item.hint}</Text>
                  <Text style={styles.stars}>{formatQuestStars(stars)}</Text>
                  <Text style={styles.pill}>
                    {done ? '已通关' : !unlocked ? '先过上一关' : active ? '进行中' : '待挑战'}
                  </Text>
                </Card>
              );
            })}
          </View>
          <Text style={[styles.foot, { fontSize: bodySize }]}>
            拼写请用英语馆里现成的默写台阶，闯关不另做第 7 天解锁拼写。
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: Colors.muted,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: Space.md,
  },
  hero: {
    gap: Space.sm,
    marginBottom: Space.md,
  },
  kicker: {
    color: Colors.primary,
    fontWeight: '800',
  },
  title: {
    fontWeight: '800',
    color: Colors.ink,
  },
  meta: {
    color: Colors.muted,
    fontSize: 15,
  },
  modeCol: {
    gap: Space.sm,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  modeCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 180,
  },
  modeNum: {
    color: Colors.primary,
    fontWeight: '800',
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 4,
  },
  stars: {
    color: Colors.gold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 6,
  },
  pill: {
    marginTop: 6,
    color: Colors.accent,
    fontWeight: '800',
  },
  foot: {
    marginTop: Space.lg,
    color: Colors.muted,
    lineHeight: 24,
  },
});
