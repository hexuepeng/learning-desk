import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  challengeModesEnabled,
  DICTATION_LADDER,
  DICTATION_TYPE_LABELS,
} from '@/lib/dictation';

export default function DadDictation() {
  const { state, setDictationType, setAutoAdjust, enableChallengeModes } = useDesk();
  const enabled = new Set(state.dictationSettings.enabledTypes);
  const challengesOn = challengeModesEnabled(state.dictationSettings.enabledTypes);

  return (
    <Screen
      title="默写开关"
      subtitle="台阶顺序固定：选单词 → 填字母 → 排字母 → 看中文写 → 听写。默认前三档打开，自动升降打开。"
      back
    >
      <Card style={{ marginBottom: Space.md }}>
        <Text style={styles.title}>挑战档</Text>
        <Text style={styles.meta}>
          一看中文写、二听写。孩子键盘会提示几个字母，听写可反复点「再听一遍」。
        </Text>
        <KidButton
          label={challengesOn ? '挑战档已打开' : '一键打开挑战档'}
          variant={challengesOn ? 'success' : 'primary'}
          disabled={challengesOn}
          onPress={enableChallengeModes}
        />
      </Card>
      <Card style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>答对/答错后自动升降台阶</Text>
          <Text style={styles.meta}>连续对 2 次升一档，连续错 2 次降一档。</Text>
        </View>
        <Switch
          value={state.dictationSettings.autoAdjust}
          onValueChange={setAutoAdjust}
          trackColor={{ true: Colors.success }}
        />
      </Card>
      {DICTATION_LADDER.map((type) => (
        <Card key={type} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{DICTATION_TYPE_LABELS[type].zh}</Text>
            <Text style={styles.meta}>{DICTATION_TYPE_LABELS[type].hint}</Text>
          </View>
          <Switch
            value={enabled.has(type)}
            onValueChange={(on) => setDictationType(type, on)}
            trackColor={{ true: Colors.primary }}
          />
        </Card>
      ))}
      <Text style={styles.foot}>至少保留一种题型。关掉当前台阶时，孩子会落到仍开启的最近一档。</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  meta: {
    color: Colors.muted,
    marginTop: 4,
  },
  foot: {
    color: Colors.muted,
    marginTop: Space.md,
    fontSize: 15,
  },
});
