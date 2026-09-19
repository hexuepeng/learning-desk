import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { DictationPlay } from '@/components/DictationPlay';
import { StarsRow } from '@/components/StarsRow';
import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { DICTATION_TYPE_LABELS } from '@/lib/dictation';
import { consecutiveThreeStarDays } from '@/lib/stars';
import { todayKey } from '@/lib/util';
import type { StarRating } from '@/types/models';

const ROUND_SIZE = 6;

export default function DictationScreen() {
  const { state, markDictation, dictationTypeFor, awardDictationStars } = useDesk();
  const words = state.words;
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState({ correct: 0, wrong: 0 });
  const [summary, setSummary] = useState<{ stars: StarRating; celebrate: boolean } | null>(null);
  const word = words[index];

  if (!word) {
    return (
      <Screen title="默写" back>
        <Card>
          <Text style={styles.body}>词表是空的。请爸爸加词。</Text>
        </Card>
      </Screen>
    );
  }

  if (summary) {
    return (
      <Screen title="本轮默写" back>
        <Card>
          <Celebration
            title={summary.celebrate ? '连续满分默写！' : '本轮结束'}
            subtitle={
              summary.celebrate
                ? `已经连续 ${consecutiveThreeStarDays(state.stars.byDate, todayKey())} 天三星。`
                : `对 ${round.correct} · 错 ${round.wrong}`
            }
          />
          <StarsRow stars={summary.stars} />
          <KidButton
            label="再来一轮"
            onPress={() => {
              setSummary(null);
              setRound({ correct: 0, wrong: 0 });
              setIndex((value) => (value + 1) % words.length);
            }}
          />
        </Card>
      </Screen>
    );
  }

  const type = dictationTypeFor(word.id);
  const target = Math.min(ROUND_SIZE, words.length);
  const answered = round.correct + round.wrong;

  return (
    <Screen
      title="默写"
      subtitle={`当前台阶：${DICTATION_TYPE_LABELS[type].zh}${state.dictationSettings.autoAdjust ? ' · 会自动升降' : ''} · 本轮 ${answered}/${target}`}
      back
    >
      <DictationPlay
        word={word}
        pool={words}
        type={type}
        onResolved={(correct) => {
          markDictation(word.id, correct, false);
          const nextRound = {
            correct: round.correct + (correct ? 1 : 0),
            wrong: round.wrong + (correct ? 0 : 1),
          };
          if (nextRound.correct + nextRound.wrong >= target) {
            const awarded = awardDictationStars(nextRound.correct, nextRound.wrong);
            setRound(nextRound);
            setSummary(awarded);
            return;
          }
          setRound(nextRound);
          setIndex((value) => (value + 1) % words.length);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: Colors.muted,
    fontSize: 17,
    marginBottom: Space.md,
  },
});
