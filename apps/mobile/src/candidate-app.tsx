import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  api,
  ApiError,
  type CandidateProfile,
  type CandidateVideo,
  type Interview,
  type Locale,
  type Principal,
  type TaxonomyItem,
} from './api';
import { MessagesPanel } from './messages-panel';
import {
  BottomTabs,
  Card,
  Field,
  Metric,
  NativeVideo,
  Notice,
  PageTitle,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusPill,
  TopBar,
  colors,
  tx,
} from './ui';
import { prepareVideoAsset } from './video-upload';

type Tab = 'home' | 'messages' | 'profile';

function errorMessage(locale: Locale, err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : tx(locale, 'Something went wrong', 'حدث خطأ غير متوقع');
}

function ChoiceChips({
  locale,
  items,
  selected,
  max,
  onChange,
}: {
  locale: Locale;
  items: TaxonomyItem[];
  selected: string[];
  max: number;
  onChange: (ids: string[]) => void;
}) {
  const label = (item: TaxonomyItem) => locale === 'ar' ? item.nameAr : item.nameEn;
  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    else if (selected.length < max) onChange([...selected, id]);
  }
  return (
    <View style={styles.chips}>
      {items.map((item) => {
        const active = selected.includes(item.id);
        return <Pressable key={item.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggle(item.id)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label(item)}</Text></Pressable>;
      })}
    </View>
  );
}

