import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { t } from '@/i18n';

export default function TellDadScreen() {
  const { addFeedback } = useDesk();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <Screen title={t('tellDad')} subtitle="想学什么、哪里太难，写给爸爸。" back>
      <Card>
        {sent ? (
          <Text style={styles.ok}>爸爸收到啦。他会在书桌里看到。</Text>
        ) : (
          <>
            <TextInput
              multiline
              placeholder="例如：默写的排字母太快了 / 想学动物单词"
              placeholderTextColor={Colors.muted}
              style={styles.input}
              value={text}
              onChangeText={setText}
            />
            <KidButton
              label="送给爸爸"
              disabled={text.trim().length === 0}
              onPress={() => {
                addFeedback(text);
                setText('');
                setSent(true);
              }}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 140,
    fontSize: 18,
    color: Colors.ink,
    textAlignVertical: 'top',
    marginBottom: Space.md,
  },
  ok: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
  },
});
