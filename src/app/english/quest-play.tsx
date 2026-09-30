import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { QuestPlay } from '@/components/QuestPlay';
import { Card, KidButton, LoadingScreen, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  QUEST_MODES,
  currentQuestMode,
  packWordsOf,
  pendingQuestWordIds,
} from '@/lib/quest';
import { todayKey } from '@/lib/util';

export default function QuestPlayScreen() {
  const { ready, quest, state, touchQuestDay, submitQuestAnswer } = useDesk();

  useEffect(() => {
    if (ready) touchQuestDay();
  }, [ready, touchQuestDay]);

  const pack = useMemo(
    () => packWordsOf(state.words, quest.packWordIds),
    [state.words, quest.packWordIds],
  );
  const mode = currentQuestMode(quest.day);
  const pendingIds = mode === 'done' ? [] : pendingQuestWordIds(quest.day, mode);
  const word = state.words.find((item) => item.id === pendingIds[0]);

  if (!ready) return <LoadingScreen />;

  if (!quest.day || quest.day.ids.length === 0) {
    return (
      <Screen title="KET 闯关" back>
        <Card>
          <Text style={styles.body}>今天没有待复习的词，也没有待学的新词。</Text>
          <KidButton label="回英语馆" onPress={() => router.replace('/english')} />
        </Card>
      </Screen>
    );
  }

  if (quest.day.complete || mode === 'done') {
    return (
      <Screen title="KET 闯关" back>
        <Card>
          <Celebration
            title="今天的闯关完成啦"
            subtitle={`今天练习了 ${quest.day.ids.length} 个词，三关都完成了。明天再来！`}
          />
          <KidButton label="回首页" onPress={() => router.replace('/')} />
        </Card>
      </Screen>
    );
  }

  const date = quest.day.date;
  const profileId = state.activeProfileId;
  const pool = pack.length >= 2 ? pack : state.words;
  const completedCount = quest.day.ids.length - pendingIds.length;

  return (
    <Screen
      title={`第 ${mode + 1} 关 · ${QUEST_MODES[mode].title}`}
      subtitle={`第 ${mode + 1} 关 · 已完成 ${completedCount}/${quest.day.ids.length}`}
      back
    >
      {word ? (
        <QuestPlay
          key={`${profileId}:${date}:${mode}:${word.id}`}
          word={word}
          pool={pool}
          mode={mode}
          onResolved={async (outcome) => {
            if (date !== todayKey()) {
              touchQuestDay();
              return;
            }
            await submitQuestAnswer({ profileId, date, mode, wordId: word.id, outcome });
          }}
        />
      ) : (
        <Card>
          <Text style={styles.body}>词表已更新，请返回闯关首页继续。</Text>
          <KidButton label="回闯关首页" onPress={() => router.replace('/english/quest')} />
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
