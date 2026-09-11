import { type ReactNode, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Locale } from './api';

export const colors = {
  navy: '#0B132B',
  navy2: '#111C3F',
  blue: '#2563EB',
  cyan: '#22D3EE',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  soft: '#F6F8FC',
  white: '#FFFFFF',
  success: '#047857',
  danger: '#B91C1C',
  warning: '#C2410C',
};

export function tx(locale: Locale, en: string, ar: string) {
  return locale === 'ar' ? ar : en;
}

export function Screen({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <SafeAreaView style={[styles.safe, dark && styles.safeDark]}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function TopBar({
  locale,
  setLocale,
  right,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>C</Text></View><Text style={styles.brand}>VIDEO</Text></View>
      <View style={styles.topActions}>
        {right}
        <Pressable style={styles.ghostSmall} onPress={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.ghostSmallText}>{locale === 'ar' ? 'EN' : 'AR'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PageTitle({ locale, eyebrow, title, body }: { locale: Locale; eyebrow: string; title: string; body?: string }) {
  return (
    <View style={[styles.pageTitle, locale === 'ar' && styles.rtl]}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Metric({ label, value, locale }: { label: string; value: string; locale: Locale }) {
  return (
    <Card style={styles.metric}>
      <Text style={[styles.metricLabel, locale === 'ar' && styles.rtl]}>{label}</Text>
      <Text style={[styles.metricValue, locale === 'ar' && styles.rtl]} numberOfLines={2}>{value}</Text>
    </Card>
  );
}

export function Field({ label, locale, ...props }: TextInputProps & { label: string; locale: Locale }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, locale === 'ar' && styles.rtl]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#94A3B8"
        style={[styles.input, locale === 'ar' && styles.inputRtl, props.multiline && styles.multiline]}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.primary, (pressed || disabled) && styles.dim]} onPress={onPress}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} style={({ pressed }) => [styles.secondary, (pressed || disabled) && styles.dim]} onPress={onPress}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ message, type = 'error', locale }: { message: string; type?: 'error' | 'success'; locale: Locale }) {
  if (!message) return null;
  return (
    <View style={[styles.notice, type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
      <Text style={[type === 'success' ? styles.noticeSuccessText : styles.noticeErrorText, locale === 'ar' && styles.rtl]}>{message}</Text>
    </View>
  );
}

export function Loading({ label = 'CVIDEO' }: { label?: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator color={colors.blue} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </SafeAreaView>
  );
}

export type TabItem<T extends string> = { key: T; label: string; icon: string };
export function BottomTabs<T extends string>({ items, active, onChange }: { items: Array<TabItem<T>>; active: T; onChange: (tab: T) => void }) {
  return (
    <View style={styles.tabs}>
      {items.map((item) => (
        <Pressable key={item.key} style={[styles.tab, active === item.key && styles.tabActive]} onPress={() => onChange(item.key)}>
          <Text style={[styles.tabIcon, active === item.key && styles.tabTextActive]}>{item.icon}</Text>
          <Text style={[styles.tabText, active === item.key && styles.tabTextActive]} numberOfLines={1}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function NativeVideo({ uri, poster, tall = false }: { uri: string; poster?: string | null; tall?: boolean }) {
  const player = useVideoPlayer({ uri, contentType: 'hls' }, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    void player.replaceAsync({ uri, contentType: 'hls' });
  }, [player, uri]);

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      style={[styles.video, tall && styles.videoTall]}
    />
  );
}

export function StatusPill({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const success = lower === 'ready' || lower === 'accepted' || lower === 'active';
  const danger = ['declined', 'rejected', 'failed', 'cancelled'].includes(lower);
  return (
    <View style={[styles.status, success && styles.statusSuccess, danger && styles.statusDanger]}>
      <Text style={[styles.statusText, success && styles.statusSuccessText, danger && styles.statusDangerText]}>{value.replaceAll('_', ' ')}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.soft },
  safeDark: { backgroundColor: colors.navy },
  screen: { padding: 18, paddingBottom: 112, gap: 16 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandMark: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFF', fontWeight: '900' },
  brand: { color: colors.navy, fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghostSmall: { minWidth: 40, minHeight: 36, borderWidth: 1, borderColor: colors.line, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, backgroundColor: '#FFF' },
  ghostSmallText: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  pageTitle: { gap: 7, paddingTop: 4 },
  eyebrow: { color: colors.blue, fontWeight: '900', letterSpacing: 1.3, fontSize: 11 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 35, fontWeight: '900', letterSpacing: -.7 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 17, borderWidth: 1, borderColor: colors.line, gap: 10 },
  metric: { flex: 1, minWidth: 145 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  field: { gap: 7 },
  label: { color: '#334155', fontSize: 13, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFF', paddingHorizontal: 13, color: colors.ink, fontSize: 15 },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  primary: { minHeight: 49, paddingHorizontal: 18, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  secondary: { minHeight: 49, paddingHorizontal: 18, borderRadius: 13, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.ink, fontWeight: '850', fontSize: 14 },
  dim: { opacity: .55 },
  notice: { padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  noticeErrorText: { color: '#991B1B', fontWeight: '700' },
  noticeSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  noticeSuccessText: { color: '#065F46', fontWeight: '700' },
  loading: { flex: 1, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontWeight: '800' },
  tabs: { position: 'absolute', left: 10, right: 10, bottom: 8, minHeight: 68, flexDirection: 'row', alignItems: 'stretch', gap: 4, backgroundColor: 'rgba(11,19,43,.98)', borderRadius: 20, padding: 7 },
  tab: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  tabActive: { backgroundColor: 'rgba(37,99,235,.30)' },
  tabIcon: { color: '#94A3B8', fontSize: 16 },
  tabText: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  tabTextActive: { color: '#FFF' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 17, backgroundColor: '#020617' },
  videoTall: { aspectRatio: 9 / 16, minHeight: 500 },
  status: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#EEF2FF' },
  statusText: { color: '#3730A3', textTransform: 'uppercase', fontSize: 10, fontWeight: '900' },
  statusSuccess: { backgroundColor: '#ECFDF5' },
  statusSuccessText: { color: colors.success },
  statusDanger: { backgroundColor: '#FEF2F2' },
  statusDangerText: { color: colors.danger },
});
