import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { dailyProgress } from '@/lib/daily';
import { t } from '@/i18n';

export default function DadDesk() {
  const { state, lockParent, resetDemo } = useDesk();
  const unread = state.feedback.filter((item) => !item.read).length;
  const { done, total } = dailyProgress(state.daily);

  return (
    <Screen title={t('dadDesk')} subtitle="进度、词表、默写台阶、我家的书、孩子留言。全部本机。" back>
      <Card style={styles.summary}>
        <Text style={styles.line}>连胜 {state.streak.current} 天 · 今日卡 {done}/{total}</Text>
        <Text style={styles.line}>
          词表 {state.words.length} · 我家的书 {state.albumBooks.length} · 未读留言 {unread}
        </Text>
      </Card>
      <View style={styles.col}>
        <KidButton label={t('progress')} variant="secondary" onPress={() => router.push('/dad/progress')} />
        <KidButton label={t('wordList')} variant="secondary" onPress={() => router.push('/dad/words')} />
        <KidButton label={t('familyBooks')} variant="secondary" onPress={() => router.push('/dad/albums')} />
        <KidButton label={t('dictationSettings')} variant="secondary" onPress={() => router.push('/dad/dictation')} />
        <KidButton
          label={`${t('feedbackInbox')}${unread ? `（${unread}）` : ''}`}
          variant="secondary"
          onPress={() => router.push('/dad/feedback')}
        />
        <KidButton label="改密码锁" variant="ghost" onPress={() => router.push('/dad/pin')} />
        <KidButton label="锁上书桌" variant="dad" onPress={lockParent} />
        <KidButton
          label="恢复示例数据"
          variant="ghost"
          onPress={() =>
            Alert.alert('恢复示例？', '词表、进度、留言和本机录音会回到示例。', [
              { text: '取消', style: 'cancel' },
              { text: '恢复', onPress: () => void resetDemo() },
            ])
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: Space.md,
  },
  line: {
    color: Colors.ink,
    fontSize: 17,
    marginBottom: 4,
  },
  col: {
    gap: 12,
  },
});
