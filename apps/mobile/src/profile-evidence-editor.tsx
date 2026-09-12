import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  api,
  type CandidateCertificate,
  type CandidateEducation,
  type CandidateExperience,
  type Locale,
} from './api';
import { certificateInput, educationInput, experienceInput } from './profile-evidence';
import { Card, Field, PrimaryButton, SecondaryButton, colors, tx } from './ui';

type ExperienceDraft = Omit<CandidateExperience, 'id' | 'location' | 'endDate' | 'description'> & {
  id?: string; location: string; endDate: string; description: string;
};
type EducationDraft = Omit<CandidateEducation, 'id' | 'fieldOfStudy' | 'startDate' | 'endDate' | 'description'> & {
  id?: string; fieldOfStudy: string; startDate: string; endDate: string; description: string;
};
type CertificateDraft = Omit<CandidateCertificate, 'id' | 'issueDate' | 'expiryDate' | 'credentialId' | 'credentialUrl'> & {
  id?: string; issueDate: string; expiryDate: string; credentialId: string; credentialUrl: string;
};

const blankExperience = (): ExperienceDraft => ({ companyName: '', jobTitle: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' });
const blankEducation = (): EducationDraft => ({ institution: '', qualification: '', fieldOfStudy: '', startDate: '', endDate: '', description: '' });
const blankCertificate = (): CertificateDraft => ({ name: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' });

function SectionTitle({ locale, title, count }: { locale: Locale; title: string; count: number }) {
  return <View style={styles.sectionHead}><Text style={[styles.title, locale === 'ar' && styles.rtl]}>{title}</Text><Text style={styles.count}>{count}</Text></View>;
}

function Actions({ locale, onEdit, onDelete, disabled }: { locale: Locale; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  return <View style={styles.actions}><View style={styles.flex}><SecondaryButton label={tx(locale, 'Edit', 'تعديل')} onPress={onEdit} disabled={disabled} /></View><Pressable style={styles.deleteButton} onPress={onDelete} disabled={disabled}><Text style={styles.deleteText}>{tx(locale, 'Delete', 'حذف')}</Text></Pressable></View>;
}

function confirmDelete(locale: Locale, label: string, action: () => void) {
  Alert.alert(tx(locale, `Delete ${label}?`, `حذف ${label}؟`), tx(locale, 'This cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.'), [
    { text: tx(locale, 'Cancel', 'إلغاء'), style: 'cancel' },
    { text: tx(locale, 'Delete', 'حذف'), style: 'destructive', onPress: action },
  ]);
}

export function ProfileEvidenceEditor({
  locale,
  initialExperience,
  initialEducation,
  initialCertificates,
  onChanged,
  onError,
  onNotice,
}: {
  locale: Locale;
  initialExperience: CandidateExperience[];
  initialEducation: CandidateEducation[];
  initialCertificates: CandidateCertificate[];
  onChanged: () => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [experience, setExperience] = useState(initialExperience);
  const [education, setEducation] = useState(initialEducation);
  const [certificates, setCertificates] = useState(initialCertificates);
  const [experienceDraft, setExperienceDraft] = useState<ExperienceDraft | null>(null);
  const [educationDraft, setEducationDraft] = useState<EducationDraft | null>(null);
  const [certificateDraft, setCertificateDraft] = useState<CertificateDraft | null>(null);
  const [busy, setBusy] = useState('');
  const rtl = locale === 'ar';

  useEffect(() => { setExperience(initialExperience); }, [initialExperience]);
  useEffect(() => { setEducation(initialEducation); }, [initialEducation]);
  useEffect(() => { setCertificates(initialCertificates); }, [initialCertificates]);

  function fail(err: unknown) {
    onError(err instanceof Error ? err.message : tx(locale, 'Something went wrong.', 'حدث خطأ غير متوقع.'));
  }

  async function saveExperience() {
    if (!experienceDraft) return;
    setBusy('experience'); onError(''); onNotice('');
    try {
      const payload = experienceInput(experienceDraft);
      const saved = experienceDraft.id ? await api.updateExperience(experienceDraft.id, payload) : await api.createExperience(payload);
      setExperience((items) => experienceDraft.id ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setExperienceDraft(null); onNotice(tx(locale, 'Experience saved.', 'تم حفظ الخبرة.')); onChanged();
    } catch (err) { fail(err); } finally { setBusy(''); }
  }

  async function removeExperience(id: string) {
    setBusy(id); onError('');
    try { await api.deleteExperience(id); setExperience((items) => items.filter((item) => item.id !== id)); onChanged(); }
    catch (err) { fail(err); } finally { setBusy(''); }
  }

  async function saveEducation() {
    if (!educationDraft) return;
    setBusy('education'); onError(''); onNotice('');
    try {
      const payload = educationInput(educationDraft);
      const saved = educationDraft.id ? await api.updateEducation(educationDraft.id, payload) : await api.createEducation(payload);
      setEducation((items) => educationDraft.id ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setEducationDraft(null); onNotice(tx(locale, 'Education saved.', 'تم حفظ التعليم.')); onChanged();
    } catch (err) { fail(err); } finally { setBusy(''); }
  }

  async function removeEducation(id: string) {
    setBusy(id); onError('');
    try { await api.deleteEducation(id); setEducation((items) => items.filter((item) => item.id !== id)); onChanged(); }
    catch (err) { fail(err); } finally { setBusy(''); }
  }

  async function saveCertificate() {
    if (!certificateDraft) return;
    setBusy('certificate'); onError(''); onNotice('');
    try {
      const payload = certificateInput(certificateDraft);
      const saved = certificateDraft.id ? await api.updateCertificate(certificateDraft.id, payload) : await api.createCertificate(payload);
      setCertificates((items) => certificateDraft.id ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setCertificateDraft(null); onNotice(tx(locale, 'Certificate saved.', 'تم حفظ الشهادة.')); onChanged();
    } catch (err) { fail(err); } finally { setBusy(''); }
  }

  async function removeCertificate(id: string) {
    setBusy(id); onError('');
    try { await api.deleteCertificate(id); setCertificates((items) => items.filter((item) => item.id !== id)); onChanged(); }
    catch (err) { fail(err); } finally { setBusy(''); }
  }

  return <>
    <Card>
      <SectionTitle locale={locale} title={tx(locale, 'Experience', 'الخبرة')} count={experience.length} />
      {experience.map((item) => <View key={item.id} style={styles.record}><Text style={[styles.recordTitle, rtl && styles.rtl]}>{item.jobTitle}</Text><Text style={[styles.recordMeta, rtl && styles.rtl]}>{item.companyName}{item.location ? ` · ${item.location}` : ''}</Text><Text style={[styles.recordMeta, rtl && styles.rtl]}>{item.startDate} — {item.isCurrent ? tx(locale, 'Present', 'حتى الآن') : item.endDate ?? tx(locale, 'Not specified', 'غير محدد')}</Text>{item.description ? <Text style={[styles.description, rtl && styles.rtl]}>{item.description}</Text> : null}<Actions locale={locale} disabled={Boolean(busy)} onEdit={() => setExperienceDraft({ ...item, location: item.location ?? '', endDate: item.endDate ?? '', description: item.description ?? '' })} onDelete={() => confirmDelete(locale, tx(locale, 'experience', 'الخبرة'), () => { void removeExperience(item.id); })} /></View>)}
      {!experience.length ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Add your work history.', 'أضف خبراتك العملية.')}</Text> : null}
      {experienceDraft ? <View style={styles.form}><Field locale={locale} label={tx(locale, 'Company', 'الشركة')} value={experienceDraft.companyName} onChangeText={(companyName) => setExperienceDraft({ ...experienceDraft, companyName })} /><Field locale={locale} label={tx(locale, 'Job title', 'المسمى الوظيفي')} value={experienceDraft.jobTitle} onChangeText={(jobTitle) => setExperienceDraft({ ...experienceDraft, jobTitle })} /><Field locale={locale} label={tx(locale, 'Location (optional)', 'الموقع (اختياري)')} value={experienceDraft.location} onChangeText={(location) => setExperienceDraft({ ...experienceDraft, location })} /><View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Start YYYY-MM-DD', 'البداية YYYY-MM-DD')} value={experienceDraft.startDate} onChangeText={(startDate) => setExperienceDraft({ ...experienceDraft, startDate })} /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'End YYYY-MM-DD', 'النهاية YYYY-MM-DD')} value={experienceDraft.endDate} editable={!experienceDraft.isCurrent} onChangeText={(endDate) => setExperienceDraft({ ...experienceDraft, endDate })} /></View></View><Pressable style={[styles.toggle, experienceDraft.isCurrent && styles.toggleActive]} onPress={() => setExperienceDraft({ ...experienceDraft, isCurrent: !experienceDraft.isCurrent, endDate: '' })}><Text style={[styles.toggleText, experienceDraft.isCurrent && styles.toggleTextActive]}>{tx(locale, 'I currently work here', 'ما زلت أعمل هنا')}</Text></Pressable><Field locale={locale} label={tx(locale, 'Description (optional)', 'الوصف (اختياري)')} value={experienceDraft.description} multiline onChangeText={(description) => setExperienceDraft({ ...experienceDraft, description })} /><View style={styles.actions}><View style={styles.flex}><PrimaryButton label={tx(locale, 'Save experience', 'حفظ الخبرة')} onPress={() => void saveExperience()} disabled={busy === 'experience'} /></View><SecondaryButton label={tx(locale, 'Cancel', 'إلغاء')} onPress={() => setExperienceDraft(null)} disabled={busy === 'experience'} /></View></View> : <SecondaryButton label={tx(locale, 'Add experience', 'إضافة خبرة')} onPress={() => setExperienceDraft(blankExperience())} disabled={Boolean(busy)} />}
    </Card>

    <Card>
      <SectionTitle locale={locale} title={tx(locale, 'Education', 'التعليم')} count={education.length} />
      {education.map((item) => <View key={item.id} style={styles.record}><Text style={[styles.recordTitle, rtl && styles.rtl]}>{item.qualification}</Text><Text style={[styles.recordMeta, rtl && styles.rtl]}>{item.institution}{item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ''}</Text><Text style={[styles.recordMeta, rtl && styles.rtl]}>{item.startDate ?? '—'} — {item.endDate ?? '—'}</Text>{item.description ? <Text style={[styles.description, rtl && styles.rtl]}>{item.description}</Text> : null}<Actions locale={locale} disabled={Boolean(busy)} onEdit={() => setEducationDraft({ ...item, fieldOfStudy: item.fieldOfStudy ?? '', startDate: item.startDate ?? '', endDate: item.endDate ?? '', description: item.description ?? '' })} onDelete={() => confirmDelete(locale, tx(locale, 'education', 'التعليم'), () => { void removeEducation(item.id); })} /></View>)}
      {!education.length ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Add education and qualifications.', 'أضف التعليم والمؤهلات.')}</Text> : null}
      {educationDraft ? <View style={styles.form}><Field locale={locale} label={tx(locale, 'Institution', 'المؤسسة التعليمية')} value={educationDraft.institution} onChangeText={(institution) => setEducationDraft({ ...educationDraft, institution })} /><Field locale={locale} label={tx(locale, 'Qualification', 'المؤهل')} value={educationDraft.qualification} onChangeText={(qualification) => setEducationDraft({ ...educationDraft, qualification })} /><Field locale={locale} label={tx(locale, 'Field of study (optional)', 'التخصص (اختياري)')} value={educationDraft.fieldOfStudy} onChangeText={(fieldOfStudy) => setEducationDraft({ ...educationDraft, fieldOfStudy })} /><View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Start YYYY-MM-DD', 'البداية YYYY-MM-DD')} value={educationDraft.startDate} onChangeText={(startDate) => setEducationDraft({ ...educationDraft, startDate })} /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'End YYYY-MM-DD', 'النهاية YYYY-MM-DD')} value={educationDraft.endDate} onChangeText={(endDate) => setEducationDraft({ ...educationDraft, endDate })} /></View></View><Field locale={locale} label={tx(locale, 'Description (optional)', 'الوصف (اختياري)')} value={educationDraft.description} multiline onChangeText={(description) => setEducationDraft({ ...educationDraft, description })} /><View style={styles.actions}><View style={styles.flex}><PrimaryButton label={tx(locale, 'Save education', 'حفظ التعليم')} onPress={() => void saveEducation()} disabled={busy === 'education'} /></View><SecondaryButton label={tx(locale, 'Cancel', 'إلغاء')} onPress={() => setEducationDraft(null)} disabled={busy === 'education'} /></View></View> : <SecondaryButton label={tx(locale, 'Add education', 'إضافة تعليم')} onPress={() => setEducationDraft(blankEducation())} disabled={Boolean(busy)} />}
    </Card>

    <Card>
      <SectionTitle locale={locale} title={tx(locale, 'Certificates', 'الشهادات')} count={certificates.length} />
      {certificates.map((item) => <View key={item.id} style={styles.record}><Text style={[styles.recordTitle, rtl && styles.rtl]}>{item.name}</Text><Text style={[styles.recordMeta, rtl && styles.rtl]}>{item.issuingOrganization}</Text>{item.credentialId ? <Text style={[styles.recordMeta, rtl && styles.rtl]}>{tx(locale, 'Credential', 'رقم الاعتماد')}: {item.credentialId}</Text> : null}<Actions locale={locale} disabled={Boolean(busy)} onEdit={() => setCertificateDraft({ ...item, issueDate: item.issueDate ?? '', expiryDate: item.expiryDate ?? '', credentialId: item.credentialId ?? '', credentialUrl: item.credentialUrl ?? '' })} onDelete={() => confirmDelete(locale, tx(locale, 'certificate', 'الشهادة'), () => { void removeCertificate(item.id); })} /></View>)}
      {!certificates.length ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Add professional certificates.', 'أضف الشهادات المهنية.')}</Text> : null}
      {certificateDraft ? <View style={styles.form}><Field locale={locale} label={tx(locale, 'Certificate name', 'اسم الشهادة')} value={certificateDraft.name} onChangeText={(name) => setCertificateDraft({ ...certificateDraft, name })} /><Field locale={locale} label={tx(locale, 'Issuing organization', 'الجهة المانحة')} value={certificateDraft.issuingOrganization} onChangeText={(issuingOrganization) => setCertificateDraft({ ...certificateDraft, issuingOrganization })} /><View style={styles.twoCol}><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Issue YYYY-MM-DD', 'الإصدار YYYY-MM-DD')} value={certificateDraft.issueDate} onChangeText={(issueDate) => setCertificateDraft({ ...certificateDraft, issueDate })} /></View><View style={styles.flex}><Field locale={locale} label={tx(locale, 'Expiry YYYY-MM-DD', 'الانتهاء YYYY-MM-DD')} value={certificateDraft.expiryDate} onChangeText={(expiryDate) => setCertificateDraft({ ...certificateDraft, expiryDate })} /></View></View><Field locale={locale} label={tx(locale, 'Credential ID (optional)', 'رقم الاعتماد (اختياري)')} value={certificateDraft.credentialId} onChangeText={(credentialId) => setCertificateDraft({ ...certificateDraft, credentialId })} /><Field locale={locale} label={tx(locale, 'Credential URL (optional)', 'رابط الاعتماد (اختياري)')} value={certificateDraft.credentialUrl} autoCapitalize="none" keyboardType="url" onChangeText={(credentialUrl) => setCertificateDraft({ ...certificateDraft, credentialUrl })} /><View style={styles.actions}><View style={styles.flex}><PrimaryButton label={tx(locale, 'Save certificate', 'حفظ الشهادة')} onPress={() => void saveCertificate()} disabled={busy === 'certificate'} /></View><SecondaryButton label={tx(locale, 'Cancel', 'إلغاء')} onPress={() => setCertificateDraft(null)} disabled={busy === 'certificate'} /></View></View> : <SecondaryButton label={tx(locale, 'Add certificate', 'إضافة شهادة')} onPress={() => setCertificateDraft(blankCertificate())} disabled={Boolean(busy)} />}
    </Card>
  </>;
}

const styles = StyleSheet.create({
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { color: colors.ink, fontWeight: '900', fontSize: 20, flex: 1 },
  count: { color: colors.blue, backgroundColor: '#EFF6FF', fontWeight: '900', minWidth: 30, textAlign: 'center', padding: 6, borderRadius: 999 },
  record: { gap: 5, paddingTop: 12, marginTop: 2, borderTopWidth: 1, borderTopColor: colors.line },
  recordTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  recordMeta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  description: { color: '#334155', fontSize: 13, lineHeight: 19 },
  empty: { color: colors.muted, paddingVertical: 8 },
  form: { gap: 10, paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.line },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  twoCol: { flexDirection: 'row', gap: 8 },
  deleteButton: { minHeight: 49, justifyContent: 'center', paddingHorizontal: 10 },
  deleteText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  toggle: { minHeight: 45, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 13, backgroundColor: '#FFF' },
  toggleActive: { borderColor: '#60A5FA', backgroundColor: '#EFF6FF' },
  toggleText: { color: colors.muted, fontWeight: '800' },
  toggleTextActive: { color: colors.blue },
});
