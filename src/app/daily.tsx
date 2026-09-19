import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { DailyProgress } from '@/components/DailyProgress';
import { DictationPlay } from '@/components/DictationPlay';
import { StarsRow } from '@/components/StarsRow';
import { VocabCard } from '@/components/VocabCard';
import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { formatDailyProgress, isDailyComplete, nextDailyStep } from '@/lib/daily';
import { consecutiveThreeStarDays, shouldShowThreeStarCelebration, todaysStars } from '@/lib/stars';
import { todayKey } from '@/lib/util';

export default function DailyScreen() {
  const { ready, state, markVocab, markDictation, dictationTypeFor } = useDesk();
  if (!ready) return <LoadingScreen />;

  const daily = state.daily;
  if (!daily || (daily.vocabWordIds.length === 0 && daily.dictationWordIds.length === 0)) {
    return (
      <Screen title="今日英语" back>
        <Card>
          <Text style={styles.body}>词表还是空的。请爸爸先加一些单词。</Text>
          <KidButton label="去英语馆看看" onPress={() => router.replace('/english')} />
        </Card>
      </Screen>
    );
  }

  if (isDailyComplete(daily)) {
    const date = todayKey();
    const stars = todaysStars(state.stars, date);
    const celebrateStars = shouldShowThreeStarCelebration(state.stars, date);
    return (
      <Screen title="今日完成" back>
        <Card>
          <Celebration
            title="今日英语做完啦"
            subtitle={
              celebrateStars
                ? `连续 ${consecutiveThreeStarDays(state.stars.byDate, date)} 天默写满分！`
                : '默写按对错给星：全对三星，错一两个两星。'
            }
          />
          {stars ? <StarsRow stars={stars} /> : null}
          <KidButton label="回首页" onPress={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }

  const step = nextDailyStep(daily);
  if (step.kind === 'done') {
    return (
      <Screen title="今日英语" back>
        <KidButton label="回首页" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const word = state.words.find((item) => item.id === step.wordId);
  if (!word) {
    return (
      <Screen title="今日英语" back>
        <Text style={styles.body}>这张卡片的单词找不到了，请让爸爸检查词表。</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="今日英语"
      subtitle={`${step.kind === 'vocab' ? '先背词' : '再默写'} · ${formatDailyProgress(daily)}`}
      back
    >
      <Card style={styles.progressCard}>
        <DailyProgress daily={daily} />
      </Card>
      {step.kind === 'vocab' ? (
        <Card>
          <VocabCard
            word={word}
            onKnown={() => markVocab(word.id, true, true)}
            onNotYet={() => markVocab(word.id, false, true)}
          />
        </Card>
      ) : (
        <DictationPlay
          word={word}
          pool={state.words}
          type={dictationTypeFor(word.id)}
          onResolved={(correct) => markDictation(word.id, correct, true)}
        />
      )}
      <View style={styles.foot}>
        <Text style={styles.body}>绘本不在今日卡里，想看就去英语馆。</Text>
      </View>
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
  progressCard: {
    marginBottom: Space.md,
    paddingVertical: Space.md,
  },
  foot: {
    marginTop: Space.lg,
  },
});
