import { StyleSheet, Text, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { DICTATION_TYPE_LABELS } from '@/lib/dictation';

export default function DadFeedback() {
  const { state, markFeedbackRead } = useDesk();
  return (
    <Screen title="孩子留言" subtitle="从首页「告诉爸爸」送来，只存在本机。" back>
      {state.feedback.length === 0 ? (
        <Card>
          <Text style={styles.meta}>还没有留言。</Text>
        </Card>
      ) : (
        <View style={styles.col}>
          {state.feedback.map((item) => (
            <Card key={item.id}>
              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleString()} {item.read ? '' : '· 未读'}
              </Text>
              <Text style={styles.body}>{item.text}</Text>
              {!item.read && (
                <KidButton label="标为已读" variant="secondary" compact onPress={() => markFeedbackRead(item.id)} />
              )}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  col: { gap: Space.md },
  meta: { color: Colors.muted, marginBottom: 8 },
  body: { fontSize: 18, color: Colors.ink, marginBottom: Space.sm },
});
