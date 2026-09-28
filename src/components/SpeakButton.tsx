import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import { speakTapHeight } from '@/lib/layout';
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
  const { isTablet, tap } = useLayout();
  const dadVoice = hasRecordingOverride(recordingUri);
  const caption = label ?? (dadVoice ? t('listenDad') : t('listen'));
  const minHeight = speakTapHeight(tap);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption}
      onPress={() => {
        playCue(text, recordingUri);
        onPlayed?.();
      }}
      style={({ pressed }) => [styles.btn, { minHeight, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name="volume-high" size={isTablet ? 18 : 16} color={Colors.ink} />
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
    minHeight: 44,
  },
  label: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
});
