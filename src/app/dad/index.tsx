import { router } from 'expo-router';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, KidButton, Screen, SectionLabel } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { dailyProgress } from '@/lib/daily';
import { legacyDailyCopy } from '@/lib/weekly';
import { t } from '@/i18n';

export default function DadDesk() {
  const { state, quest, lockParent, resetDemo, setShowIpa } = useDesk();
  const unread = state.feedback.filter((item) => !item.read).length;
  const unhandled = state.feedback.filter((item) => !item.handled).length;
  const { done, total } = dailyProgress(state.daily);
  const legacy = legacyDailyCopy(state.legacyDaily);

  return (
    <Screen title={t('dadDesk')} subtitle="进度、词表、默写台阶、我家的书、孩子留言。全部本机。" back>
      <Card style={styles.summary}>
        <Text style={styles.line}>连胜 {state.streak.current} 天 · 今日卡 {done}/{total}</Text>
        <Text style={styles.line}>
          词表 {state.words.length} · 闯关词 {quest.packWordIds.length} · 短句 {state.sentences.length} · 我家的书{' '}
          {state.albumBooks.length} · 未处理留言 {unhandled}
        </Text>
      </Card>
      <View style={styles.col}>
        <SectionLabel>学习</SectionLabel>
        <KidButton label={t('progress')} variant="secondary" onPress={() => router.push('/dad/progress')} />
        <KidButton label="本周小结" variant="secondary" onPress={() => router.push('/dad/report')} />
        <KidButton label={t('dictationSettings')} variant="secondary" onPress={() => router.push('/dad/dictation')} />
        <SectionLabel>内容</SectionLabel>
        <KidButton label="孩子档案" variant="secondary" onPress={() => router.push('/dad/profiles')} />
        <KidButton label="本周选词" variant="secondary" onPress={() => router.push('/dad/weekly')} />
        <KidButton label={t('wordList')} variant="secondary" onPress={() => router.push('/dad/words')} />
        {legacy ? <Text style={styles.hint}>{legacy}</Text> : null}
        <Text style={styles.hint}>
          闯关词库新装会自动种入内置默认包，也可在词表再点「导入 KET 包」，或按单元导入 Power Up 1
          家庭包（追加、不覆盖），或粘贴后勾选「用于闯关词库」。每天新词 {quest.dailyNewCount}{' '}
          个，和今日卡分开。
        </Text>
        <KidButton label={t('sentenceList')} variant="secondary" onPress={() => router.push('/dad/sentences')} />
        <Card style={styles.toggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>显示音标</Text>
            <Text style={styles.toggleMeta}>孩子背词和揭晓答案时显示英式 IPA。默认开。</Text>
          </View>
          <Switch
            value={state.showIpa}
            onValueChange={setShowIpa}
            trackColor={{ true: Colors.success }}
          />
        </Card>
        <KidButton label={t('familyBooks')} variant="secondary" onPress={() => router.push('/dad/albums')} />
        <KidButton
          label={`${t('feedbackInbox')}${unhandled ? `（${unhandled}）` : unread ? `（未读 ${unread}）` : ''}`}
          variant="secondary"
          onPress={() => router.push('/dad/feedback')}
        />
        <SectionLabel>本机</SectionLabel>
        <KidButton label="导出 / 导入备份" variant="secondary" onPress={() => router.push('/dad/backup')} />
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
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
  },
  toggleMeta: {
    color: Colors.muted,
    marginTop: 4,
    fontSize: 15,
  },
  hint: {
    color: Colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
