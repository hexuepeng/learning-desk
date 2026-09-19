import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';

export function Celebration({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { titleSize, bodySize } = useLayout();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.burst}>完成</Text>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { fontSize: bodySize }]}>{subtitle}</Text> : null}
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: Colors.gold }]} />
        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: Colors.success }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Space.sm,
    marginBottom: Space.md,
  },
  burst: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 4,
  },
  title: {
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
  },
  sub: {
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Space.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
