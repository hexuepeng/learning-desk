import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import { tokenizeEnglish } from '@/lib/bookWords';
import { playCue } from '@/lib/playCue';
import { orderSentenceDeck } from '@/lib/sentences';
import type { Word } from '@/types/models';

export default function KidSentences() {
  const { state, markSentenceHeard, markSentenceCanSay } = useDesk();
  const [deck] = useState(() => orderSentenceDeck(state.sentences, state.sentenceProgress));
  const [index, setIndex] = useState(0);
  const [showZh, setShowZh] = useState(true);
  const sentence = deck[index];
  const canSayCount = useMemo(
    () => state.sentences.filter((item) => state.sentenceProgress[item.id]?.canSay).length,
    [state.sentences, state.sentenceProgress],
  );
  const heardCount = useMemo(
    () => state.sentences.filter((item) => (state.sentenceProgress[item.id]?.heard ?? 0) > 0).length,
    [state.sentences, state.sentenceProgress],
  );

  if (!sentence) {
    return (
      <Screen title="今日短句" subtitle="额外听读 · 不计入今日卡" back>
        <Card>
          <Text style={styles.body}>短句库还是空的。请爸爸粘贴几句，或用词表拼几句。</Text>
        </Card>
      </Screen>
    );
  }

  const goNext = () => setIndex((value) => (value + 1) % Math.max(deck.length, 1));

  return (
    <Screen
      title="今日短句"
      subtitle={`额外听读 · 不计入今日卡 · 会说 ${canSayCount}/${state.sentences.length} · 听过 ${heardCount}`}
      back
    >
      <Card>
        <SentenceLine text={sentence.en} words={state.words} />
        {sentence.zh ? (
          <>
            <Text style={styles.zh}>{showZh ? sentence.zh : ' '}</Text>
            <KidButton
              label={showZh ? '盖上中文' : '看中文'}
              variant="secondary"
              onPress={() => setShowZh((value) => !value)}
            />
          </>
        ) : null}
        <SpeakButton
          text={sentence.en}
          recordingUri={sentence.recordingUri}
          label={t('listen')}
        />
        <View style={styles.row}>
          <KidButton
            label="听一听"
            variant="secondary"
            style={styles.flex}
            onPress={() => {
              markSentenceHeard(sentence.id);
              playCue(sentence.en, sentence.recordingUri);
            }}
          />
          <KidButton
            label="我会说了"
            variant="success"
            style={styles.flex}
            onPress={() => {
              markSentenceCanSay(sentence.id);
              goNext();
            }}
          />
        </View>
        <KidButton label="下一句" variant="ghost" onPress={goNext} />
      </Card>
    </Screen>
  );
}

function SentenceLine({ text, words }: { text: string; words: Word[] }) {
  const { isTablet, compact } = useLayout();
  const [picked, setPicked] = useState<string | null>(null);
  const known = useMemo(() => {
    const map = new Map<string, Word>();
    for (const word of words) map.set(word.en.toLowerCase(), word);
    return map;
  }, [words]);
  const tokens = tokenizeEnglish(text);
  const size = isTablet ? (compact ? 34 : 42) : 36;

  return (
    <View style={styles.sentenceWrap}>
      <View style={styles.wordRow}>
        {splitKeep(text).map((part, index) => {
          const key = part.toLowerCase();
          const hit = /[A-Za-z]/.test(part) && known.has(key);
          if (!hit) {
            return (
              <Text key={`${part}-${index}`} style={[styles.en, { fontSize: size }]}>
                {part}
              </Text>
            );
          }
          const on = picked?.toLowerCase() === key;
          return (
            <Pressable
              key={`${part}-${index}`}
              onPress={() => setPicked(on ? null : part)}
              style={on ? styles.wordOn : undefined}
            >
              <Text style={[styles.en, { fontSize: size }, on && styles.enOn]}>{part}</Text>
            </Pressable>
          );
        })}
      </View>
      {picked && known.get(picked.toLowerCase()) ? (
        <Text style={styles.gloss}>
          {picked} · {known.get(picked.toLowerCase())?.zh}
        </Text>
      ) : tokens.some((token) => known.has(token.toLowerCase())) ? (
        <Text style={styles.hint}>点蓝词可看词表释义</Text>
      ) : null}
    </View>
  );
}

function splitKeep(text: string): string[] {
  return text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/).filter((part) => part.length > 0);
}

const styles = StyleSheet.create({
  body: {
    color: Colors.muted,
    fontSize: 17,
  },
  sentenceWrap: {
    alignItems: 'center',
    marginBottom: Space.md,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  en: {
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
  },
  wordOn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
  },
  enOn: {
    color: '#fff',
  },
  hint: {
    color: Colors.muted,
    marginTop: 8,
    fontWeight: '700',
  },
  gloss: {
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '800',
    fontSize: 18,
  },
  zh: {
    fontSize: 24,
    color: Colors.muted,
    textAlign: 'center',
    minHeight: 36,
    marginBottom: Space.sm,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: Space.md,
  },
  flex: {
    flex: 1,
  },
});
