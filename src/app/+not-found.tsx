import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KidButton } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: '未找到' }} />
      <SafeAreaView style={styles.wrap}>
        <Text style={styles.title}>这一页还没有。</Text>
        <Link href="/" asChild>
          <KidButton label="回首页" onPress={() => {}} />
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: Space.lg,
    gap: Space.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
  },
});
