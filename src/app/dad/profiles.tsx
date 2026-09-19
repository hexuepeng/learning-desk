import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { activeProfiles } from '@/lib/profile';

export default function DadProfiles() {
  const {
    profiles,
    activeProfileId,
    renameActiveProfile,
    addProfile,
    switchProfile,
    archiveProfile,
  } = useDesk();
  const [name, setName] = useState('');
  const live = activeProfiles(profiles);
  const archived = profiles.filter((item) => item.archived);
  const current = profiles.find((item) => item.id === activeProfileId);

  return (
    <Screen
      title="孩子档案"
      subtitle="词表和我家的书按档案分开。现在一个孩子就够；以后可以再加。"
      back
    >
      <Card style={styles.block}>
        <Text style={styles.label}>当前：{current?.name ?? '孩子'}</Text>
        <TextInput
          placeholder="改名字，例如：妹妹"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <KidButton
          label="改当前档案名"
          variant="secondary"
          onPress={() => {
            renameActiveProfile(name);
            setName('');
          }}
        />
        <KidButton
          label="再建一个档案"
          onPress={() => {
            const id = addProfile(name || '另一个孩子');
            if (id) setName('');
          }}
        />
      </Card>
      <View style={styles.col}>
        {live.map((item) => (
          <Card key={item.id}>
            <Text style={styles.title}>
              {item.name}
              {item.id === activeProfileId ? ' · 正在用' : ''}
            </Text>
            <View style={styles.row}>
              {item.id !== activeProfileId ? (
                <KidButton
                  label="切换到这个"
                  compact
                  variant="secondary"
                  onPress={() => switchProfile(item.id)}
                  style={styles.flex}
                />
              ) : null}
              <KidButton
                label="收入档案柜"
                compact
                variant="ghost"
                disabled={live.length <= 1}
                onPress={() =>
                  Alert.alert('收进档案柜？', '词和书还在，只是先不显示。最后一个档案不能收。', [
                    { text: '取消', style: 'cancel' },
                    { text: '收起来', onPress: () => archiveProfile(item.id) },
                  ])
                }
                style={styles.flex}
              />
            </View>
          </Card>
        ))}
      </View>
      {archived.length > 0 ? (
        <>
          <Text style={styles.section}>档案柜</Text>
          {archived.map((item) => (
            <Card key={item.id}>
              <Text style={styles.meta}>{item.name} · 已收起</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Space.md, gap: Space.sm },
  col: { gap: Space.sm },
  row: { flexDirection: 'row', gap: Space.sm, marginTop: Space.sm },
  flex: { flex: 1 },
  label: { fontWeight: '800', color: Colors.ink },
  title: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  section: { fontWeight: '800', color: Colors.ink, marginTop: Space.lg, marginBottom: Space.sm },
  meta: { color: Colors.muted },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    fontSize: 18,
    color: Colors.ink,
  },
});
