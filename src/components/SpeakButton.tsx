import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import { speakEnglish } from '@/lib/tts';

export function SpeakButton({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const { tap } = useLayout();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? t('listen')}
      onPress={() => speakEnglish(text)}
      style={({ pressed }) => [
        styles.btn,
        { minHeight: tap, minWidth: tap, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.icon}>🔊</Text>
      <Text style={styles.label}>{label ?? t('listen')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.paperSoft,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
});
