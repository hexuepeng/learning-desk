import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { DictationPlay } from '@/components/DictationPlay';
import { Card, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { DICTATION_TYPE_LABELS } from '@/lib/dictation';

export default function DictationScreen() {
  const { state, markDictation, dictationTypeFor } = useDesk();
  const words = state.words;
  const [index, setIndex] = useState(0);
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

  const type = dictationTypeFor(word.id);

  return (
    <Screen
      title="默写"
      subtitle={`当前台阶：${DICTATION_TYPE_LABELS[type].zh}${state.dictationSettings.autoAdjust ? ' · 会自动升降' : ''}`}
      back
    >
      <DictationPlay
        word={word}
        pool={words}
        type={type}
        onResolved={(correct) => {
          markDictation(word.id, correct, false);
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
  },
});
