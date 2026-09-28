import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { t } from '@/i18n';

export default function EnglishHall() {
  const { state } = useDesk();
  return (
    <Screen title={t('englishHall')} subtitle={`共享词表 ${state.words.length} 个词`} back>
      <View style={styles.col}>
        <Tool title={t('vocab')} hint="看词、听发音、点认识或不熟" onPress={() => router.push('/english/vocab')} />
        <Tool title={t('ketQuest')} hint="听音选词 / 听中文选词 / 跟读，间隔复习；不计入今日卡" onPress={() => router.push('/english/quest')} />
        <Tool title={t('dictation')} hint="选词 → 填字母 → 排字母（爸爸可再打开看中文写 / 听写）" onPress={() => router.push('/english/dictation')} />
        <Tool title={t('todaySentences')} hint="听一句、跟一句，不计入今日卡" onPress={() => router.push('/english/sentences')} />
        <Tool title="错词复习" hint="今日卡以外的 5 分钟，专练错过的词" onPress={() => router.push('/english/review')} />
        <Tool title={t('pictureBooks')} hint="两本短绘本 + 我家的书（本机相册）" onPress={() => router.push('/english/books')} />
      </View>
    </Screen>
  );
}

function Tool({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const { isTablet, tap, bodySize } = useLayout();
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={{ minHeight: tap + 36 }}>
      <Text style={[styles.title, { fontSize: isTablet ? 30 : 26 }]}>{title}</Text>
      <Text style={[styles.hint, { fontSize: bodySize }]}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  col: {
    gap: Space.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
  },
  hint: {
    marginTop: 6,
    color: Colors.muted,
    fontSize: 16,
  },
});
