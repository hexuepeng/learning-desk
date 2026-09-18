import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';

export default function DadPin() {
  const { changePin } = useDesk();
  const [pin, setPin] = useState('');

  return (
    <Screen title="改密码锁" subtitle="四位数字。请记在别的地方，v0.1 没有找回。" back>
      <Card>
        <Text style={styles.meta}>当前默认出厂是 1234。</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={setPin}
          placeholder="1234"
          style={styles.input}
        />
        <KidButton
          label="保存"
          onPress={() => {
            if (!changePin(pin)) {
              Alert.alert('要用四位数字');
              return;
            }
            Alert.alert('已保存');
            setPin('');
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { color: Colors.muted, marginBottom: Space.md },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: Space.md,
    color: Colors.ink,
  },
});
