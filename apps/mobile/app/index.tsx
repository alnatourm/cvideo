import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, getSessionToken, type Locale, type Principal } from '../src/api';
import { AuthScreen } from '../src/auth-screen';
import { CandidateApp } from '../src/candidate-app';
import { CompanyApp } from '../src/company-app';
import { Loading, PageTitle, Screen, TopBar, colors, tx } from '../src/ui';

export default function HomeScreen() {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>('ar');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;
        const result = await api.me();
        if (active) setPrincipal(result.principal);
      } catch {
        // A missing, expired, or revoked session returns to the login screen.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function logout() {
    try { await api.logout(); } finally { setPrincipal(null); }
  }

  if (loading) return <Loading label="CVIDEO" />;
  if (!principal) return <AuthScreen locale={locale} setLocale={setLocale} onSignedIn={setPrincipal} />;
  if (principal.effectiveRole === 'candidate') {
    return <CandidateApp principal={principal} locale={locale} setLocale={setLocale} onLogout={() => void logout()} />;
  }
  if (principal.effectiveRole === 'super_admin') {
    return <AdminMobileBoundary locale={locale} setLocale={setLocale} onLogout={() => void logout()} />;
  }
  return <CompanyApp principal={principal} locale={locale} setLocale={setLocale} onLogout={() => void logout()} />;
}

function AdminMobileBoundary({ locale, setLocale, onLogout }: { locale: Locale; setLocale: (locale: Locale) => void; onLogout: () => void }) {
  return (
    <Screen>
      <TopBar locale={locale} setLocale={setLocale} right={<Pressable style={styles.logout} onPress={onLogout}><Text style={styles.logoutText}>{tx(locale, 'Logout', 'خروج')}</Text></Pressable>} />
      <PageTitle
        locale={locale}
        eyebrow={tx(locale, 'PROTECTED ADMIN', 'الإدارة المحمية')}
        title={tx(locale, 'Admin remains a dedicated web workspace', 'لوحة الإدارة تبقى مساحة ويب مخصصة')}
        body={tx(locale, 'CVIDEO mobile v1 is for candidates and company users. Administrative verification and platform controls stay behind the protected /admin web boundary.', 'تطبيق CVIDEO للهاتف في الإصدار الأول مخصص للمرشحين ومستخدمي الشركات. تبقى التحقق والإدارة والتحكم بالمنصة خلف مسار الويب المحمي /admin.')}
      />
      <View style={styles.adminCard}>
        <Text style={[styles.adminTitle, locale === 'ar' && styles.rtl]}>{tx(locale, 'No admin actions are exposed in the mobile client.', 'لا يتم عرض إجراءات الإدارة في تطبيق الهاتف.')}</Text>
        <Text style={[styles.adminBody, locale === 'ar' && styles.rtl]}>{tx(locale, 'This is intentional separation, not a missing permission check.', 'هذا فصل مقصود للواجهات وليس نقصًا في التحقق من الصلاحيات.')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  logout: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', justifyContent: 'center' },
  logoutText: { color: colors.ink, fontWeight: '800', fontSize: 11 },
  adminCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, padding: 20, borderRadius: 18, gap: 8 },
  adminTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  adminBody: { color: colors.muted, lineHeight: 21 },
});
