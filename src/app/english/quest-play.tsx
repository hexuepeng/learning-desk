import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { QuestPlay } from '@/components/QuestPlay';
import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  QUEST_MODES,
  currentQuestMode,
  formatQuestStars,
  packWordsOf,
} from '@/lib/quest';
import type { QuestModeIndex, Word } from '@/types/models';

export default function QuestPlayScreen() {
  const { ready, quest, state, touchQuestDay, applyQuestRound } = useDesk();
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (ready) touchQuestDay();
  }, [ready, touchQuestDay]);

  const pack = useMemo(
    () => packWordsOf(state.words, quest.packWordIds),
    [state.words, quest.packWordIds],
  );
  const queue = useMemo(() => {
    const map = new Map(state.words.map((word) => [word.id, word]));
    return (quest.day?.ids ?? [])
      .map((id) => map.get(id))
      .filter((word): word is Word => Boolean(word));
  }, [quest.day?.ids, state.words]);

  const mode = currentQuestMode(quest.day);
  const word = queue[index];

  if (!ready) return <LoadingScreen />;

  if (!quest.day || mode === 'done' || queue.length === 0) {
    return (
      <Screen title="KET 闯关" back>
        <Card>
          <Text style={styles.body}>
            {quest.day?.complete ? '今天已经过完三关了。' : '今天没有待学的闯关词。'}
          </Text>
          <KidButton label="回闯关首页" onPress={() => router.replace('/english/quest')} />
        </Card>
      </Screen>
    );
  }

  if (summary) {
    return (
      <Screen title="KET 闯关" back>
        <Card>
          <Celebration title="今日三关完成" subtitle={summary} />
          <KidButton label="回闯关首页" onPress={() => router.replace('/english/quest')} />
        </Card>
      </Screen>
    );
  }

  const playMode = mode as QuestModeIndex;
  const stars = quest.day.stars[playMode];
  const pool = pack.length >= 2 ? pack : state.words;

  return (
    <Screen
      title={`第 ${playMode + 1} 关 · ${QUEST_MODES[playMode].title}`}
      subtitle={`${formatQuestStars(stars)} · ${index + 1}/${queue.length}${note ? ` · ${note}` : ''}`}
      back
    >
      {word ? (
        <QuestPlay
          word={word}
          pool={pool}
          mode={playMode}
          onResolved={(correct) => {
            const nextWrong = wrong || !correct;
            const last = index + 1 >= queue.length;
            if (!last) {
              setWrong(nextWrong);
              setIndex(index + 1);
              return;
            }
            const result = applyQuestRound(playMode, !nextWrong);
            setWrong(false);
            setIndex(0);
            if (result.dayComplete) {
              setSummary('复习会排在学会后的第 1、2、4、7 天。不计入今日英语卡。');
              return;
            }
            if (!result.starGained) {
              setNote('本轮有错题，再挑战一轮。');
              return;
            }
            setNote(result.modeCleared ? '集齐三颗星，下一关！' : '全部答对，得了一颗星。');
          }}
        />
      ) : (
        <Card>
          <Text style={styles.body}>这张卡片的单词找不到了，请让爸爸检查闯关词库。</Text>
        </Card>
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
});
