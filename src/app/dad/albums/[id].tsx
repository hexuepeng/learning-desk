import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AlbumPageEditor, FamilyBookBadge } from '@/components/albumUi';
import { Card, KidButton, Screen } from '@/components/ui';
import { voiceClipStatus } from '@/components/VoiceClipBar';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import {
  MIC_PERMISSION_COPY,
  clipKey,
  useParentClipRecorder,
} from '@/hooks/useParentClipRecorder';
import { FAMILY_ALBUM_LABEL } from '@/lib/album';
import { playCue } from '@/lib/playCue';
import { pickDevicePhoto, photoPermissionCopy, type PhotoSource } from '@/lib/pickAlbumPhoto';

export default function DadAlbumEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    state,
    updateAlbumBook,
    addAlbumPage,
    updateAlbumPage,
    setAlbumPageRecording,
    removeAlbumPage,
    removeAlbumBook,
  } = useDesk();
  const book = state.albumBooks.find((item) => item.id === id);
  const [adding, setAdding] = useState(false);
  const clip = useParentClipRecorder(async (target, uri) => {
    if (target.kind === 'album') await setAlbumPageRecording(target.bookId, target.pageId, uri);
  });

  const startClip = async (pageId: string) => {
    if (!book) return;
    const outcome = await clip.start({ kind: 'album', bookId: book.id, pageId });
    if (outcome === 'permission') {
      Alert.alert(MIC_PERMISSION_COPY.title, MIC_PERMISSION_COPY.body);
    } else if (outcome === 'failed') {
      Alert.alert('没录上', '请再试一次。');
    }
  };

  const stopClip = async () => {
    const hadTarget = Boolean(clip.target);
    const result = await clip.stop();
    if (!result && hadTarget) Alert.alert('没录上', '请对着麦克风再说一次。');
  };

  if (!book) {
    return (
      <Screen title={FAMILY_ALBUM_LABEL} back>
        <Text style={styles.meta}>这本书已经不在本机了。</Text>
      </Screen>
    );
  }

  const addPhoto = async (source: PhotoSource) => {
    if (adding) return;
    const result = await pickDevicePhoto(source);
    if (!result.ok) {
      if (result.reason === 'permission') {
        const copy = photoPermissionCopy(source);
        Alert.alert(copy.title, copy.body);
      }
      return;
    }
    setAdding(true);
    try {
      await addAlbumPage(book.id, { photoUri: result.uri, caption: '', captionZh: '' });
    } catch {
      Alert.alert('没加上', '照片还在这台设备上，请再试一次。');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen title={book.title} subtitle="改书名、加页、录说明。保存自动写进本机。" back>
      <FamilyBookBadge />
      <Card style={styles.block}>
        <Text style={styles.label}>书名</Text>
        <TextInput
          value={book.title}
          onChangeText={(title) => updateAlbumBook(book.id, { title })}
          style={styles.input}
        />
        <View style={styles.row}>
          <KidButton
            label={adding ? '正在保存照片…' : '从相册加一页'}
            variant="secondary"
            onPress={() => void addPhoto('library')}
            style={styles.flex}
          />
          <KidButton
            label="拍一张"
            variant="secondary"
            onPress={() => void addPhoto('camera')}
            style={styles.flex}
          />
        </View>
        <KidButton
          label="孩子怎么读"
          variant="ghost"
          onPress={() => router.push(`/english/books/${book.id}`)}
        />
      </Card>
      {book.pages.length === 0 ? (
        <Text style={styles.meta}>还没有页。从相册选，或拍一张。</Text>
      ) : (
        book.pages.map((page, index) => (
          <AlbumPageEditor
            key={page.id}
            page={page}
            index={index}
            onCaption={(caption) => updateAlbumPage(book.id, page.id, { caption })}
            onCaptionZh={(captionZh) => updateAlbumPage(book.id, page.id, { captionZh })}
            clip={{
              status: voiceClipStatus(
                page.recordingUri,
                Boolean(
                  clip.target &&
                    clipKey(clip.target) ===
                      clipKey({ kind: 'album', bookId: book.id, pageId: page.id }),
                ),
                clip.isRecording,
              ),
              disabled: Boolean(clip.target) && clip.target?.kind === 'album'
                ? clip.target.pageId !== page.id
                : Boolean(clip.target),
              elapsedMs:
                clip.target?.kind === 'album' && clip.target.pageId === page.id
                  ? clip.durationMillis
                  : 0,
              onRecord: () => void startClip(page.id),
              onStop: () => void stopClip(),
              onPreview: () => playCue(page.caption, page.recordingUri),
              onDelete: () =>
                Alert.alert('删掉这段录音？', '孩子会重新听到设备朗读这一页。', [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '删除',
                    style: 'destructive',
                    onPress: () => void setAlbumPageRecording(book.id, page.id, null),
                  },
                ]),
            }}
            onRemove={() =>
              Alert.alert('去掉这一页？', '只从这本我家的书拿走。', [
                { text: '取消', style: 'cancel' },
                {
                  text: '去掉',
                  style: 'destructive',
                  onPress: () => void removeAlbumPage(book.id, page.id),
                },
              ])
            }
          />
        ))
      )}
      <View style={{ height: Space.lg }} />
      <KidButton
        label="删除整本书"
        variant="danger"
        onPress={() =>
          Alert.alert('删除这本我家的书？', '只从这台设备拿走，不会上传。', [
            { text: '取消', style: 'cancel' },
            {
              text: '删除',
              style: 'destructive',
              onPress: () => {
                void removeAlbumBook(book.id).then(() => router.replace('/dad/albums'));
              },
            },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: Space.md,
  },
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
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Space.sm,
  },
  flex: {
    flex: 1,
  },
  meta: {
    color: Colors.muted,
    marginTop: Space.md,
    fontSize: 16,
  },
});
