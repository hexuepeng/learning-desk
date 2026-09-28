import { router } from 'expo-router';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { FamilyBookBadge } from '@/components/albumUi';
import { Card, KidButton, Screen } from '@/components/ui';
import { MINI_BOOKS } from '@/content/miniBooks';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { FAMILY_ALBUM_LABEL } from '@/lib/album';
import { displayAlbumPhotoUri } from '@/lib/albumFiles';

export default function BooksIndex() {
  const { state, removeAlbumBook } = useDesk();
  return (
    <Screen title="绘本" subtitle="短绘本是原创小故事；「我家的书」只存在这台设备上。" back>
      <Text style={styles.section}>短绘本</Text>
      <View style={styles.col}>
        {MINI_BOOKS.map((book) => (
          <Card
            key={book.id}
            onPress={() => router.push(`/english/books/${book.id}`)}
            accessibilityLabel={book.titleZh}
          >
            <Text style={styles.art}>{book.coverArt}</Text>
            <Text style={styles.title}>{book.titleZh}</Text>
            <Text style={styles.meta}>{book.titleEn}</Text>
          </Card>
        ))}
      </View>
      <Text style={styles.section}>{FAMILY_ALBUM_LABEL}</Text>
      <KidButton label="用相册做一本" onPress={() => router.push('/english/books/new-album')} />
      <View style={styles.col}>
        {state.albumBooks.length === 0 ? (
          <Text style={styles.meta}>还没有我家的书。选几张照片，写上一句英文说明即可。</Text>
        ) : (
          state.albumBooks.map((book) => (
            <Card
              key={book.id}
              onPress={() => router.push(`/english/books/${book.id}`)}
              accessibilityLabel={book.title}
            >
              <FamilyBookBadge />
              {book.pages[0] ? (
                <Image
                  source={{ uri: displayAlbumPhotoUri(book.pages[0].photoUri) }}
                  style={styles.cover}
                />
              ) : (
                <Text style={styles.art}>📷</Text>
              )}
              <Text style={styles.title}>{book.title}</Text>
              <Text style={styles.meta}>{book.pages.length} 页 · 仅本机</Text>
              <KidButton
                label="删除"
                variant="ghost"
                compact
                onPress={() =>
                  Alert.alert('删除这本相册书？', '照片不会上传，只从本机学习台拿掉。', [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '删除',
                      style: 'destructive',
                      onPress: () => void removeAlbumBook(book.id),
                    },
                  ])
                }
              />
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: Space.md,
    marginBottom: Space.sm,
  },
  col: {
    gap: Space.md,
    marginBottom: Space.md,
    marginTop: Space.sm,
  },
  art: {
    fontSize: 40,
    marginBottom: 8,
  },
  cover: {
    width: '100%',
    height: 140,
    borderRadius: Radius.sm,
    marginTop: Space.sm,
    marginBottom: 8,
    backgroundColor: Colors.paperSoft,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.ink,
  },
  meta: {
    color: Colors.muted,
    marginTop: 4,
    fontSize: 16,
  },
});
