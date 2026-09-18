import { Stack } from 'expo-router';

import { PinLock } from '@/components/PinLock';
import { LoadingScreen, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';

export default function DadLayout() {
  const { ready, parentUnlocked, unlockParent } = useDesk();
  if (!ready) return <LoadingScreen />;
  if (!parentUnlocked) {
    return (
      <Screen>
        <PinLock onUnlock={unlockParent} />
      </Screen>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    />
  );
}
