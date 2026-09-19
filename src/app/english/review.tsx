import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { DictationPlay } from '@/components/DictationPlay';
import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { formatCountdown, pickReviewWords, REVIEW_MINUTES } from '@/lib/review';

export default function ReviewScreen() {
  const { state, markDictation, dictationTypeFor } = useDesk();
  const pool = useMemo(
    () => pickReviewWords(state.words, state.progress, state.practiceLog),
    [state.words, state.progress, state.practiceLog],
  );
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(REVIEW_MINUTES * 60);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || left <= 0) return;
    const timer = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setDone(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [done, left]);

  if (pool.length === 0) {
    return (
      <Screen title="错词复习" subtitle="今日卡以外的 5 分钟复习" back>
        <Card>
          <Text style={styles.body}>现在没有需要复习的错词。先去做今日卡或默写吧。</Text>
          <KidButton label="回英语馆" onPress={() => router.replace('/english')} />
        </Card>
      </Screen>
    );
  }

  if (done || left <= 0) {
    return (
      <Screen title="复习结束" back>
        <Card>
          <Text style={styles.big}>5 分钟到了</Text>
          <Text style={styles.body}>错词可以改天再练。今日卡进度不受影响。</Text>
          <KidButton label="回首页" onPress={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }

  const word = pool[index % pool.length];
  return (
    <Screen title="错词复习" subtitle={`还剩 ${formatCountdown(left)} · 不计入今日卡`} back>
      <DictationPlay
        word={word}
        pool={state.words}
        type={dictationTypeFor(word.id)}
        onResolved={(correct) => {
          markDictation(word.id, correct, false, 'review');
          setIndex((value) => value + 1);
        }}
      />
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
  big: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: Space.sm,
  },
});
