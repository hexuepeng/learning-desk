import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { FamilyBookBadge } from '@/components/albumUi';
import { Card, KidButton, Screen } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { FAMILY_ALBUM_LABEL } from '@/lib/album';
import { displayAlbumPhotoUri } from '@/lib/albumFiles';

export default function DadAlbums() {
  const { state, addAlbumBook, removeAlbumBook } = useDesk();
  const [title, setTitle] = useState('我家的一天');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await addAlbumBook({ title, pages: [] });
      setTitle('我家的一天');
      router.push(`/dad/albums/${id}`);
    } catch {
      Alert.alert('没建成', '请再试一次。');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen title={FAMILY_ALBUM_LABEL} subtitle="在书桌里建书、改页、删页。照片只留在这台设备上。" back>
      <Card>
        <Text style={styles.label}>新书名</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />
        <KidButton
          label={creating ? '正在建立…' : '做一本新的我家的书'}
          onPress={() => void create()}
        />
      </Card>
      <View style={styles.col}>
        {state.albumBooks.length === 0 ? (
          <Text style={styles.meta}>还没有相册书。先起个书名，再进去加照片。</Text>
        ) : (
          state.albumBooks.map((book) => (
            <Card key={book.id} onPress={() => router.push(`/dad/albums/${book.id}`)}>
              <FamilyBookBadge compact />
              {book.pages[0] ? (
                <Image
                  source={{ uri: displayAlbumPhotoUri(book.pages[0].photoUri) }}
                  style={styles.cover}
                />
              ) : null}
              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.meta}>{book.pages.length} 页 · 点进去改页</Text>
              <View style={styles.row}>
                <KidButton
                  label="改这本"
                  variant="secondary"
                  compact
                  style={styles.flex}
                  onPress={() => router.push(`/dad/albums/${book.id}`)}
                />
                <KidButton
                  label="删除"
                  variant="ghost"
                  compact
                  style={styles.flex}
                  onPress={() =>
                    Alert.alert('删除这本我家的书？', '只从这台设备拿走，不会上传。', [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '删除',
                        style: 'destructive',
                        onPress: () => void removeAlbumBook(book.id),
                      },
                    ])
                  }
                />
              </View>
            </Card>
          ))
        )}
      </View>
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
  col: {
    gap: Space.md,
    marginTop: Space.lg,
  },
  cover: {
    width: '100%',
    height: 120,
    borderRadius: Radius.sm,
    marginTop: Space.sm,
    backgroundColor: Colors.paperSoft,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 8,
  },
  meta: {
    color: Colors.muted,
    marginTop: 4,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Space.sm,
  },
  flex: {
    flex: 1,
  },
});
