import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { displayIpa } from '@/lib/ipa';

export function IpaText({
  ipa,
  show = true,
  style,
}: {
  ipa?: string | null;
  show?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const text = displayIpa(ipa, show);
  if (!text) return null;
  return <Text style={[styles.ipa, style]}>{text}</Text>;
}

const styles = StyleSheet.create({
  ipa: {
    color: Colors.muted,
    fontWeight: '700',
  },
});
