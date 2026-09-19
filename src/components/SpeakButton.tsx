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
  const { isTablet } = useLayout();
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
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.icon, { fontSize: isTablet ? 16 : 15 }]}>🔊</Text>
      <Text style={[styles.label, { fontSize: isTablet ? 15 : 14 }]}>{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: Colors.paperSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
});
