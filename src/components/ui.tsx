import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MIN_TAP, Radius, Space } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';

export function Screen({
  children,
  title,
  subtitle,
  back = false,
  right,
  scroll = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
}) {
  const { maxWidth, titleSize, bodySize, pad, compact } = useLayout();
  const inner = (
    <View style={[styles.inner, { maxWidth }, !scroll && styles.fill]}>
      {(title || back) && (
        <View style={[styles.header, compact && styles.headerCompact]}>
          {back ? (
            <KidButton label="返回" variant="ghost" onPress={() => router.back()} compact />
          ) : (
            <View />
          )}
          {right}
        </View>
      )}
      {title ? (
        <Text style={[styles.title, { fontSize: titleSize, marginBottom: compact ? 4 : 6 }]}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            { fontSize: bodySize, lineHeight: Math.round(bodySize * 1.4), marginBottom: compact ? 10 : Space.md },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: pad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, styles.fill, { paddingHorizontal: pad }]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function KidButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dad' | 'success' | 'danger';
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { tap, buttonLabelSize } = useLayout();
  const palette = {
    primary: { bg: Colors.primary, fg: Colors.primaryInk },
    secondary: { bg: Colors.paperSoft, fg: Colors.ink },
    ghost: { bg: 'transparent', fg: Colors.ink },
    dad: { bg: Colors.dad, fg: '#fff' },
    success: { bg: Colors.success, fg: '#fff' },
    danger: { bg: Colors.danger, fg: '#fff' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: compact ? 48 : tap,
          backgroundColor: palette.bg,
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
          borderWidth: variant === 'ghost' ? 2 : 0,
          borderColor: Colors.line,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: palette.fg, fontSize: buttonLabelSize }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = '搜索',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.search}
    />
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function LoadingScreen() {
  return (
    <SafeAreaView style={[styles.safe, styles.center]}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={[styles.subtitle, { marginTop: Space.md }]}>正在打开学习台…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Space.md,
    paddingBottom: Space.xl,
  },
  fill: {
    flex: 1,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  search: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    fontSize: 17,
    color: Colors.ink,
    backgroundColor: Colors.paper,
    marginBottom: Space.sm,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.muted,
    marginTop: Space.sm,
    marginBottom: 6,
  },
  header: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.xs,
  },
  headerCompact: {
    minHeight: 48,
    marginBottom: 0,
  },
  title: {
    color: Colors.ink,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: Space.md,
  },
  button: {
    minHeight: MIN_TAP,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.paper,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.line,
  },
});
