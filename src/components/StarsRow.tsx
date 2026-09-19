import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { starsLabel } from '@/lib/stars';
import type { StarRating } from '@/types/models';

export function StarsRow({
  stars,
  size = 36,
}: {
  stars: StarRating;
  size?: number;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.stars, { fontSize: size }]} accessibilityLabel={`${stars} 颗星`}>
        {starsLabel(stars)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  stars: {
    color: Colors.gold,
    letterSpacing: 6,
    fontWeight: '800',
  },
});
