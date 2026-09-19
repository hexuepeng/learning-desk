import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import { playCue } from '@/lib/playCue';
import { hasRecordingOverride } from '@/lib/speakSource';

export function SpeakButton({
  text,
  label,
  recordingUri,
  onPlayed,
}: {
  text: string;
  label?: string;
  recordingUri?: string | null;
  onPlayed?: () => void;
}) {
  const { tap, buttonLabelSize } = useLayout();
  const dadVoice = hasRecordingOverride(recordingUri);
  const caption = label ?? (dadVoice ? t('listenDad') : t('listen'));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption}
      onPress={() => {
        playCue(text, recordingUri);
        onPlayed?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        { minHeight: tap, minWidth: tap, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.icon}>🔊</Text>
      <Text style={[styles.label, { fontSize: buttonLabelSize }]}>{caption}</Text>
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
