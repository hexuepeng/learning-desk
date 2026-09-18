import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AlbumPageEditor } from '@/components/albumUi';
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
import { createId } from '@/lib/util';
import type { AlbumPage } from '@/types/models';

const DRAFT_BOOK = 'draft';

export default function NewAlbumBook() {
  const { addAlbumBook } = useDesk();
  const [title, setTitle] = useState('我家的一天');
  const [pages, setPages] = useState<AlbumPage[]>([]);
  const [saving, setSaving] = useState(false);
  const clip = useParentClipRecorder((target, uri) => {
    if (target.kind !== 'album') return;
    setPages((current) =>
      current.map((item) => (item.id === target.pageId ? { ...item, recordingUri: uri } : item)),
    );
  });

  const startClip = async (pageId: string) => {
    const outcome = await clip.start({ kind: 'album', bookId: DRAFT_BOOK, pageId });
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

  const addPhoto = async (source: PhotoSource) => {
    const result = await pickDevicePhoto(source);
    if (!result.ok) {
      if (result.reason === 'permission') {
        const copy = photoPermissionCopy(source);
        Alert.alert(copy.title, copy.body);
      }
      return;
    }
    setPages((current) => [
      ...current,
      { id: createId('page'), photoUri: result.uri, caption: '', captionZh: '' },
    ]);
  };

  const save = async () => {
    if (saving) return;
    if (pages.length === 0) {
      Alert.alert('先加一页', '至少选一张或拍一张照片。');
      return;
    }
    setSaving(true);
    try {
      const id = await addAlbumBook({ title, pages });
      router.replace(`/english/books/${id}`);
    } catch {
      Alert.alert('没做成', '照片还在这台设备上，请再试一次。');
      setSaving(false);
    }
  };

  return (
    <Screen title="做一本相册书" subtitle="照片和说明只保存在本机，不会上传。" back>
      <Card>
        <Text style={styles.label}>书名</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />
        <View style={styles.row}>
          <KidButton
            label="从相册加一页"
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
        <Text style={styles.hint}>做成后孩子会在绘本里看到「{FAMILY_ALBUM_LABEL}」。</Text>
      </Card>
      {pages.map((page, index) => (
        <AlbumPageEditor
          key={page.id}
          page={page}
          index={index}
          onCaption={(caption) =>
            setPages((current) =>
              current.map((item) => (item.id === page.id ? { ...item, caption } : item)),
            )
          }
          onCaptionZh={(captionZh) =>
            setPages((current) =>
              current.map((item) => (item.id === page.id ? { ...item, captionZh } : item)),
            )
          }
          clip={{
            status: voiceClipStatus(
              page.recordingUri,
              Boolean(
                clip.target &&
                  clipKey(clip.target) ===
                    clipKey({ kind: 'album', bookId: DRAFT_BOOK, pageId: page.id }),
              ),
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
              setPages((current) =>
                current.map((item) =>
                  item.id === page.id ? { ...item, recordingUri: null } : item,
                ),
              ),
          }}
          onRemove={() => setPages((current) => current.filter((item) => item.id !== page.id))}
        />
      ))}
      <View style={{ height: Space.md }} />
      <KidButton label={saving ? '正在保存到本机…' : '做成绘本'} onPress={() => void save()} />
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  hint: {
    color: Colors.muted,
    marginTop: Space.sm,
    fontSize: 15,
  },
});
