import { StyleSheet, Text, View } from 'react-native';

import { IpaText } from '@/components/IpaText';
import { SpeakButton } from '@/components/SpeakButton';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { playAnswerTypeSizes } from '@/lib/layout';
import type { Word } from '@/types/models';

/** 闯关 / 选词揭晓：英文词和 IPA 最大，中文释义次要，「对啦」只做状态。 */
export function PlayAnswerReveal({ title, word }: { title: string; word: Word }) {
  const { titleSize, bodySize, isTablet } = useLayout();
  const { state } = useDesk();
  const zh = word.zh.trim();
  const type = playAnswerTypeSizes(titleSize, bodySize);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.status, { fontSize: isTablet ? 18 : 16 }]}>{title}</Text>
      <Text style={[styles.en, { fontSize: type.en }]}>{word.en}</Text>
      <IpaText
        ipa={word.ipa}
        show={state.showIpa}
        style={[styles.ipa, { fontSize: type.ipa }]}
      />
      {zh ? <Text style={[styles.zh, { fontSize: type.zh }]}>{zh}</Text> : null}
      <SpeakButton text={word.en} recordingUri={word.recordingUri} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.sm,
  },
  status: {
    color: Colors.primary,
    fontWeight: '800',
  },
  en: {
    fontWeight: '800',
    color: Colors.ink,
  },
  ipa: {
    color: Colors.ink,
    textAlign: 'left',
  },
  zh: {
    color: Colors.muted,
    fontWeight: '600',
  },
});
