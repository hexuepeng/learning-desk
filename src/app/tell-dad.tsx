import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { t } from '@/i18n';
import { FEEDBACK_KIND_LABELS } from '@/lib/feedback';
import type { FeedbackKind } from '@/types/models';

const QUICK: FeedbackKind[] = ['too-hard', 'too-easy', 'boring'];

export default function TellDadScreen() {
  const { addFeedback } = useDesk();
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const send = (kind: FeedbackKind) => {
    addFeedback(kind, note);
    setNote('');
    setSent(FEEDBACK_KIND_LABELS[kind]);
  };

  return (
    <Screen title={t('tellDad')} subtitle="点一下告诉爸爸：太难、太简单，还是没意思。" back>
      <Card>
        {sent ? (
          <>
            <Text style={styles.ok}>爸爸收到啦：{sent}</Text>
            <KidButton label="再告诉他一件" variant="secondary" onPress={() => setSent(null)} />
          </>
        ) : (
          <>
            <View style={styles.quick}>
              {QUICK.map((kind) => (
                <KidButton
                  key={kind}
                  label={FEEDBACK_KIND_LABELS[kind]}
                  variant={kind === 'too-hard' ? 'danger' : kind === 'too-easy' ? 'success' : 'secondary'}
                  onPress={() => send(kind)}
                />
              ))}
            </View>
            <Text style={styles.hint}>也可以加一句（可不填）</Text>
            <TextInput
              multiline
              placeholder="例如：排字母太久了 / 想学动物单词"
              placeholderTextColor={Colors.muted}
              style={styles.input}
              value={note}
              onChangeText={setNote}
            />
            <KidButton
              label="只送这一句"
              variant="ghost"
              disabled={note.trim().length === 0}
              onPress={() => send('note')}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quick: {
    gap: Space.sm,
    marginBottom: Space.md,
  },
  hint: {
    color: Colors.muted,
    marginBottom: Space.sm,
    fontWeight: '700',
  },
  input: {
    minHeight: 100,
    fontSize: 18,
    color: Colors.ink,
    textAlignVertical: 'top',
    marginBottom: Space.md,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    padding: Space.sm,
  },
  ok: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: Space.md,
  },
});
