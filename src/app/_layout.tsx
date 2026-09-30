import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { DeskProvider, useDesk } from '@/hooks/useDesk';
import { KidButton, LoadingScreen } from '@/components/ui';
import DadBackup from './dad/backup';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <DeskProvider>
      <StatusBar style="dark" />
      <DeskNavigation />
    </DeskProvider>
  );
}

function DeskNavigation() {
  const { ready, loadError, saveError, backupBusy, retrySave } = useDesk();
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'fade',
        }}
      />
      {loadError ? <View style={styles.recovery}><DadBackup recoveryMode /></View>
        : !ready ? <View style={styles.recovery}><LoadingScreen /></View> : null}
      {saveError && !loadError ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={styles.text}>{saveError}</Text>
          <KidButton label="重试保存" compact onPress={() => {
            void retrySave().catch(() => Alert.alert('还没保存成功', '请检查本机剩余空间后再试。'));
          }} />
        </View>
      ) : null}
      {backupBusy ? (
        <View style={styles.busy} accessibilityViewIsModal>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.text}>正在准备备份或恢复，请稍等…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 12, backgroundColor: Colors.paper, gap: 8 },
  text: { color: Colors.ink, fontSize: 17, textAlign: 'center' },
  busy: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(255, 246, 235, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  recovery: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Colors.bg },
});
