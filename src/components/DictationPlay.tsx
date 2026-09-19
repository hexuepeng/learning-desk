import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IpaText } from '@/components/IpaText';
import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
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
  writingHint,
  type LetterTile,
} from '@/lib/dictation';
import { hapticError, hapticLight, hapticSuccess } from '@/lib/haptics';
import { arrangeTileSize, nextEmptySlot, pickWordColumns } from '@/lib/layout';
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
  const { titleSize, bodySize, isLandscape, isTablet } = useLayout();
  const { state } = useDesk();
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

  const answered = result != null;

  return (
    <Card>
      <Text style={[styles.kicker, { fontSize: isTablet ? 18 : 16 }]}>{meta.zh}</Text>
      {!answered && <Text style={[styles.hint, { fontSize: bodySize }]}>{meta.hint}</Text>}
      {!answered && type === 'pick-word' && (
        <PickWord word={word} pool={pool} disabled={false} onAnswer={finish} />
      )}
      {!answered && type === 'fill-letters' && (
        <FillLetters word={word} disabled={false} onAnswer={finish} />
      )}
      {!answered && type === 'arrange-letters' && (
        <ArrangeLetters
          word={word}
          disabled={false}
          onAnswer={finish}
          landscapeSplit={isLandscape && isTablet}
        />
      )}
      {!answered && (type === 'write-from-chinese' || type === 'listen-write') && (
        <WriteWord
          word={word}
          listen={type === 'listen-write'}
          showZh={type === 'write-from-chinese'}
          disabled={false}
          onAnswer={finish}
        />
      )}
      {result != null && (
        <View style={styles.result}>
          <Text style={[styles.resultTitle, { fontSize: Math.min(titleSize, 28) }]}>
            {result ? '对啦！' : '再看一眼'}
          </Text>
          <Text style={[styles.answer, { fontSize: bodySize }]}>
            {word.en} · {word.zh}
          </Text>
          <IpaText ipa={word.ipa} show={state.showIpa} style={[styles.ipa, { fontSize: bodySize }]} />
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
  const { titleSize, isTablet } = useLayout();
  const options = useMemo(() => pickWordOptions(word, pool), [word, pool]);
  const columns = pickWordColumns(isTablet);
  return (
    <View style={styles.block}>
      <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.zh}</Text>
      <SpeakButton text={word.en} label="提示发音" recordingUri={word.recordingUri} />
      <View style={[styles.options, columns > 1 && styles.optionsMulti]}>
        {options.map((item, index) => (
          <KidButton
            key={`${item.id}-${index}`}
            label={item.en}
            variant="secondary"
            disabled={disabled}
            onPress={() => onAnswer(item.id === word.id)}
            style={columns > 1 ? styles.optionHalf : undefined}
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
  const { tile, tileGap, titleSize } = useLayout();
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
      <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.zh}</Text>
      <View style={[styles.rowWrap, { gap: tileGap }]}>
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
      <View style={[styles.rowWrap, { gap: tileGap }]}>
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
  landscapeSplit,
}: {
  word: Word;
  disabled: boolean;
  onAnswer: (correct: boolean) => void;
  landscapeSplit: boolean;
}) {
  const { tileGap, titleSize, bodySize, isTablet, width, maxWidth, pad } = useLayout();
  const startTiles = useMemo(() => makeArrangeTiles(word.en), [word.en]);
  const [bank, setBank] = useState<LetterTile[]>(startTiles);
  const [slots, setSlots] = useState<Array<LetterTile | null>>(
    Array.from({ length: word.en.length }, () => null),
  );
  const [target, setTarget] = useState(0);

  const boardWidth = Math.min(width, maxWidth) - pad * 2 - 48;
  const tile = arrangeTileSize(word.en.length, landscapeSplit ? boardWidth * 0.46 : boardWidth, isTablet);
  const letterSize = Math.max(22, Math.round(tile * 0.42));

  useEffect(() => {
    setBank(startTiles);
    setSlots(Array.from({ length: word.en.length }, () => null));
    setTarget(0);
  }, [startTiles, word.en.length]);

  const place = (tileItem: LetterTile) => {
    if (disabled) return;
    const empty = nextEmptySlot(slots, target);
    if (empty < 0) return;
    hapticLight();
    const next = [...slots];
    next[empty] = tileItem;
    setBank((current) => current.filter((item) => item.id !== tileItem.id));
    setSlots(next);
    const following = nextEmptySlot(next, empty + 1);
    setTarget(following >= 0 ? following : empty);
  };

  const onSlotPress = (index: number) => {
    if (disabled) return;
    const tileItem = slots[index];
    if (tileItem) {
      hapticLight();
      setSlots((current) => {
        const next = [...current];
        next[index] = null;
        return next;
      });
      setBank((current) => [...current, tileItem]);
      setTarget(index);
      return;
    }
    hapticLight();
    setTarget(index);
  };

  const clearAll = () => {
    if (disabled) return;
    setBank(startTiles);
    setSlots(Array.from({ length: word.en.length }, () => null));
    setTarget(0);
  };

  const slotRow = (
    <View style={[styles.rowWrap, { gap: tileGap }]}>
      {slots.map((slot, index) => (
        <Pressable
          key={`s-${index}`}
          onPress={() => onSlotPress(index)}
          accessibilityRole="button"
          accessibilityLabel={slot ? `第 ${index + 1} 格 ${slot.letter}` : `第 ${index + 1} 格，空`}
          style={[
            styles.slot,
            styles.slotBlank,
            { minWidth: tile, minHeight: tile },
            index === target && slot == null && styles.slotTarget,
          ]}
        >
          <Text style={[styles.slotText, { fontSize: letterSize }]}>
            {slot?.letter.toUpperCase() ?? ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const bankRow = (
    <View style={[styles.rowWrap, { gap: tileGap }]}>
      {bank.map((tileItem) => (
        <Pressable
          key={tileItem.id}
          disabled={disabled}
          onPress={() => place(tileItem)}
          accessibilityRole="button"
          accessibilityLabel={`字母 ${tileItem.letter}`}
          style={[styles.tile, { minWidth: tile, minHeight: tile }]}
        >
          <Text style={[styles.tileText, { fontSize: letterSize }]}>
            {tileItem.letter.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.block}>
      <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.zh}</Text>
      <Text style={[styles.live, { fontSize: bodySize }]}>
        {arrangedWord(slots).toUpperCase() || '先点空格，再点下面的字母'}
      </Text>
      {landscapeSplit ? (
        <View style={styles.split}>
          <View style={styles.splitPane}>
            <Text style={[styles.paneLabel, { fontSize: bodySize }]}>单词格子</Text>
            {slotRow}
          </View>
          <View style={styles.splitPane}>
            <Text style={[styles.paneLabel, { fontSize: bodySize }]}>字母</Text>
            {bankRow}
          </View>
        </View>
      ) : (
        <>
          {slotRow}
          {bankRow}
        </>
      )}
      <View style={styles.arrangeActions}>
        <KidButton label="清空重排" variant="ghost" disabled={disabled} onPress={clearAll} style={styles.flex} />
        <KidButton
          label={t('check')}
          disabled={disabled || slots.some((slot) => slot == null)}
          onPress={() => onAnswer(isArrangeCorrect(word.en, slots))}
          style={styles.flex}
        />
      </View>
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
  const { titleSize, tap, bodySize } = useLayout();
  const [value, setValue] = useState('');
  useEffect(() => setValue(''), [word.id]);
  const submit = () => {
    if (disabled || value.trim().length === 0) return;
    onAnswer(answersMatch(value, word.en));
  };
  return (
    <View style={styles.block}>
      {showZh ? (
        <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.zh}</Text>
      ) : (
        <Text style={[styles.prompt, { fontSize: titleSize }]}>只听，不看词</Text>
      )}
      <Text style={[styles.hint, { fontSize: bodySize, textAlign: 'center' }]}>{writingHint(word.en)}</Text>
      {listen ? (
        <SpeakButton text={word.en} label="再听一遍" recordingUri={word.recordingUri} />
      ) : null}
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={!disabled}
        placeholder="在这里写下英语单词"
        placeholderTextColor={Colors.muted}
        style={[styles.input, { minHeight: tap + 8 }]}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        returnKeyType="done"
        blurOnSubmit
      />
      <KidButton label={t('check')} disabled={disabled || value.trim().length === 0} onPress={submit} />
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
  optionsMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionHalf: {
    width: '48%',
    flexGrow: 0,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  splitPane: {
    flex: 1,
    gap: Space.sm,
  },
  paneLabel: {
    color: Colors.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  arrangeActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  flex: {
    flex: 1,
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
  slotTarget: {
    borderWidth: 4,
    borderColor: Colors.accent,
    backgroundColor: '#E8F4F1',
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
    marginTop: Space.sm,
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
  ipa: {
    textAlign: 'left',
  },
});
