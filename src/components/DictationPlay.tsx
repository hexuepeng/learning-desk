import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';
import {
  arrangedWord,
  DICTATION_TYPE_LABELS,
  fillChoices,
  isArrangeCorrect,
  isFillCorrect,
  makeArrangeTiles,
  makeFillPuzzle,
  pickWordOptions,
  type LetterTile,
} from '@/lib/dictation';
import { hapticError, hapticLight, hapticSuccess } from '@/lib/haptics';
import { answersMatch } from '@/lib/parseWordList';
import { playCue } from '@/lib/playCue';
import type { DictationType, Word } from '@/types/models';

export function DictationPlay({
  word,
  pool,
  type,
  onResolved,
}: {
  word: Word;
  pool: Word[];
  type: DictationType;
  onResolved: (correct: boolean) => void;
}) {
  const meta = DICTATION_TYPE_LABELS[type];
  const [result, setResult] = useState<null | boolean>(null);

  useEffect(() => {
    setResult(null);
    if (type === 'listen-write') playCue(word.en, word.recordingUri);
  }, [word.id, type, word.en, word.recordingUri]);

  const finish = (correct: boolean) => {
    if (result != null) return;
    if (correct) hapticSuccess();
    else hapticError();
    setResult(correct);
  };

  return (
    <Card>
      <Text style={styles.kicker}>{meta.zh}</Text>
      <Text style={styles.hint}>{meta.hint}</Text>
      {type === 'pick-word' && (
        <PickWord word={word} pool={pool} disabled={result != null} onAnswer={finish} />
      )}
      {type === 'fill-letters' && (
        <FillLetters word={word} disabled={result != null} onAnswer={finish} />
      )}
      {type === 'arrange-letters' && (
        <ArrangeLetters word={word} disabled={result != null} onAnswer={finish} />
      )}
      {(type === 'write-from-chinese' || type === 'listen-write') && (
        <WriteWord
          word={word}
          listen={type === 'listen-write'}
          showZh={type === 'write-from-chinese'}
          disabled={result != null}
          onAnswer={finish}
        />
      )}
      {result != null && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{result ? '对啦！' : '再看一眼'}</Text>
          <Text style={styles.answer}>
            {word.en} · {word.zh}
          </Text>
          <SpeakButton text={word.en} recordingUri={word.recordingUri} />
          <KidButton label={t('next')} onPress={() => onResolved(result)} />
        </View>
      )}
    </Card>
  );
}

