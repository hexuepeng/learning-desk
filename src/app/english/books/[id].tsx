import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { SpeakButton } from '@/components/SpeakButton';
import { Card, KidButton, Screen } from '@/components/ui';
import { MINI_BOOKS } from '@/content/miniBooks';
import { Colors, Radius, Space } from '@/constants/theme';
import { useDesk } from '@/hooks/useDesk';

export default function BookReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useDesk();
  const bundled = MINI_BOOKS.find((book) => book.id === id);
  const album = state.albumBooks.find((book) => book.id === id);
  const [page, setPage] = useState(0);

  if (bundled) {
    const current = bundled.pages[page];
    return (
      <Screen title={bundled.titleZh} subtitle={bundled.titleEn} back>
        <Card>
          <Text style={styles.art}>{current.art}</Text>
          <Text style={styles.en}>{current.en}</Text>
          <Text style={styles.zh}>{current.zh}</Text>
          <SpeakButton text={current.en} />
          <Pager page={page} total={bundled.pages.length} onChange={setPage} />
        </Card>
      </Screen>
    );
  }

  if (album) {
    const current = album.pages[page];
    if (!current) {
      return (
        <Screen title={album.title} back>
          <Text style={styles.zh}>这本还没有页。</Text>
        </Screen>
      );
    }
    return (
      <Screen title={album.title} subtitle="家庭相册书 · 仅本机" back>
        <Card>
          <Image source={{ uri: current.photoUri }} style={styles.photo} />
          <Text style={styles.en}>{current.caption || '（还没有说明）'}</Text>
          {current.caption ? <SpeakButton text={current.caption} /> : null}
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
  },
  zh: {
    fontSize: 18,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Space.md,
  },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: Radius.md,
    marginBottom: Space.md,
    backgroundColor: Colors.paperSoft,
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
