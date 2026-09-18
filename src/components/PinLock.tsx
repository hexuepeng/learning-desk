import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import { hapticError, hapticLight } from '@/lib/haptics';

import { KidButton } from './ui';

export function PinLock({
  onUnlock,
}: {
  onUnlock: (pin: string) => boolean;
}) {
  const { tap, isTablet } = useLayout();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const keys = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'], []);

  const push = (key: string) => {
    hapticLight();
    setError(false);
    if (key === '⌫') {
      setDigits((value) => value.slice(0, -1));
      return;
    }
    if (!key || digits.length >= 4) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === 4) {
      const ok = onUnlock(next);
      if (!ok) {
        hapticError();
        setError(true);
        setDigits('');
      }
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('parentLock')}</Text>
      <Text style={styles.hint}>输入四位数字。默认 1234，可在书桌里改。</Text>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              digits.length > index && styles.dotOn,
              error && styles.dotErr,
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {keys.map((key, index) => (
          <Pressable
            key={`${key}-${index}`}
            disabled={!key}
            onPress={() => push(key)}
            style={({ pressed }) => [
              styles.key,
              {
                minHeight: isTablet ? 84 : tap,
                opacity: !key ? 0 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <KidButton label="返回首页" variant="ghost" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Space.md,
    paddingTop: Space.lg,
  },
  title: {
    color: Colors.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  hint: {
    color: Colors.muted,
    fontSize: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginVertical: Space.sm,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.dad,
  },
  dotOn: {
    backgroundColor: Colors.dad,
  },
  dotErr: {
    borderColor: Colors.danger,
    backgroundColor: Colors.danger,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  key: {
    width: '31%',
    borderRadius: Radius.md,
    backgroundColor: Colors.paper,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
  },
});
