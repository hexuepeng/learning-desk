import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { KidButton } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { t } from '@/i18n';
import type { Word } from '@/types/models';

export function VocabCard({
  word,
  onKnown,
  onNotYet,
}: {
  word: Word;
  onKnown: () => void;
  onNotYet: () => void;
}) {
  const [showZh, setShowZh] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.en}>{word.en}</Text>
      <SpeakButton text={word.en} recordingUri={word.recordingUri} />
      <Text style={styles.zh}>{showZh ? word.zh : ' '}</Text>
      <KidButton
        label={showZh ? '盖上中文' : '看中文'}
        variant="secondary"
        onPress={() => setShowZh((value) => !value)}
      />
      <View style={styles.row}>
        <KidButton label={t('notYet')} variant="secondary" onPress={onNotYet} style={styles.flex} />
        <KidButton label={t('knowIt')} variant="success" onPress={onKnown} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.md,
    alignItems: 'center',
  },
  en: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
  },
  zh: {
    fontSize: 28,
    color: Colors.muted,
    minHeight: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  flex: {
    flex: 1,
  },
});
