import { StyleSheet, Text, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { FEEDBACK_KIND_LABELS } from '@/lib/feedback';

export default function DadFeedback() {
  const { state, markFeedbackRead, markFeedbackHandled } = useDesk();
  const open = state.feedback.filter((item) => !item.handled);
  const done = state.feedback.filter((item) => item.handled);

  return (
    <Screen title="孩子留言" subtitle="点一下的太难/太简单/没意思会进这里。可标已处理。" back>
      {state.feedback.length === 0 ? (
        <Card>
          <Text style={styles.meta}>还没有留言。</Text>
        </Card>
      ) : (
        <View style={styles.col}>
          {open.map((item) => (
            <Card key={item.id}>
              <Text style={styles.kind}>{FEEDBACK_KIND_LABELS[item.kind]}</Text>
              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleString()} {item.read ? '' : '· 未读'}
              </Text>
              <Text style={styles.body}>{item.text}</Text>
              <View style={styles.row}>
                {!item.read && (
                  <KidButton
                    label="标为已读"
                    variant="secondary"
                    compact
                    onPress={() => markFeedbackRead(item.id)}
                    style={styles.flex}
                  />
                )}
                <KidButton
                  label="标为已处理"
                  variant="success"
                  compact
                  onPress={() => markFeedbackHandled(item.id)}
                  style={styles.flex}
                />
              </View>
            </Card>
          ))}
          {done.length > 0 ? <Text style={styles.section}>已处理</Text> : null}
          {done.map((item) => (
            <Card key={item.id}>
              <Text style={styles.kind}>{FEEDBACK_KIND_LABELS[item.kind]} · 已处理</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={styles.body}>{item.text}</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  col: { gap: Space.md },
  row: { flexDirection: 'row', gap: Space.sm },
  flex: { flex: 1 },
  section: { fontWeight: '800', color: Colors.ink, fontSize: 18 },
  kind: { fontWeight: '800', color: Colors.dad, marginBottom: 4 },
  meta: { color: Colors.muted, marginBottom: 8 },
  body: { fontSize: 18, color: Colors.ink, marginBottom: Space.sm },
});
