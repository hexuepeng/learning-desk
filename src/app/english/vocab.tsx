import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { VocabCard } from '@/components/VocabCard';
import { Card, KidButton, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';

export default function VocabScreen() {
  const { state, markVocab } = useDesk();
  const words = state.words;
  const [index, setIndex] = useState(0);
  const word = words[index];
  const knownCount = useMemo(
    () => words.filter((item) => state.progress[item.id]?.vocabKnown).length,
    [words, state.progress],
  );

  if (!word) {
    return (
      <Screen title="背单词" back>
        <Card>
          <Text style={styles.body}>词表是空的。请爸爸加词。</Text>
        </Card>
      </Screen>
    );
  }

  const advance = (known: boolean) => {
    markVocab(word.id, known, false);
    setIndex((value) => (value + 1) % words.length);
  };

  return (
    <Screen title="背单词" subtitle={`认识 ${knownCount}/${words.length}`} back>
      <Card>
        <VocabCard word={word} onKnown={() => advance(true)} onNotYet={() => advance(false)} />
      </Card>
      <KidButton
        label="换一个"
        variant="ghost"
        onPress={() => setIndex((value) => (value + 1) % words.length)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: Colors.muted,
    fontSize: 17,
  },
});
