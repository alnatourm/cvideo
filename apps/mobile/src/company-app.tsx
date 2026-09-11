import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  api,
  ApiError,
  type CandidateDetail,
  type CandidateSearchItem,
  type Interview,
  type Locale,
  type Principal,
  type SavedList,
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

type Tab = 'search' | 'lists' | 'messages' | 'account';

function errorMessage(locale: Locale, err: unknown) {
  return err instanceof ApiError || err instanceof Error ? err.message : tx(locale, 'Something went wrong', 'حدث خطأ غير متوقع');
}

export function CompanyApp({
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
  const [tab, setTab] = useState<Tab>('search');
  const [country, setCountry] = useState('JO');
  const [city, setCity] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [candidates, setCandidates] = useState<CandidateSearchItem[]>([]);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);
  const [lists, setLists] = useState<SavedList[]>([]);
  const [selectedList, setSelectedList] = useState<SavedList | null>(null);
  const [newListName, setNewListName] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [showInterview, setShowInterview] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [meetingType, setMeetingType] = useState<Interview['meetingType']>('google_meet');
  const [location, setLocation] = useState('');
  const [interviewMessage, setInterviewMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const rtl = locale === 'ar';

  const tabs = useMemo(() => [
    { key: 'search' as const, label: tx(locale, 'Search', 'البحث'), icon: '⌕' },
    { key: 'lists' as const, label: tx(locale, 'Saved', 'المحفوظة'), icon: '▣' },
    { key: 'messages' as const, label: tx(locale, 'Messages', 'الرسائل'), icon: '✉' },
    { key: 'account' as const, label: tx(locale, 'Account', 'الحساب'), icon: '●' },
  ], [locale]);

  async function loadWorkspace() {
    try {
      const [nextLists, nextInterviews] = await Promise.all([api.savedLists(), api.interviews()]);
      setLists(nextLists);
      setInterviews(nextInterviews);
      if (nextLists[0]) setSelectedList(await api.savedList(nextLists[0].id));
    } catch (err) {
      setError(errorMessage(locale, err));
    }
  }

  useEffect(() => { void loadWorkspace(); }, []);

  async function search() {
    setBusy('search'); setError(''); setNotice('');
    try {
      const params = new URLSearchParams();
      if (country.trim()) params.set('countryCode', country.trim().toUpperCase());
      if (city.trim()) params.set('city', city.trim());
      if (minExperience.trim()) params.set('minExperienceYears', minExperience.trim());
      params.set('pageSize', '30');
      const result = await api.searchCandidates(params);
      setCandidates(result.items);
      if (result.items[0]) setSelected(await api.candidateDetail(result.items[0].id));
      else setSelected(null);
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function chooseCandidate(candidate: CandidateSearchItem) {
    setError(''); setShowInterview(false);
    try { setSelected(await api.candidateDetail(candidate.id)); } catch (err) { setError(errorMessage(locale, err)); }
  }

  async function saveCandidate() {
    if (!selected) return;
    setBusy('save'); setError(''); setNotice('');
    try {
      let target = lists[0];
      if (!target) {
        target = await api.createSavedList(tx(locale, 'Saved Candidates', 'المرشحون المحفوظون'));
        setLists([target]);
      }
      const updated = await api.addCandidateToList(target.id, selected.id);
      setLists((current) => current.map((item) => item.id === target!.id ? { ...item, candidateCount: updated.candidateCount } : item));
      setSelectedList(updated);
      setNotice(tx(locale, 'Candidate saved.', 'تم حفظ المرشح.'));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function startChat() {
    if (!selected) return;
    setBusy('chat'); setError('');
    try {
      const conversation = await api.createConversation(selected.id);
      setConversationId(conversation.id);
      setTab('messages');
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function requestInterview() {
    if (!selected) return;
    setBusy('interview'); setError(''); setNotice('');
    try {
      if (!interviewTitle.trim() || !interviewDate.trim() || !interviewTime.trim()) {
        throw new Error(tx(locale, 'Enter the role, date and time.', 'أدخل المسمى والتاريخ والوقت.'));
      }
      const starts = new Date(`${interviewDate.trim()}T${interviewTime.trim()}:00`);
      if (Number.isNaN(starts.getTime())) throw new Error(tx(locale, 'Use date YYYY-MM-DD and time HH:mm.', 'استخدم التاريخ YYYY-MM-DD والوقت HH:mm.'));
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const created = await api.createInterview({
        candidateId: selected.id,
        opportunityTitle: interviewTitle.trim(),
        startsAtUtc: starts.toISOString(),
        timezone,
        durationMinutes: 30,
        meetingType,
        message: interviewMessage.trim() || undefined,
        location: meetingType === 'in_person' ? location.trim() : undefined,
      });
      setInterviews((current) => [created, ...current]);
      setShowInterview(false);
      setNotice(tx(locale, 'Interview request sent.', 'تم إرسال طلب المقابلة.'));
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function createList() {
    if (!newListName.trim()) return;
    setBusy('list'); setError('');
    try {
      const created = await api.createSavedList(newListName.trim());
      setLists((current) => [created, ...current]);
      setSelectedList(created);
      setNewListName('');
    } catch (err) { setError(errorMessage(locale, err)); } finally { setBusy(''); }
  }

  async function openList(id: string) {
    try { setSelectedList(await api.savedList(id)); } catch (err) { setError(errorMessage(locale, err)); }
  }

  async function removeFromList(candidateId: string) {
    if (!selectedList) return;
    try {
      await api.removeCandidateFromList(selectedList.id, candidateId);
      const next = await api.savedList(selectedList.id);
      setSelectedList(next);
      setLists((current) => current.map((item) => item.id === next.id ? { ...item, candidateCount: next.candidateCount } : item));
    } catch (err) { setError(errorMessage(locale, err)); }
  }

  const logoutButton = <Pressable style={styles.logout} onPress={onLogout}><Text style={styles.logoutText}>{tx(locale, 'Logout', 'خروج')}</Text></Pressable>;

  return (
    <View style={styles.root}>
      <Screen>
        <TopBar locale={locale} setLocale={setLocale} right={logoutButton} />
        <Notice locale={locale} message={error} />
        <Notice locale={locale} message={notice} type="success" />

        {tab === 'search' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'TALENT DISCOVERY', 'اكتشاف المواهب')} title={tx(locale, 'Search. Watch. Save. Chat. Interview.', 'ابحث. شاهد. احفظ. تواصل. قابل.')} body={tx(locale, 'No applications and no AI match scores. Search professional profiles directly.', 'لا طلبات توظيف ولا درجات مطابقة بالذكاء الاصطناعي. ابحث في الملفات المهنية مباشرة.')} />
            <Card>
              <View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Country', 'الدولة')} value={country} maxLength={2} autoCapitalize="characters" onChangeText={setCountry} /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'City', 'المدينة')} value={city} onChangeText={setCity} /></View></View>
              <Field locale={locale} label={tx(locale, 'Minimum years experience', 'الحد الأدنى لسنوات الخبرة')} value={minExperience} keyboardType="number-pad" onChangeText={setMinExperience} />
              <PrimaryButton label={busy === 'search' ? tx(locale, 'Searching…', 'جاري البحث…') : tx(locale, 'Search candidates', 'البحث عن مرشحين')} onPress={() => void search()} disabled={busy === 'search'} />
            </Card>

            {candidates.length ? <View style={styles.resultStrip}>{candidates.map((candidate) => <Pressable key={candidate.id} style={[styles.resultCard, selected?.id === candidate.id && styles.resultActive]} onPress={() => void chooseCandidate(candidate)}><View style={styles.avatar}><Text style={styles.avatarText}>{candidate.displayName.slice(0,1).toUpperCase()}</Text></View><View style={styles.flex}><Text style={[styles.resultName, rtl && styles.rtl]} numberOfLines={1}>{candidate.displayName}</Text><Text style={[styles.meta, rtl && styles.rtl]} numberOfLines={1}>{candidate.headline || tx(locale, 'Professional', 'مهني')} · {candidate.city}</Text></View></Pressable>)}</View> : null}

            {!selected ? <Card><Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Search to discover candidates.', 'ابحث لاكتشاف المرشحين.')}</Text></Card> : (
              <>
                <Card style={styles.videoCard}>
                  {selected.introductionVideoUrl ? <NativeVideo uri={selected.introductionVideoUrl} poster={selected.introductionVideoThumbnailUrl} tall /> : <View style={styles.videoEmpty}><Text style={styles.videoPlay}>▶</Text><Text style={styles.videoEmptyText}>{tx(locale, 'Introduction Video unavailable', 'الفيديو التعريفي غير متاح')}</Text></View>}
                  <Text style={[styles.candidateName, rtl && styles.rtl]}>{selected.displayName}</Text>
                  <Text style={[styles.candidateHeadline, rtl && styles.rtl]}>{selected.headline || tx(locale, 'Professional candidate', 'مرشح مهني')}</Text>
                  <Text style={[styles.meta, rtl && styles.rtl]}>{selected.city}, {selected.countryCode} · {selected.yearsExperience} {tx(locale, 'years experience', 'سنوات خبرة')}</Text>
                  {selected.professionalSummary ? <Text style={[styles.summary, rtl && styles.rtl]}>{selected.professionalSummary}</Text> : null}
                  <View style={styles.metrics}><Metric locale={locale} label={tx(locale, 'Skills', 'مهارات')} value={String(selected.skillIds.length)} /><Metric locale={locale} label={tx(locale, 'Certificates', 'شهادات')} value={String(selected.certificates.length)} /><Metric locale={locale} label={tx(locale, 'Roles', 'خبرات')} value={String(selected.experience.length)} /></View>
                  <View style={styles.actionStack}><SecondaryButton label={busy === 'save' ? tx(locale, 'Saving…', 'جاري الحفظ…') : tx(locale, 'Save candidate', 'حفظ المرشح')} onPress={() => void saveCandidate()} disabled={busy === 'save'} /><SecondaryButton label={busy === 'chat' ? tx(locale, 'Opening…', 'جاري الفتح…') : tx(locale, 'Start chat', 'بدء محادثة')} onPress={() => void startChat()} disabled={busy === 'chat'} /><PrimaryButton label={tx(locale, 'Request interview', 'طلب مقابلة')} onPress={() => { setInterviewTitle(selected.headline ?? ''); setShowInterview((value) => !value); }} /></View>
                </Card>
                {showInterview ? <Card><Text style={[styles.cardTitle, rtl && styles.rtl]}>{tx(locale, 'Interview request', 'طلب مقابلة')}</Text><Field locale={locale} label={tx(locale, 'Role / opportunity', 'المسمى / الفرصة')} value={interviewTitle} onChangeText={setInterviewTitle} /><View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Date YYYY-MM-DD', 'التاريخ YYYY-MM-DD')} value={interviewDate} onChangeText={setInterviewDate} placeholder="2026-09-15" /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Time HH:mm', 'الوقت HH:mm')} value={interviewTime} onChangeText={setInterviewTime} placeholder="14:30" /></View></View><Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Interview type', 'نوع المقابلة')}</Text><View style={styles.typeRow}>{(['google_meet','video_call','in_person'] as const).map((type) => <Pressable key={type} style={[styles.typeChip, meetingType === type && styles.typeActive]} onPress={() => setMeetingType(type)}><Text style={[styles.typeText, meetingType === type && styles.typeTextActive]}>{type.replaceAll('_',' ')}</Text></Pressable>)}</View>{meetingType === 'in_person' ? <Field locale={locale} label={tx(locale, 'Location', 'الموقع')} value={location} onChangeText={setLocation} /> : null}<Field locale={locale} label={tx(locale, 'Message', 'رسالة')} value={interviewMessage} onChangeText={setInterviewMessage} multiline /><PrimaryButton label={busy === 'interview' ? tx(locale, 'Sending…', 'جاري الإرسال…') : tx(locale, 'Send interview request', 'إرسال طلب المقابلة')} onPress={() => void requestInterview()} disabled={busy === 'interview'} /></Card> : null}
              </>
            )}
          </>
        ) : null}

        {tab === 'lists' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'SAVED LISTS', 'القوائم المحفوظة')} title={tx(locale, 'Organize people, not applications', 'نظّم الأشخاص، لا طلبات التوظيف')} body={tx(locale, 'Private company candidate collections. Never ATS stages.', 'مجموعات مرشحين خاصة بالشركة وليست مراحل نظام توظيف.')} />
            <Card><Field locale={locale} label={tx(locale, 'New list name', 'اسم قائمة جديدة')} value={newListName} onChangeText={setNewListName} /><PrimaryButton label={busy === 'list' ? tx(locale, 'Creating…', 'جاري الإنشاء…') : tx(locale, 'Create list', 'إنشاء قائمة')} onPress={() => void createList()} disabled={busy === 'list' || !newListName.trim()} /></Card>
            <View style={styles.listStack}>{lists.map((list) => <Pressable key={list.id} style={[styles.listCard, selectedList?.id === list.id && styles.resultActive]} onPress={() => void openList(list.id)}><View style={styles.flex}><Text style={[styles.resultName, rtl && styles.rtl]}>{list.name}</Text><Text style={[styles.meta, rtl && styles.rtl]}>{list.description || tx(locale, 'Candidate collection', 'مجموعة مرشحين')}</Text></View><View style={styles.count}><Text style={styles.countText}>{list.candidateCount}</Text></View></Pressable>)}</View>
            <Card><Text style={[styles.cardTitle, rtl && styles.rtl]}>{selectedList?.name ?? tx(locale, 'Choose a list', 'اختر قائمة')}</Text>{selectedList?.candidateIds?.length ? selectedList.candidateIds.map((id) => <View key={id} style={styles.savedCandidate}><Text style={styles.savedId} numberOfLines={1}>{id}</Text><Pressable onPress={() => void removeFromList(id)}><Text style={styles.remove}>{tx(locale, 'Remove', 'إزالة')}</Text></Pressable></View>) : <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Save candidates from Search and they will appear here.', 'احفظ المرشحين من البحث وسيظهرون هنا.')}</Text>}</Card>
          </>
        ) : null}

        {tab === 'messages' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'MESSAGES', 'الرسائل')} title={tx(locale, 'Candidate conversations', 'محادثات المرشحين')} body={tx(locale, 'Your company initiates first contact. Continue professional conversations here.', 'شركتك تبدأ التواصل الأول. أكمل المحادثات المهنية هنا.')} />
            <MessagesPanel locale={locale} principal={principal} initialConversationId={conversationId} />
          </>
        ) : null}

        {tab === 'account' ? (
          <>
            <PageTitle locale={locale} eyebrow={tx(locale, 'COMPANY ACCOUNT', 'حساب الشركة')} title={tx(locale, 'Company workspace', 'مساحة الشركة')} body={tx(locale, 'Role, tenant identity and interview activity.', 'الدور وهوية الشركة ونشاط المقابلات.')} />
            <View style={styles.metrics}><Metric locale={locale} label={tx(locale, 'Role', 'الدور')} value={principal.effectiveRole.replaceAll('_',' ')} /><Metric locale={locale} label={tx(locale, 'Interviews', 'المقابلات')} value={String(interviews.length)} /></View>
            <Card><Text style={[styles.sectionLabel, rtl && styles.rtl]}>{tx(locale, 'Company tenant', 'هوية الشركة')}</Text><Text style={[styles.mono, rtl && styles.rtl]}>{principal.companyId ?? '—'}</Text></Card>
            <Card><Text style={[styles.cardTitle, rtl && styles.rtl]}>{tx(locale, 'Interview activity', 'نشاط المقابلات')}</Text>{interviews.length === 0 ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'No interviews yet.', 'لا توجد مقابلات بعد.')}</Text> : interviews.slice(0,10).map((item) => <View key={item.id} style={styles.interviewRow}><StatusPill value={item.status} /><Text style={[styles.interviewTitle, rtl && styles.rtl]}>{item.opportunityTitle}</Text><Text style={[styles.meta, rtl && styles.rtl]}>{new Date(item.startsAtUtc).toLocaleString()}</Text></View>)}</Card>
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
  twoCol: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  resultStrip: { gap: 8 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF' },
  resultActive: { backgroundColor: '#EFF6FF', borderColor: '#60A5FA' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '900' },
  resultName: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  videoCard: { padding: 12 },
  videoEmpty: { minHeight: 520, borderRadius: 17, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', gap: 12 },
  videoPlay: { color: colors.cyan, fontSize: 48 },
  videoEmptyText: { color: '#FFF', fontWeight: '800' },
  candidateName: { color: colors.ink, fontSize: 28, fontWeight: '900', marginTop: 6 },
  candidateHeadline: { color: '#334155', fontWeight: '800', fontSize: 16 },
  summary: { color: '#334155', lineHeight: 21, fontSize: 13 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionStack: { gap: 8, marginTop: 4 },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  sectionLabel: { color: '#334155', fontWeight: '900', marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  typeActive: { borderColor: '#60A5FA', backgroundColor: '#EFF6FF' },
  typeText: { color: colors.muted, fontWeight: '800', fontSize: 11, textTransform: 'capitalize' },
  typeTextActive: { color: colors.blue },
  listStack: { gap: 8 },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line },
  count: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  countText: { color: colors.blue, fontWeight: '900' },
  savedCandidate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 11 },
  savedId: { flex: 1, color: colors.muted, fontSize: 10 },
  remove: { color: colors.danger, fontWeight: '800', fontSize: 11 },
  mono: { color: colors.muted, fontSize: 11 },
  interviewRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 5 },
  interviewTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
});