import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, KidButton } from '@/components/ui';
import { Colors, Radius, Space } from '@/constants/theme';
import { FAMILY_ALBUM_LABEL } from '@/lib/album';
import { displayAlbumPhotoUri } from '@/lib/albumFiles';
import type { AlbumPage } from '@/types/models';

export function FamilyBookBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={styles.badgeText}>{FAMILY_ALBUM_LABEL}</Text>
    </View>
  );
}

export function AlbumPageEditor({
  page,
  index,
  onCaption,
  onCaptionZh,
  onRemove,
}: {
  page: AlbumPage;
  index: number;
  onCaption: (caption: string) => void;
  onCaptionZh: (captionZh: string) => void;
  onRemove: () => void;
}) {
  return (
    <Card style={styles.page}>
      <Text style={styles.pageLabel}>第 {index + 1} 页</Text>
      <Image
        source={{ uri: displayAlbumPhotoUri(page.photoUri) }}
        style={styles.photo}
        accessibilityLabel={`第 ${index + 1} 页照片`}
      />
      <Text style={styles.fieldLabel}>英文说明</Text>
      <TextInput
        placeholder="This is my cat."
        placeholderTextColor={Colors.muted}
        style={styles.input}
        value={page.caption}
        onChangeText={onCaption}
      />
      <Text style={styles.fieldLabel}>中文释义（可空）</Text>
      <TextInput
        placeholder="这是我的猫。"
        placeholderTextColor={Colors.muted}
        style={styles.input}
        value={page.captionZh}
        onChangeText={onCaptionZh}
      />
      <KidButton label={`去掉第 ${index + 1} 页`} variant="ghost" compact onPress={onRemove} />
    </Card>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  badgeCompact: {
    minHeight: 28,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  page: {
    marginTop: Space.md,
  },
  pageLabel: {
    fontWeight: '800',
    color: Colors.ink,
    marginBottom: 8,
    fontSize: 18,
  },
  fieldLabel: {
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 6,
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
  photo: {
    width: '100%',
    height: 180,
    borderRadius: Radius.sm,
    marginBottom: Space.sm,
    backgroundColor: Colors.paperSoft,
  },
});