function PickWord({
  word,
  pool,
  disabled,
  onAnswer,
}: {
  word: Word;
  pool: Word[];
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const options = useMemo(() => pickWordOptions(word, pool), [word, pool]);
  return (
    <View style={styles.block}>
      <Text style={styles.prompt}>{word.zh}</Text>
      <SpeakButton text={word.en} label="提示发音" recordingUri={word.recordingUri} />
      <View style={styles.options}>
        {options.map((item, index) => (
          <KidButton
            key={`${item.id}-${index}`}
            label={item.en}
            variant="secondary"
            disabled={disabled}
            onPress={() => onAnswer(item.id === word.id)}
          />
        ))}
      </View>
    </View>
  );
}

function FillLetters({
  word,
  disabled,
  onAnswer,
}: {
  word: Word;
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const { tile } = useLayout();
  const puzzle = useMemo(() => makeFillPuzzle(word.en), [word.en]);
  const choices = useMemo(() => fillChoices(puzzle.missing), [puzzle]);
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const hiddenIndexes = puzzle.chars.filter((item) => item.hidden).map((item) => item.index);
  const nextBlank = hiddenIndexes.find((index) => !guesses[index]);

  const put = (letter: string) => {
    if (disabled || nextBlank == null) return;
    hapticLight();
    setGuesses((current) => ({ ...current, [nextBlank]: letter }));
  };

  return (
    <View style={styles.block}>
      <Text style={styles.prompt}>{word.zh}</Text>
      <View style={styles.rowWrap}>
        {puzzle.chars.map((item) => (
          <Pressable
            key={item.index}
            onPress={() => {
              if (!item.hidden || disabled) return;
              setGuesses((current) => {
                const next = { ...current };
                delete next[item.index];
                return next;
              });
            }}
            style={[
              styles.slot,
              { minWidth: tile * 0.72, minHeight: tile },
              item.hidden && styles.slotBlank,
            ]}
          >
            <Text style={styles.slotText}>
              {item.hidden ? (guesses[item.index] ?? '').toUpperCase() : item.ch.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.rowWrap}>
        {choices.map((letter) => (
          <Pressable
            key={letter}
            disabled={disabled}
            onPress={() => put(letter)}
            style={[styles.tile, { minWidth: tile, minHeight: tile }]}
          >
            <Text style={styles.tileText}>{letter.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <KidButton
        label={t('check')}
        disabled={disabled || nextBlank != null}
        onPress={() => onAnswer(isFillCorrect(puzzle, guesses))}
      />
    </View>
  );
}

function ArrangeLetters({
  word,
  disabled,
  onAnswer,
}: {
  word: Word;
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const { tile } = useLayout();
  const startTiles = useMemo(() => makeArrangeTiles(word.en), [word.en]);
  const [bank, setBank] = useState<LetterTile[]>(startTiles);
  const [slots, setSlots] = useState<Array<LetterTile | null>>(
    Array.from({ length: word.en.length }, () => null),
  );

  useEffect(() => {
    setBank(startTiles);
    setSlots(Array.from({ length: word.en.length }, () => null));
  }, [startTiles, word.en.length]);

  const place = (tileItem: LetterTile) => {
    if (disabled) return;
    const empty = slots.findIndex((slot) => slot == null);
    if (empty < 0) return;
    hapticLight();
    setBank((current) => current.filter((item) => item.id !== tileItem.id));
    setSlots((current) => {
      const next = [...current];
      next[empty] = tileItem;
      return next;
    });
  };

  const remove = (index: number) => {
    const tileItem = slots[index];
    if (!tileItem || disabled) return;
    setSlots((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
    setBank((current) => [...current, tileItem]);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.prompt}>{word.zh}</Text>
      <Text style={styles.live}>{arrangedWord(slots).toUpperCase() || '把字母点进格子'}</Text>
      <View style={styles.rowWrap}>
        {slots.map((slot, index) => (
          <Pressable
            key={`s-${index}`}
            onPress={() => remove(index)}
            style={[styles.slot, styles.slotBlank, { minWidth: tile, minHeight: tile }]}
          >
            <Text style={styles.slotText}>{slot?.letter.toUpperCase() ?? ''}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.rowWrap}>
        {bank.map((tileItem) => (
          <Pressable
            key={tileItem.id}
            disabled={disabled}
            onPress={() => place(tileItem)}
            style={[styles.tile, { minWidth: tile, minHeight: tile }]}
          >
            <Text style={styles.tileText}>{tileItem.letter.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <KidButton
        label={t('check')}
        disabled={disabled || slots.some((slot) => slot == null)}
        onPress={() => onAnswer(isArrangeCorrect(word.en, slots))}
      />
    </View>
  );
}

function WriteWord({
  word,
  listen,
  showZh,
  disabled,
  onAnswer,
}: {
  word: Word;
  listen: boolean;
  showZh: boolean;
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => setValue(''), [word.id]);
  return (
    <View style={styles.block}>
      {showZh ? <Text style={styles.prompt}>{word.zh}</Text> : <Text style={styles.prompt}>？</Text>}
      {listen ? <SpeakButton text={word.en} recordingUri={word.recordingUri} /> : null}
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        placeholder="在这里写下英语单词"
        placeholderTextColor={Colors.muted}
        style={styles.input}
        value={value}
        onChangeText={setValue}
      />
      <KidButton
        label={t('check')}
        disabled={disabled || value.trim().length === 0}
        onPress={() => onAnswer(answersMatch(value, word.en))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  hint: {
    color: Colors.muted,
    fontSize: 16,
    marginBottom: Space.md,
  },
  block: {
    gap: Space.md,
  },
  prompt: {
    color: Colors.ink,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  live: {
    textAlign: 'center',
    color: Colors.muted,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  options: {
    gap: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  tile: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tileText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  slot: {
    borderRadius: Radius.sm,
    backgroundColor: Colors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  slotBlank: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  slotText: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  input: {
    minHeight: 64,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.line,
    paddingHorizontal: Space.md,
    fontSize: 22,
    color: Colors.ink,
    backgroundColor: '#fff',
  },
  result: {
    marginTop: Space.lg,
    gap: Space.sm,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.ink,
  },
  answer: {
    fontSize: 20,
    color: Colors.muted,
  },
});
