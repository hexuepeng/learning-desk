import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';

import { FamilyBookBadge } from '@/components/albumUi';
import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton, Screen } from '@/components/ui';
import { MINI_BOOKS } from '@/content/miniBooks';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';
import { useLayout } from '@/hooks/useLayout';
import { FAMILY_ALBUM_LABEL } from '@/lib/album';
import { displayAlbumPhotoUri } from '@/lib/albumFiles';

export default function BookReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useDesk();
  const { isTablet, isLandscape, compact, titleSize, bodySize } = useLayout();
  const photoHeight = isLandscape ? (isTablet ? 220 : 160) : isTablet ? 360 : 280;
  const pageText = { en: isTablet ? Math.min(titleSize, 32) : 28, zh: bodySize };
  const bundled = MINI_BOOKS.find((book) => book.id === id);
  const album = state.albumBooks.find((book) => book.id === id);
  const [page, setPage] = useState(0);

  if (bundled) {
    const current = bundled.pages[Math.min(page, bundled.pages.length - 1)];
    return (
      <Screen title={bundled.titleZh} subtitle={bundled.titleEn} back>
        <Card>
          <SwipePage page={page} total={bundled.pages.length} onChange={setPage}>
            <View style={isLandscape && isTablet ? styles.landPage : undefined}>
              <Text style={[styles.art, compact && styles.artCompact]}>{current.art}</Text>
              <View style={styles.pageCopy}>
                <Text style={[styles.en, { fontSize: pageText.en }]}>{current.en}</Text>
                <Text style={[styles.zh, { fontSize: pageText.zh }]}>{current.zh}</Text>
              </View>
            </View>
          </SwipePage>
          <SpeakButton text={current.en} />
          <Pager page={page} total={bundled.pages.length} onChange={setPage} />
        </Card>
      </Screen>
    );
  }

  if (album) {
    const current = album.pages[Math.min(page, Math.max(album.pages.length - 1, 0))];
    if (!current) {
      return (
        <Screen title={album.title} back>
          <FamilyBookBadge />
          <Text style={[styles.zh, { marginTop: Space.md }]}>这本还没有页。请爸爸加照片。</Text>
        </Screen>
      );
    }
    return (
      <Screen title={album.title} subtitle={`${FAMILY_ALBUM_LABEL} · 仅本机`} back>
        <Card>
          <FamilyBookBadge />
          <SwipePage page={page} total={album.pages.length} onChange={setPage}>
            <View style={isLandscape && isTablet ? styles.landPage : undefined}>
              <Image
                source={{ uri: displayAlbumPhotoUri(current.photoUri) }}
                style={[styles.photo, { height: photoHeight }, isLandscape && isTablet && styles.photoLand]}
                accessibilityLabel={`${album.title} 第 ${page + 1} 页`}
              />
              <View style={styles.pageCopy}>
                <Text style={[styles.en, { fontSize: pageText.en }]}>
                  {current.caption || '（还没有说明）'}
                </Text>
                {current.captionZh ? (
                  <Text style={[styles.zh, { fontSize: pageText.zh }]}>{current.captionZh}</Text>
                ) : null}
              </View>
            </View>
          </SwipePage>
          {current.caption || current.recordingUri ? (
            <SpeakButton text={current.caption} recordingUri={current.recordingUri} />
          ) : null}
          <Pager page={page} total={album.pages.length} onChange={setPage} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="绘本" back>
      <Text style={styles.zh}>找不到这一本。</Text>
    </Screen>
  );
}

function SwipePage({
  page,
  total,
  onChange,
  children,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  children: ReactNode;
}) {
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -48 && page < total - 1) onChange(page + 1);
          else if (gesture.dx > 48 && page > 0) onChange(page - 1);
        },
      }),
    [page, total, onChange],
  );

  return <View {...pan.panHandlers}>{children}</View>;
}

function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <View style={styles.pager}>
      <KidButton
        label="上一页"
        variant="secondary"
        disabled={page === 0}
        onPress={() => onChange(page - 1)}
        style={styles.flex}
      />
      <Text style={styles.pageNum}>
        {page + 1}/{total}
      </Text>
      <KidButton
        label="下一页"
        disabled={page >= total - 1}
        onPress={() => onChange(page + 1)}
        style={styles.flex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: Space.md,
  },
  en: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: Space.sm,
  },
  zh: {
    fontSize: 18,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Space.md,
  },
  landPage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
  },
  pageCopy: {
    flex: 1,
  },
  artCompact: {
    fontSize: 48,
    marginBottom: 0,
  },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: Radius.md,
    marginTop: Space.md,
    marginBottom: Space.md,
    backgroundColor: Colors.paperSoft,
  },
  photoLand: {
    width: '48%',
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Space.md,
  },
  flex: {
    flex: 1,
  },
  pageNum: {
    fontWeight: '800',
    color: Colors.ink,
  },
});