export function CandidateApp({
  principal,
  locale,
  setLocale,
  onLogout,
}: {
  principal: Principal;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [completeness, setCompleteness] = useState(0);
  const [discoverable, setDiscoverable] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyItem[]>([]);
  const [roles, setRoles] = useState<TaxonomyItem[]>([]);
  const [skills, setSkills] = useState<TaxonomyItem[]>([]);
  const [languages, setLanguages] = useState<TaxonomyItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const rtl = locale === 'ar';

  const tabs = useMemo(() => [
    { key: 'home' as const, label: tx(locale, 'Home', 'الرئيسية'), icon: '⌂' },
    { key: 'messages' as const, label: tx(locale, 'Messages', 'الرسائل'), icon: '✉' },
    { key: 'profile' as const, label: tx(locale, 'Profile', 'الملف'), icon: '●' },
  ], [locale]);

  async function load() {
    setError('');
    try {
      const [nextProfile, nextVideo, nextCompleteness, visibility, nextInterviews, nextCategories, nextRoles, nextSkills, nextLanguages] = await Promise.all([
        api.candidateProfile(),
        api.candidateVideo(),
        api.completeness(),
        api.visibility(),
        api.candidateInterviews(),
        api.categories(),
        api.jobTitles(),
        api.skills(),
        api.languages(),
      ]);
      setProfile(nextProfile);
      setVideo(nextVideo);
      setCompleteness(nextCompleteness.percent);
      setDiscoverable(visibility.discoverable);
      setInterviews(nextInterviews);
      setCategories(nextCategories);
      setRoles(nextRoles.slice(0, 80));
      setSkills(nextSkills.slice(0, 120));
      setLanguages(nextLanguages);
      if (nextProfile.primaryCategoryId) setSubcategories(await api.subcategories(nextProfile.primaryCategoryId));
    } catch (err) {
      setError(errorMessage(locale, err));
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (video?.status !== 'processing' && video?.status !== 'uploading') return;
    const timer = setInterval(() => { void refreshVideo(true); }, 6000);
    return () => clearInterval(timer);
  }, [video?.status, video?.id]);

  async function refreshVideo(silent = false) {
    if (!silent) { setBusy('video'); setError(''); }
    try {
      const updated = await api.syncCandidateVideo();
      setVideo(updated);
      if (updated.status === 'ready') setNotice(tx(locale, 'Your Introduction Video is ready.', 'الفيديو التعريفي جاهز.'));
      if (updated.status === 'rejected' || updated.status === 'failed') setError(updated.failureReason ?? tx(locale, 'Video processing failed.', 'فشلت معالجة الفيديو.'));
    } catch (err) {
      if (!silent) setError(errorMessage(locale, err));
    } finally {
      if (!silent) setBusy('');
    }
  }

  async function chooseVideo(source: 'camera' | 'library') {
    setError(''); setNotice('');
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(tx(locale, 'Permission is required to choose or record your Introduction Video.', 'يلزم السماح لاختيار أو تسجيل الفيديو التعريفي.'));

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: 30,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;

      const selected = prepareVideoAsset(result.assets[0]);
      setBusy('video');
      const started = await api.startCandidateVideo({
        filename: selected.filename,
        mimeType: selected.mimeType,
        sizeBytes: selected.sizeBytes,
        durationSeconds: selected.durationSeconds,
        height: selected.resolution,
      });
      setVideo(started);
      const processing = await api.uploadCandidateVideo(selected.uri, selected.mimeType, selected.sizeBytes);
      setVideo(processing);
      setNotice(tx(locale, 'Upload complete. Your video is processing.', 'اكتمل الرفع. الفيديو قيد المعالجة.'));
    } catch (err) {
      setError(errorMessage(locale, err));
    } finally {
      setBusy('');
    }
  }

  function confirmDeleteVideo() {
    Alert.alert(
      tx(locale, 'Delete Introduction Video?', 'حذف الفيديو التعريفي؟'),
      tx(locale, 'Your profile will stop being discoverable until a new video is ready.', 'سيتوقف ظهور ملفك حتى يصبح فيديو جديد جاهزًا.'),
      [
        { text: tx(locale, 'Cancel', 'إلغاء'), style: 'cancel' },
        { text: tx(locale, 'Delete', 'حذف'), style: 'destructive', onPress: () => { void deleteVideo(); } },
      ],
    );
  }

  async function deleteVideo() {
    setBusy('video'); setError(''); setNotice('');
    try {
      await api.deleteCandidateVideo();
      setVideo(null);
      setDiscoverable(false);
      setNotice(tx(locale, 'Introduction Video deleted.', 'تم حذف الفيديو التعريفي.'));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function toggleDiscovery() {
    setBusy('visibility'); setError(''); setNotice('');
    try {
      const result = await api.setVisibility(!discoverable);
      setDiscoverable(result.discoverable);
      setNotice(result.discoverable ? tx(locale, 'Your profile is now discoverable by company users.', 'أصبح ملفك الآن قابلاً للاكتشاف من مستخدمي الشركات.') : tx(locale, 'Discovery is off.', 'تم إيقاف الظهور في البحث.'));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function respond(id: string, action: 'accept' | 'decline') {
    setBusy(id); setError('');
    try {
      const updated = action === 'accept' ? await api.acceptInterview(id) : await api.declineInterview(id);
      setInterviews((current) => current.map((item) => item.id === id ? updated : item));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function chooseCategory(id: string) {
    if (!profile) return;
    setProfile({ ...profile, primaryCategoryId: id, primarySubcategoryId: null });
    setSubcategories(id ? await api.subcategories(id) : []);
  }

  async function saveProfile() {
    if (!profile) return;
    setBusy('profile'); setError(''); setNotice('');
    try {
      const updated = await api.updateCandidateProfile({
        displayName: profile.displayName,
        headline: profile.headline,
        countryCode: profile.countryCode,
        city: profile.city,
        primaryCategoryId: profile.primaryCategoryId,
        primarySubcategoryId: profile.primarySubcategoryId,
        extraSubfieldIds: profile.extraSubfieldIds,
        preferredRoleIds: profile.preferredRoleIds,
        skillIds: profile.skillIds,
        languageIds: profile.languageIds,
        yearsExperience: profile.yearsExperience,
        professionalSummary: profile.professionalSummary,
      });
      setProfile(updated);
      const value = await api.completeness();
      setCompleteness(value.percent);
      setNotice(tx(locale, 'Profile saved.', 'تم حفظ الملف.'));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  const logoutButton = <Pressable style={styles.logout} onPress={onLogout}><Text style={styles.logoutText}>{tx(locale, 'Logout', 'خروج')}</Text></Pressable>;

  return (
    <View style={styles.root}>
      <Screen>
        <TopBar locale={locale} setLocale={setLocale} right={logoutButton} />
        <Notice locale={locale} message={error} />
        <Notice locale={locale} message={notice} type="success" />

        {tab === 'home' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'CANDIDATE', 'مرشح')} title={tx(locale, 'Your professional story', 'قصتك المهنية')} body={tx(locale, 'Publish a complete profile and let companies find you. There is no Apply button in CVIDEO.', 'انشر ملفًا مهنيًا مكتملًا ودع الشركات تجدك. لا يوجد زر تقديم في CVIDEO.')} />
            <View style={styles.metrics}>
              <Metric locale={locale} label={tx(locale, 'Profile', 'اكتمال الملف')} value={`${completeness}%`} />
              <Metric locale={locale} label={tx(locale, 'Video', 'الفيديو')} value={video?.status ?? tx(locale, 'Missing', 'غير موجود')} />
            </View>
            <Card>
              <View style={styles.cardHead}><View style={styles.flex}><Text style={[styles.eyebrow, rtl && styles.rtl]}>{tx(locale, '30s INTRODUCTION VIDEO', 'فيديو تعريفي 30 ثانية')}</Text><Text style={[styles.cardTitle, rtl && styles.rtl]}>{tx(locale, 'Your first impression', 'انطباعك الأول')}</Text></View><StatusPill value={video?.status ?? 'missing'} /></View>
              {video?.status === 'ready' && video.playbackUrl ? <NativeVideo uri={video.playbackUrl} poster={video.thumbnailUrl} /> : <View style={styles.videoEmpty}><Text style={styles.videoNumber}>30</Text><Text style={styles.videoEmptyText}>{tx(locale, 'seconds maximum', 'ثانية كحد أقصى')}</Text><Text style={styles.videoHint}>{video?.status === 'processing' || video?.status === 'uploading' ? tx(locale, 'Upload received. Bunny Stream is preparing secure playback.', 'تم استلام الفيديو. يجري تجهيز التشغيل الآمن.') : tx(locale, 'Record now or choose an MP4, MOV, or WebM video at 720p or lower.', 'سجّل الآن أو اختر فيديو MP4 أو MOV أو WebM بدقة 720p أو أقل.')}</Text></View>}
              <View style={styles.videoActions}>
                <View style={styles.flex}><PrimaryButton label={busy === 'video' ? tx(locale, 'Working…', 'جاري التنفيذ…') : tx(locale, 'Record video', 'تسجيل فيديو')} onPress={() => void chooseVideo('camera')} disabled={busy === 'video'} /></View>
                <View style={styles.flex}><SecondaryButton label={tx(locale, video ? 'Replace' : 'Choose video', video ? 'استبدال' : 'اختيار فيديو')} onPress={() => void chooseVideo('library')} disabled={busy === 'video'} /></View>
              </View>
              {video?.status === 'processing' || video?.status === 'uploading' ? <SecondaryButton label={tx(locale, 'Check processing', 'فحص المعالجة')} onPress={() => void refreshVideo()} disabled={busy === 'video'} /> : null}
              {video ? <Pressable style={styles.deleteVideo} onPress={confirmDeleteVideo} disabled={busy === 'video'}><Text style={styles.deleteVideoText}>{tx(locale, 'Delete Introduction Video', 'حذف الفيديو التعريفي')}</Text></Pressable> : null}
            </Card>
            <Card>
              <Text style={[styles.eyebrow, rtl && styles.rtl]}>{tx(locale, 'DISCOVERY', 'الظهور في البحث')}</Text>
              <Text style={[styles.cardTitle, rtl && styles.rtl]}>{discoverable ? tx(locale, 'Companies can discover you', 'يمكن للشركات اكتشافك') : tx(locale, 'Your profile is private', 'ملفك غير ظاهر')}</Text>
              <Text style={[styles.body, rtl && styles.rtl]}>{tx(locale, 'A ready video, category, preferred role and skill are required before discovery can be enabled.', 'يلزم فيديو جاهز ومجال ودور مفضل ومهارة قبل تفعيل الظهور في البحث.')}</Text>
              <PrimaryButton label={busy === 'visibility' ? tx(locale, 'Updating…', 'جاري التحديث…') : discoverable ? tx(locale, 'Turn discovery off', 'إيقاف الظهور') : tx(locale, 'Enable discovery', 'تفعيل الظهور')} onPress={() => void toggleDiscovery()} disabled={busy === 'visibility'} />
            </Card>
            <Card>
              <Text style={[styles.cardTitle, rtl && styles.rtl]}>{tx(locale, 'Interview requests', 'طلبات المقابلة')}</Text>
              {interviews.length === 0 ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'No interview requests yet.', 'لا توجد طلبات مقابلة بعد.')}</Text> : interviews.slice(0, 8).map((item) => (
                <View key={item.id} style={styles.interview}>
                  <View style={styles.flex}><StatusPill value={item.status} /><Text style={[styles.interviewTitle, rtl && styles.rtl]}>{item.opportunityTitle}</Text><Text style={[styles.meta, rtl && styles.rtl]}>{new Date(item.startsAtUtc).toLocaleString()} · {item.durationMinutes} min</Text>{item.meetingJoinUrl ? <Text style={[styles.link, rtl && styles.rtl]}>{item.meetingJoinUrl}</Text> : null}</View>
                  {item.status === 'pending' ? <View style={styles.actions}><SecondaryButton label={tx(locale, 'Decline', 'رفض')} onPress={() => void respond(item.id, 'decline')} disabled={busy === item.id} /><PrimaryButton label={tx(locale, 'Accept', 'قبول')} onPress={() => void respond(item.id, 'accept')} disabled={busy === item.id} /></View> : null}
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {tab === 'messages' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'MESSAGES', 'الرسائل')} title={tx(locale, 'Company conversations', 'محادثات الشركات')} body={tx(locale, 'You can reply after a company initiates contact.', 'يمكنك الرد بعد أن تبدأ الشركة التواصل.')} />
            <MessagesPanel locale={locale} principal={principal} />
          </>
        ) : null}

        {tab === 'profile' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'PROFILE', 'الملف الشخصي')} title={tx(locale, 'Build the profile companies discover', 'ابنِ الملف الذي ستكتشفه الشركات')} body={tx(locale, 'The Introduction Video is the hero. Professional evidence supports it.', 'الفيديو التعريفي هو العنصر الرئيسي، والتفاصيل المهنية تدعمه.')} />
            {!profile ? <Text style={styles.empty}>{tx(locale, 'Loading profile…', 'جاري تحميل الملف…')}</Text> : (
              <Card>
                <Field locale={locale} label={tx(locale, 'Name', 'الاسم')} value={profile.displayName} onChangeText={(displayName) => setProfile({ ...profile, displayName })} />
                <Field locale={locale} label={tx(locale, 'Professional headline', 'المسمى المهني')} value={profile.headline ?? ''} onChangeText={(headline) => setProfile({ ...profile, headline: headline || null })} />
                <View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Country', 'الدولة')} value={profile.countryCode} maxLength={2} autoCapitalize="characters" onChangeText={(countryCode) => setProfile({ ...profile, countryCode: countryCode.toUpperCase() })} /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'City', 'المدينة')} value={profile.city} onChangeText={(city) => setProfile({ ...profile, city })} /></View></View>
                <Field locale={locale} label={tx(locale, 'Years of experience', 'سنوات الخبرة')} value={String(profile.yearsExperience)} keyboardType="number-pad" onChangeText={(value) => setProfile({ ...profile, yearsExperience: Math.max(0, Math.min(80, Number(value) || 0)) })} />
                <Field locale={locale} label={tx(locale, 'Professional summary', 'الملخص المهني')} value={profile.professionalSummary ?? ''} multiline onChangeText={(professionalSummary) => setProfile({ ...profile, professionalSummary: professionalSummary || null })} />

                <Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Main field', 'المجال الرئيسي')}</Text>
                <ChoiceChips locale={locale} items={categories} selected={profile.primaryCategoryId ? [profile.primaryCategoryId] : []} max={1} onChange={(ids) => void chooseCategory(ids[0] ?? '')} />
                <Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Specialization', 'التخصص')}</Text>
                <ChoiceChips locale={locale} items={subcategories} selected={profile.primarySubcategoryId ? [profile.primarySubcategoryId] : []} max={1} onChange={(ids) => setProfile({ ...profile, primarySubcategoryId: ids[0] ?? null })} />
                <Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Preferred roles, up to 5', 'الأدوار المفضلة، حتى 5')}</Text>
                <ChoiceChips locale={locale} items={roles} selected={profile.preferredRoleIds} max={5} onChange={(preferredRoleIds) => setProfile({ ...profile, preferredRoleIds })} />
                <Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Skills', 'المهارات')}</Text>
                <ChoiceChips locale={locale} items={skills} selected={profile.skillIds} max={50} onChange={(skillIds) => setProfile({ ...profile, skillIds })} />
                <Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Languages', 'اللغات')}</Text>
                <ChoiceChips locale={locale} items={languages} selected={profile.languageIds} max={20} onChange={(languageIds) => setProfile({ ...profile, languageIds })} />
                <PrimaryButton label={busy === 'profile' ? tx(locale, 'Saving…', 'جاري الحفظ…') : tx(locale, 'Save profile', 'حفظ الملف')} onPress={() => void saveProfile()} disabled={busy === 'profile'} />
                <Text style={[styles.meta, rtl && styles.rtl]}>{tx(locale, 'Experience, education and certificates remain available through the same protected API and are included in the next mobile editor refinement.', 'الخبرة والتعليم والشهادات متاحة عبر نفس الواجهة المحمية وستضاف إلى تحسين محرر الهاتف التالي.')}</Text>
              </Card>
            )}
          </>
        ) : null}
      </Screen>
      <BottomTabs items={tabs} active={tab} onChange={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  logout: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', justifyContent: 'center' },
  logoutText: { color: colors.ink, fontWeight: '800', fontSize: 11 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: colors.blue, fontWeight: '900', fontSize: 10, letterSpacing: 1.1 },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 20, marginTop: 3 },
  body: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  videoEmpty: { minHeight: 280, backgroundColor: colors.navy, borderRadius: 17, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 4 },
  videoNumber: { color: colors.cyan, fontSize: 64, fontWeight: '900' },
  videoEmptyText: { color: '#FFF', fontWeight: '800' },
  videoHint: { color: '#94A3B8', textAlign: 'center', lineHeight: 18, marginTop: 12, fontSize: 11 },
  videoActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  deleteVideo: { alignItems: 'center', paddingVertical: 10 },
  deleteVideoText: { color: '#B91C1C', fontWeight: '800', fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  interview: { gap: 10, paddingTop: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.line },
  interviewTitle: { color: colors.ink, fontWeight: '800', fontSize: 16, marginTop: 6 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  link: { color: colors.blue, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  twoCol: { flexDirection: 'row', gap: 10 },
  sectionLabel: { color: '#334155', fontWeight: '900', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF' },
  chipActive: { borderColor: '#60A5FA', backgroundColor: '#EFF6FF' },
  chipText: { color: '#475569', fontWeight: '700', fontSize: 11 },
  chipTextActive: { color: colors.blue },
});
