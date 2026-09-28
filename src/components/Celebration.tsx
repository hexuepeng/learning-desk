import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { hapticSuccess } from '@/lib/haptics';

const BURSTS = [
  { color: Colors.gold, x: -52, y: -18, delay: 0 },
  { color: Colors.primary, x: 0, y: -36, delay: 40 },
  { color: Colors.success, x: 52, y: -18, delay: 80 },
  { color: Colors.dad, x: -28, y: 22, delay: 120 },
  { color: Colors.math, x: 28, y: 22, delay: 160 },
];

export function Celebration({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { titleSize, bodySize } = useLayout();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bits = useRef(BURSTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduceMotion(value);
      })
      .catch(() => {
        if (alive) setReduceMotion(false);
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion == null) return;
    hapticSuccess();
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ...bits.map((bit, index) =>
        Animated.timing(bit, {
          toValue: 1,
          duration: 420,
          delay: BURSTS[index].delay,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, [bits, opacity, reduceMotion, scale]);

  const copy = (
    <>
      <Text style={styles.burst}>完成</Text>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { fontSize: bodySize }]}>{subtitle}</Text> : null}
    </>
  );

  if (reduceMotion) {
    return <View style={styles.wrap}>{copy}</View>;
  }

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ scale }] }]}>
      <View style={styles.burstStage}>
        {BURSTS.map((burst, index) => (
          <Animated.View
            key={`${burst.color}-${index}`}
            style={[
              styles.dot,
              {
                backgroundColor: burst.color,
                opacity: bits[index],
                transform: [
                  {
                    translateX: bits[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, burst.x],
                    }),
                  },
                  {
                    translateY: bits[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, burst.y],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      {copy}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Space.sm,
    marginBottom: Space.md,
  },
  burstStage: {
    height: 56,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
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
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
