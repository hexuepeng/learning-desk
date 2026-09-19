import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { tokenizeEnglish } from '@/lib/bookWords';

export function TappableWords({
  text,
  onPick,
}: {
  text: string;
  onPick: (word: string) => void;
}) {
  const { bodySize, tap } = useLayout();
  const [picked, setPicked] = useState<string | null>(null);
  const words = tokenizeEnglish(text);
  if (words.length === 0) {
    return <Text style={[styles.fallback, { fontSize: bodySize }]}>{text}</Text>;
  }
  return (
    <View>
      <Text style={[styles.lead, { fontSize: bodySize }]}>{text}</Text>
      <Text style={styles.hint}>点一个词，加到今日词表</Text>
      <View style={styles.row}>
        {words.map((word) => (
          <Pressable
            key={word}
            onPress={() => {
              setPicked(word);
              onPick(word);
            }}
            style={[
              styles.chip,
              { minHeight: Math.max(44, tap - 16) },
              picked?.toLowerCase() === word.toLowerCase() && styles.chipOn,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { fontSize: bodySize },
                picked?.toLowerCase() === word.toLowerCase() && styles.chipTextOn,
              ]}
            >
              {word}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: {
    color: Colors.ink,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Space.sm,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: Colors.paperSoft,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.ink,
    fontWeight: '800',
  },
  chipTextOn: {
    color: '#fff',
  },
  fallback: {
    color: Colors.ink,
    textAlign: 'center',
  },
});
