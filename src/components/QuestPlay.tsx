import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IpaText } from '@/components/IpaText';
import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { pickWordOptions } from '@/lib/dictation';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { pickWordColumns } from '@/lib/layout';
import { playChineseCue, playCue } from '@/lib/playCue';
import { QUEST_MODES } from '@/lib/quest';
import { t } from '@/i18n';
import type { QuestModeIndex, Word } from '@/types/models';

export function QuestPlay({
  word,
  pool,
  mode,
  onResolved,
}: {
  word: Word;
  pool: Word[];
  mode: QuestModeIndex;
  onResolved: (correct: boolean) => void;
}) {
  const { titleSize, bodySize, isTablet } = useLayout();
  const { state } = useDesk();
  const meta = QUEST_MODES[mode];
  const [result, setResult] = useState<null | boolean>(null);

  useEffect(() => {
    setResult(null);
    if (mode === 0) playCue(word.en, word.recordingUri);
    if (mode === 1) playChineseCue(word.zh);
  }, [word.id, mode, word.en, word.zh, word.recordingUri]);

  const finish = (correct: boolean) => {
    if (result != null) return;
    if (correct) hapticSuccess();
    else hapticError();
    setResult(correct);
  };

  const answered = result != null;

  return (
    <Card>
      <Text style={[styles.kicker, { fontSize: isTablet ? 18 : 16 }]}>{meta.title}</Text>
      {!answered && <Text style={[styles.hint, { fontSize: bodySize }]}>{meta.hint}</Text>}
      {!answered && mode === 0 && (
        <ListenPick word={word} pool={pool} disabled={false} onAnswer={finish} />
      )}
      {!answered && mode === 1 && (
        <ChinesePick word={word} pool={pool} disabled={false} onAnswer={finish} />
      )}
      {!answered && mode === 2 && <ReadAlong word={word} onDone={() => finish(true)} />}
      {result != null && (
        <View style={styles.result}>
          <Text style={[styles.resultTitle, { fontSize: Math.min(titleSize, 28) }]}>
            {mode === 2 ? '读得很好' : result ? '对啦！' : '再看一眼'}
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

function OptionGrid({
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
  const { isTablet } = useLayout();
  const { state } = useDesk();
  const options = useMemo(() => pickWordOptions(word, pool), [word, pool]);
  const columns = pickWordColumns(isTablet);
  return (
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
      {state.showIpa ? (
        <Text style={styles.optionHint}>选对后再看音标和中文</Text>
      ) : null}
    </View>
  );
}

function ListenPick({
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
  const { titleSize } = useLayout();
  return (
    <View style={styles.block}>
      <Text style={[styles.prompt, { fontSize: titleSize }]}>听一听，选出单词</Text>
      <SpeakButton text={word.en} label="再听一遍" recordingUri={word.recordingUri} />
      <OptionGrid word={word} pool={pool} disabled={disabled} onAnswer={onAnswer} />
    </View>
  );
}

function ChinesePick({
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
  const { titleSize } = useLayout();
  return (
    <View style={styles.block}>
      <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.zh}</Text>
      <KidButton label="再听中文" variant="ghost" onPress={() => playChineseCue(word.zh)} />
      <OptionGrid word={word} pool={pool} disabled={disabled} onAnswer={onAnswer} />
    </View>
  );
}

function ReadAlong({ word, onDone }: { word: Word; onDone: () => void }) {
  const { titleSize, bodySize } = useLayout();
  const { state } = useDesk();
  return (
    <View style={styles.block}>
      <Text style={[styles.prompt, { fontSize: titleSize }]}>{word.en}</Text>
      <IpaText ipa={word.ipa} show={state.showIpa} style={[styles.ipaCenter, { fontSize: bodySize }]} />
      <Text style={[styles.hint, { fontSize: bodySize, textAlign: 'center' }]}>{word.zh}</Text>
      <SpeakButton text={word.en} label="听示范" recordingUri={word.recordingUri} />
      <KidButton label="我读好了" onPress={onDone} />
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
  optionHint: {
    width: '100%',
    color: Colors.muted,
    textAlign: 'center',
    fontWeight: '700',
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
  ipaCenter: {
    textAlign: 'center',
  },
});
