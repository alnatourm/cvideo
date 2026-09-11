import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, type Locale, type Principal } from './api';
import { Card, Field, Notice, PrimaryButton, Screen, SecondaryButton, TopBar, colors, tx } from './ui';

type Mode = 'login' | 'candidate' | 'company';

export function AuthScreen({
  locale,
  setLocale,
  onSignedIn,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  onSignedIn: (principal: Principal) => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('JO');
  const [city, setCity] = useState('Amman');
  const [crn, setCrn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rtl = locale === 'ar';
  const message = (err: unknown) => err instanceof ApiError || err instanceof Error ? err.message : tx(locale, 'Something went wrong', 'حدث خطأ غير متوقع');

  async function login() {
    setBusy(true); setError('');
    try {
      const principal = await api.login(email.trim(), password);
      onSignedIn(principal);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setBusy(true); setError('');
    try {
      if (mode === 'candidate') {
        await api.registerCandidate({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          countryCode: countryCode.trim().toUpperCase(),
          city: city.trim(),
        });
      } else {
        await api.registerCompany({
          email: email.trim(),
          password,
          companyName: companyName.trim(),
          countryCode: countryCode.trim().toUpperCase(),
          city: city.trim(),
          commercialRegistrationNumber: crn.trim(),
        });
      }
      const principal = await api.login(email.trim(), password);
      onSignedIn(principal);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <TopBar locale={locale} setLocale={setLocale} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{tx(locale, 'REVERSE EMPLOYMENT', 'التوظيف العكسي')}</Text>
        <Text style={[styles.title, rtl && styles.rtl]}>{tx(locale, 'Meet the person before the CV.', 'تعرّف على الشخص قبل السيرة الذاتية.')}</Text>
        <Text style={[styles.body, rtl && styles.rtl]}>{tx(locale, 'Candidates publish a 30-second professional introduction. Companies search, watch, save, chat and request interviews.', 'ينشر المرشح فيديو تعريفيًا مهنيًا مدته 30 ثانية. تبحث الشركات وتشاهد وتحفظ وتتواصل وتطلب المقابلات.')}</Text>
      </View>

      <Card>
        <View style={styles.modeRow}>
          {(['login', 'candidate', 'company'] as const).map((item) => (
            <Pressable key={item} onPress={() => { setMode(item); setError(''); }} style={[styles.mode, mode === item && styles.modeActive]}>
              <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                {item === 'login' ? tx(locale, 'Login', 'دخول') : item === 'candidate' ? tx(locale, 'Candidate', 'مرشح') : tx(locale, 'Company', 'شركة')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={[styles.formTitle, rtl && styles.rtl]}>
            {mode === 'login' ? tx(locale, 'Welcome back', 'مرحبًا بعودتك') : mode === 'candidate' ? tx(locale, 'Create candidate profile', 'إنشاء ملف مرشح') : tx(locale, 'Create company account', 'إنشاء حساب شركة')}
          </Text>
          <Notice locale={locale} message={error} />
          {mode === 'candidate' ? <Field locale={locale} label={tx(locale, 'Full name', 'الاسم الكامل')} value={displayName} onChangeText={setDisplayName} /> : null}
          {mode === 'company' ? <Field locale={locale} label={tx(locale, 'Company name', 'اسم الشركة')} value={companyName} onChangeText={setCompanyName} /> : null}
          <Field locale={locale} label={tx(locale, 'Email', 'البريد الإلكتروني')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field locale={locale} label={tx(locale, 'Password', 'كلمة المرور')} value={password} onChangeText={setPassword} secureTextEntry />
          {mode !== 'login' ? (
            <View style={styles.twoCol}>
              <View style={styles.flex}><Field locale={locale} label={tx(locale, 'Country code', 'رمز الدولة')} value={countryCode} onChangeText={setCountryCode} autoCapitalize="characters" maxLength={2} /></View>
              <View style={styles.flex}><Field locale={locale} label={tx(locale, 'City', 'المدينة')} value={city} onChangeText={setCity} /></View>
            </View>
          ) : null}
          {mode === 'company' ? <Field locale={locale} label={tx(locale, 'Commercial Registration Number', 'رقم السجل التجاري')} value={crn} onChangeText={setCrn} /> : null}
          {mode === 'login'
            ? <PrimaryButton label={busy ? tx(locale, 'Signing in…', 'جاري الدخول…') : tx(locale, 'Continue', 'متابعة')} onPress={() => void login()} disabled={busy || !email || !password} />
            : <PrimaryButton label={busy ? tx(locale, 'Creating account…', 'جاري إنشاء الحساب…') : tx(locale, 'Create account', 'إنشاء الحساب')} onPress={() => void register()} disabled={busy || !email || !password} />}
          {mode !== 'login' ? <SecondaryButton label={tx(locale, 'I already have an account', 'لدي حساب بالفعل')} onPress={() => setMode('login')} /> : null}
        </View>
      </Card>
      <Text style={[styles.note, rtl && styles.rtl]}>{tx(locale, 'Candidates never browse vacancies or apply. Companies discover candidates and initiate contact.', 'المرشحون لا يتصفحون الوظائف ولا يقدمون طلبات. الشركات تكتشف المرشحين وتبدأ التواصل.')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  hero: { gap: 8, paddingVertical: 18 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 38, lineHeight: 42, fontWeight: '900', letterSpacing: -1.2 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  modeRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 13, padding: 4, gap: 4 },
  mode: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeActive: { backgroundColor: '#FFF' },
  modeText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  modeTextActive: { color: colors.blue },
  form: { gap: 14, marginTop: 8 },
  formTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginBottom: 2 },
  twoCol: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  note: { color: colors.muted, lineHeight: 19, fontSize: 12, textAlign: 'center', paddingHorizontal: 12 },
});