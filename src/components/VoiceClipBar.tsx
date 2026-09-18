import { StyleSheet, Text, View } from 'react-native';

import { KidButton } from '@/components/ui';
import { Colors, Space } from '@/constants/theme';
import { voiceClipStatus, type VoiceClipStatus } from '@/lib/speakSource';

export { voiceClipStatus };
export type { VoiceClipStatus };

export function VoiceClipBar({
  status,
  disabled = false,
  elapsedMs = 0,
  onRecord,
  onStop,
  onPreview,
  onDelete,
}: {
  status: VoiceClipStatus;
  disabled?: boolean;
  elapsedMs?: number;
  onRecord: () => void;
  onStop: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const seconds = Math.max(1, Math.ceil(elapsedMs / 1000));

  if (status === 'recording') {
    return (
      <View style={styles.wrap} accessibilityLabel="正在录音">
        <Text style={styles.live}>正在录音… {seconds} 秒</Text>
        <Text style={styles.meta}>录音只留在这台设备上。</Text>
        <KidButton label="停止" variant="danger" onPress={onStop} />
      </View>
    );
  }

  if (status === 'ready') {
    return (
      <View style={styles.wrap} accessibilityLabel="已有爸爸的录音">
        <Text style={styles.ready}>已有爸爸的声音</Text>
        <View style={styles.row}>
          <KidButton
            label="听一下"
            variant="secondary"
            disabled={disabled}
            onPress={onPreview}
            style={styles.flex}
          />
          <KidButton
            label="重录"
            variant="secondary"
            disabled={disabled}
            onPress={onRecord}
            style={styles.flex}
          />
        </View>
        <KidButton label="删掉录音" variant="ghost" disabled={disabled} onPress={onDelete} />
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel="还没有录音">
      <Text style={styles.meta}>还没有录音，孩子会听到设备朗读。</Text>
      <KidButton label="录爸爸的发音" disabled={disabled} onPress={onRecord} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.sm,
    gap: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flex: {
    flexGrow: 1,
    flexBasis: 140,
  },
  meta: {
    color: Colors.muted,
    fontSize: 15,
  },
  ready: {
    color: Colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  live: {
    color: Colors.danger,
    fontWeight: '800',
    fontSize: 18,
  },
});
