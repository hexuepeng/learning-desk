import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { createId } from '@/lib/util';
import type { AlbumPage } from '@/types/models';

export default function NewAlbumBook() {
  const { addAlbumBook } = useDesk();
  const [title, setTitle] = useState('我家的一天');
  const [pages, setPages] = useState<AlbumPage[]>([]);

  const addPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相册权限', '相册书只把照片存在这台设备上，不会上传。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setPages((current) => [
      ...current,
      { id: createId('page'), photoUri: result.assets[0].uri, caption: '' },
    ]);
  };

  const save = () => {
    if (pages.length === 0) {
      Alert.alert('先加一页', '至少选一张照片。');
      return;
    }
    const id = addAlbumBook({ title, pages });
    router.replace(`/english/books/${id}`);
  };

  return (
    <Screen title="做一本相册书" subtitle="照片和说明只保存在本机。" back>
      <Card>
        <Text style={styles.label}>书名</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />
        <KidButton label="从相册加一页" variant="secondary" onPress={() => void addPhoto()} />
      </Card>
      {pages.map((page, index) => (
        <Card key={page.id} style={styles.page}>
          <Image source={{ uri: page.photoUri }} style={styles.photo} />
          <TextInput
            placeholder="英文说明，例如：This is my cat."
            placeholderTextColor={Colors.muted}
            style={styles.input}
            value={page.caption}
            onChangeText={(caption) =>
              setPages((current) =>
                current.map((item) => (item.id === page.id ? { ...item, caption } : item)),
              )
            }
          />
          <KidButton
            label={`去掉第 ${index + 1} 页`}
            variant="ghost"
            compact
            onPress={() => setPages((current) => current.filter((item) => item.id !== page.id))}
          />
        </Card>
      ))}
      <View style={{ height: Space.md }} />
      <KidButton label="做成绘本" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 8,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: Space.md,
  },
  page: {
    marginTop: Space.md,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: Radius.sm,
    marginBottom: Space.sm,
    backgroundColor: Colors.paperSoft,
  },
});
