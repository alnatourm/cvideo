import Hls from 'hls.js';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  ApiError,
  api,
  type CandidateDetail,
  type CandidateProfile,
  type CandidateSearchItem,
  type CandidateVideo,
  type CompanyVerification,
  type CompanyVerificationStatusView,
  type CompanyMember,
  type CompanyProfile,
  type ChatMessage,
  type EffectiveRole,
  type Interview,
  type SavedList,
  type TaxonomyItem,
} from './api';
import { useAuth } from './auth';
import { direction, landingFlowSteps, type Locale, t } from './i18n';

const companyRoles: EffectiveRole[] = ['company_owner', 'company_admin', 'recruiter'];

function text(locale: Locale, en: string, ar: string) {
  return locale === 'ar' ? ar : en;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function roleHome(role: EffectiveRole | undefined) {
  if (role === 'candidate') return '/candidate/home';
  if (role === 'super_admin') return '/admin';
  return '/recruiter/search';
}

function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <button className="ghost compact" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} type="button">
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}

function HlsVideo({ src, poster, className = '' }: { src: string; poster?: string | null; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }
    if (!Hls.isSupported()) return;
    const hls = new Hls({ enableWorker: true });
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [src]);

  return <video ref={ref} className={className} poster={poster ?? undefined} controls playsInline preload="metadata" />;
}

function PublicHeader({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { principal } = useAuth();
  return (
    <header className="header glass">
      <Link to="/" className="brand"><span className="brand-mark">C</span>VIDEO</Link>
      <nav className="nav" aria-label={text(locale, 'Public navigation', 'التنقل العام')}>
        <a href="#how">{text(locale, 'How it works', 'كيف يعمل')}</a>
        <a href="#candidates">{text(locale, 'For candidates', 'للباحثين عن فرص')}</a>
        <a href="#companies">{text(locale, 'For companies', 'للشركات')}</a>
        {principal ? (
          <Link className="button small primary" to={roleHome(principal.effectiveRole)}>{text(locale, 'Open CVIDEO', 'افتح CVIDEO')}</Link>
        ) : (
          <Link to="/login">{text(locale, 'Login', 'تسجيل الدخول')}</Link>
        )}
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </nav>
    </header>
  );
}

function Landing({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div className="page-shell public-page">
      <PublicHeader locale={locale} setLocale={setLocale} />
      <main>
        <section className="hero premium-hero">
          <div className="hero-copy">
            <span className="eyebrow">{text(locale, 'Reverse employment. Human first.', 'توظيف عكسي. الإنسان أولاً.')}</span>
            <h1>{t(locale, 'heroTitle')}</h1>
            <p>{t(locale, 'heroBody')}</p>
            <div className="actions">
              <Link className="button primary" to="/register/company">{text(locale, 'Find Talent', 'ابحث عن المواهب')}</Link>
              <Link className="button secondary" to="/register/candidate">{text(locale, 'Create Candidate Profile', 'أنشئ ملفك المهني')}</Link>
            </div>
            <div className="hero-proof">
              <span>30s {text(locale, 'Introduction Video', 'فيديو تعريفي')}</span>
              <span>{text(locale, 'Arabic + English', 'العربية + الإنجليزية')}</span>
              <span>{text(locale, 'Web + Mobile', 'ويب + موبايل')}</span>
            </div>
          </div>
          <div className="hero-device" aria-label="Candidate introduction video preview">
            <div className="hero-video-stage">
              <div className="video-gradient" />
              <span className="video-badge">30s {text(locale, 'Introduction', 'تعريف')}</span>
              <div className="play-orbit">▶</div>
              <div className="video-meta overlay-meta">
                <strong>Maya A.</strong>
                <span>{text(locale, 'Senior Graphic Designer · Amman · 6 years', 'مصممة جرافيك أولى · عمّان · 6 سنوات')}</span>
                <div className="chips"><span>Figma</span><span>Branding</span><span>Packaging</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="section-block">
          <span className="eyebrow">{text(locale, 'The CVIDEO flow', 'رحلة CVIDEO')}</span>
          <h2>{text(locale, 'Search → Watch → Save → Chat → Interview', 'ابحث ← شاهد ← احفظ ← تحدث ← قابل')}</h2>
          <div className="section-grid five">
            {landingFlowSteps(locale).map(([number, title, description]) => (
              <article key={number} className="flow-card"><b>{number}</b><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </section>

        <section id="candidates" className="split-feature">
          <div><span className="eyebrow">{text(locale, 'For candidates', 'للباحثين عن فرص')}</span><h2>{text(locale, 'Publish your professional story. Do not chase job posts.', 'انشر قصتك المهنية. لا تطارد إعلانات الوظائف.')}</h2></div>
          <p>{text(locale, 'Build your profile once, add your 30-second Introduction Video, choose when you are discoverable, and reply when a company contacts you.', 'أنشئ ملفك مرة واحدة، أضف فيديو تعريفيًا مدته 30 ثانية، اختر متى تكون ظاهرًا للشركات، ورد عندما تتواصل معك شركة.')}</p>
        </section>
        <section id="companies" className="split-feature dark-feature">
          <div><span className="eyebrow">{text(locale, 'For companies', 'للشركات')}</span><h2>{text(locale, 'Meet talent before the CV becomes the whole story.', 'تعرّف على المواهب قبل أن تصبح السيرة الذاتية هي القصة كلها.')}</h2></div>
          <p>{text(locale, 'Search, screen quickly through video, open the full professional profile, save candidates, start a chat and request an interview.', 'ابحث، شاهد الفيديو بسرعة، افتح الملف المهني الكامل، احفظ المرشحين، ابدأ المحادثة واطلب مقابلة.')}</p>
        </section>
      </main>
    </div>
  );
}

function AuthCard({ children, locale, setLocale }: { children: ReactNode; locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <main className="auth-page">
      <div className="auth-top"><Link to="/" className="brand"><span className="brand-mark">C</span>VIDEO</Link><LocaleToggle locale={locale} setLocale={setLocale} /></div>
      <section className="auth-card">{children}</section>
    </main>
  );
}

function LoginPage({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { principal, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && principal) return <Navigate to={roleHome(principal.effectiveRole)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const signedIn = await login(email, password);
      navigate(roleHome(signedIn.effectiveRole), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  }

  return (
    <AuthCard locale={locale} setLocale={setLocale}>
      <span className="eyebrow">{text(locale, 'Welcome back', 'مرحباً بعودتك')}</span>
      <h1>{text(locale, 'Login to CVIDEO', 'تسجيل الدخول إلى CVIDEO')}</h1>
      <p className="muted">{text(locale, 'Candidates and company teams use the same secure sign-in.', 'يستخدم المرشحون وفرق الشركات نفس تسجيل الدخول الآمن.')}</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit} className="form-stack">
        <label>{text(locale, 'Email', 'البريد الإلكتروني')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>{text(locale, 'Password', 'كلمة المرور')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        <button className="button primary full" disabled={busy} type="submit">{busy ? text(locale, 'Signing in…', 'جاري الدخول…') : text(locale, 'Continue', 'متابعة')}</button>
      </form>
      <div className="auth-links"><Link to="/register/candidate">{text(locale, 'Create candidate profile', 'إنشاء ملف مرشح')}</Link><Link to="/register/company">{text(locale, 'Register a company', 'تسجيل شركة')}</Link></div>
    </AuthCard>
  );
}

function CandidateRegister({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '', countryCode: 'JO', city: 'Amman' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.registerCandidate(form);
      await login(form.email, form.password);
      navigate('/candidate/profile', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <AuthCard locale={locale} setLocale={setLocale}>
      <span className="eyebrow">{text(locale, 'Candidate', 'مرشح')}</span><h1>{text(locale, 'Create your professional profile', 'أنشئ ملفك المهني')}</h1>
      <p className="muted">{text(locale, 'No job applications. Build your profile and let companies discover you.', 'لا يوجد تقديم على وظائف. أنشئ ملفك ودع الشركات تكتشفك.')}</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit} className="form-grid two">
        <label>{text(locale, 'Full name', 'الاسم الكامل')}<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
        <label>{text(locale, 'Email', 'البريد الإلكتروني')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>{text(locale, 'Country code', 'رمز الدولة')}<input maxLength={2} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} required /></label>
        <label>{text(locale, 'City', 'المدينة')}<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label>
        <label className="span-two">{text(locale, 'Password (12+ characters)', 'كلمة المرور (12 حرفاً على الأقل)')}<input type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button className="button primary span-two" disabled={busy} type="submit">{busy ? text(locale, 'Creating…', 'جاري الإنشاء…') : text(locale, 'Create profile', 'إنشاء الملف')}</button>
      </form>
      <Link className="auth-back" to="/login">{text(locale, 'Already have an account? Login', 'لديك حساب؟ تسجيل الدخول')}</Link>
    </AuthCard>
  );
}

function CompanyRegister({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', companyName: '', countryCode: 'JO', city: 'Amman', commercialRegistrationNumber: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api.registerCompany(form);
      await login(form.email, form.password);
      navigate('/recruiter/search', { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  return (
    <AuthCard locale={locale} setLocale={setLocale}>
      <span className="eyebrow">{text(locale, 'Company', 'شركة')}</span><h1>{text(locale, 'Create your company account', 'أنشئ حساب شركتك')}</h1>
      <p className="muted">{text(locale, 'Company registration starts pending verification.', 'يبدأ تسجيل الشركة بحالة انتظار التحقق.')}</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit} className="form-grid two">
        <label className="span-two">{text(locale, 'Company name', 'اسم الشركة')}<input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required /></label>
        <label>{text(locale, 'Country code', 'رمز الدولة')}<input maxLength={2} value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} required /></label>
        <label>{text(locale, 'City', 'المدينة')}<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label>
        <label className="span-two">{text(locale, 'Commercial Registration Number', 'رقم السجل التجاري')}<input value={form.commercialRegistrationNumber} onChange={(e) => setForm({ ...form, commercialRegistrationNumber: e.target.value })} required /></label>
        <label className="span-two">{text(locale, 'Work email', 'بريد العمل')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label className="span-two">{text(locale, 'Password (12+ characters)', 'كلمة المرور (12 حرفاً على الأقل)')}<input type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button className="button primary span-two" disabled={busy} type="submit">{busy ? text(locale, 'Creating…', 'جاري الإنشاء…') : text(locale, 'Create company account', 'إنشاء حساب الشركة')}</button>
      </form>
      <Link className="auth-back" to="/login">{text(locale, 'Already registered? Login', 'مسجل مسبقاً؟ تسجيل الدخول')}</Link>
    </AuthCard>
  );
}

function RequireRole({ roles, children }: { roles: EffectiveRole[]; children: ReactNode }) {
  const { principal, loading } = useAuth();
  if (loading) return <main className="loading-screen"><div className="spinner" /><p>Loading CVIDEO…</p></main>;
  if (!principal) return <Navigate to="/login" replace />;
  if (!roles.includes(principal.effectiveRole)) return <Navigate to={roleHome(principal.effectiveRole)} replace />;
  return <>{children}</>;
}

function AppShell({ locale, setLocale, children }: { locale: Locale; setLocale: (locale: Locale) => void; children: ReactNode }) {
  const { principal, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!principal) return null;

  const candidateItems = [
    ['/candidate/home', text(locale, 'Home', 'الرئيسية'), '⌂'],
    ['/candidate/messages', text(locale, 'Messages', 'الرسائل'), '✉'],
    ['/candidate/profile', text(locale, 'Profile', 'الملف الشخصي'), '◎'],
  ];
  const companyItems = [
    ['/recruiter/search', text(locale, 'Search', 'البحث'), '⌕'],
    ['/recruiter/saved-lists', text(locale, 'Saved Lists', 'القوائم المحفوظة'), '☆'],
    ['/recruiter/messages', text(locale, 'Messages', 'الرسائل'), '✉'],
    ['/recruiter/account', text(locale, 'Company Account', 'حساب الشركة'), '▣'],
  ];
  const adminItems = [['/admin', text(locale, 'Admin', 'الإدارة'), '◆']];
  const items = principal.effectiveRole === 'candidate' ? candidateItems : principal.effectiveRole === 'super_admin' ? adminItems : companyItems;

  async function signOut() {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to={roleHome(principal.effectiveRole)} className="brand sidebar-brand"><span className="brand-mark">C</span>VIDEO</Link>
        <div className="side-nav">
          {items.map(([path, label, icon]) => (
            <Link key={path} className={`side-item ${location.pathname === path ? 'active' : ''}`} to={path}>
              <span>{icon}</span><b>{label}</b>
            </Link>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="identity"><span className="avatar">{principal.email.slice(0, 1).toUpperCase()}</span><div><strong>{principal.email}</strong><small>{principal.effectiveRole.replaceAll('_', ' ')}</small></div></div>
          <LocaleToggle locale={locale} setLocale={setLocale} />
          <button className="ghost compact" type="button" onClick={() => void signOut()}>{text(locale, 'Logout', 'خروج')}</button>
        </div>
      </aside>
      <main className="app-content">{children}</main>
      <nav className="mobile-nav" aria-label={text(locale, 'Mobile navigation', 'التنقل عبر الهاتف')}>
        {items.map(([path, label, icon]) => <Link key={path} className={location.pathname === path ? 'active' : ''} to={path}><span>{icon}</span><small>{label}</small></Link>)}
      </nav>
    </div>
  );
}

function PageHead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="dashboard-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

function CandidateHome({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const [completeness, setCompleteness] = useState(0);
  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [discoverable, setDiscoverable] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    setError('');
    try {
      const [complete, visibility, currentVideo, interviewList] = await Promise.all([
        api.getProfileCompleteness(), api.getVisibility(), api.getCandidateVideo(), api.listInterviews(),
      ]);
      setCompleteness(complete.percent); setDiscoverable(visibility.discoverable); setVideo(currentVideo); setInterviews(interviewList);
    } catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { void load(); }, []);

  async function toggleDiscovery() {
    setBusy('visibility'); setError('');
    try { const result = await api.setVisibility(!discoverable); setDiscoverable(result.discoverable); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function interviewAction(interview: Interview, action: 'accept' | 'decline' | 'suggest') {
    setBusy(interview.id); setError('');
    try {
      if (action === 'accept') await api.acceptInterview(interview.id);
      if (action === 'decline') await api.declineInterview(interview.id);
      if (action === 'suggest') {
        const proposed = window.prompt(text(locale, 'Enter another date/time, for example 2026-09-12T15:00', 'أدخل موعداً آخر، مثال 2026-09-12T15:00'));
        if (!proposed) return;
        await api.suggestInterviewTime(interview.id, new Date(proposed).toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      await load();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  const pending = interviews.filter((item) => item.status === 'pending');
  return (
    <AppShell locale={locale} setLocale={setLocale}>
      <PageHead eyebrow={text(locale, 'Candidate', 'مرشح')} title={text(locale, 'Your opportunity dashboard', 'لوحة فرصك')} description={text(locale, 'Keep your profile sharp, control discovery, and respond when companies reach out.', 'حافظ على ملفك جاهزاً، تحكم بظهورك، ورد عندما تتواصل الشركات.')} action={<Link className="button primary" to="/candidate/profile">{text(locale, 'Edit profile', 'تعديل الملف')}</Link>} />
      {error && <div className="notice error">{error}</div>}
      <div className="metric-grid">
        <Metric label={text(locale, 'Profile completeness', 'اكتمال الملف')} value={`${completeness}%`} />
        <Metric label={text(locale, 'Introduction Video', 'الفيديو التعريفي')} value={video?.status ? video.status.toUpperCase() : text(locale, 'Missing', 'غير موجود')} />
        <Metric label={text(locale, 'Discovery', 'الظهور للشركات')} value={discoverable ? text(locale, 'ON', 'مفعّل') : text(locale, 'OFF', 'متوقف')} />
        <Metric label={text(locale, 'Interview requests', 'طلبات المقابلة')} value={String(pending.length)} />
      </div>

      <div className="dashboard-grid two-wide">
        <section className="panel video-panel">
          <div className="panel-head"><div><span className="eyebrow">30s</span><h2>{t(locale, 'introVideo')}</h2></div><Link to="/candidate/profile" className="text-link">{text(locale, 'Manage video', 'إدارة الفيديو')}</Link></div>
          {video?.status === 'ready' && video.playbackUrl ? <HlsVideo src={video.playbackUrl} poster={video.thumbnailUrl} className="candidate-home-video" /> : <div className="video-empty"><strong>{text(locale, 'Your video is not ready yet', 'الفيديو غير جاهز بعد')}</strong><span>{text(locale, 'Upload or finish processing from your Profile.', 'ارفع الفيديو أو أكمل معالجته من ملفك الشخصي.')}</span></div>}
        </section>
        <section className="panel discovery-panel">
          <span className="eyebrow">{text(locale, 'Visibility', 'الظهور')}</span><h2>{text(locale, 'Let verified company users discover your profile', 'اسمح لمستخدمي الشركات باكتشاف ملفك')}</h2>
          <p className="muted">{text(locale, 'You stay in control. Turn discovery off at any time.', 'أنت المتحكم. يمكنك إيقاف الظهور في أي وقت.')}</p>
          <button className={`discovery-switch ${discoverable ? 'on' : ''}`} type="button" onClick={() => void toggleDiscovery()} disabled={busy === 'visibility'}><span /><b>{discoverable ? text(locale, 'Discoverable', 'ظاهر للشركات') : text(locale, 'Private', 'خاص')}</b></button>
        </section>
      </div>

      <section className="panel interviews-panel">
        <div className="panel-head"><div><span className="eyebrow">{text(locale, 'Interviews', 'المقابلات')}</span><h2>{text(locale, 'Requests from companies', 'طلبات الشركات')}</h2></div></div>
        {interviews.length === 0 ? <div className="empty-state">{text(locale, 'No interview requests yet.', 'لا توجد طلبات مقابلة حتى الآن.')}</div> : interviews.map((interview) => (
          <article className="interview-row" key={interview.id}>
            <div><span className={`status ${interview.status}`}>{interview.status.replaceAll('_', ' ')}</span><h3>{interview.opportunityTitle}</h3><p>{new Date(interview.startsAtUtc).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB')} · {interview.durationMinutes} min · {interview.meetingType.replaceAll('_', ' ')}</p>{interview.message && <small>{interview.message}</small>}</div>
            {interview.status === 'pending' && <div className="actions compact-actions"><button className="button primary small" disabled={busy === interview.id} onClick={() => void interviewAction(interview, 'accept')}>{text(locale, 'Accept', 'قبول')}</button><button className="button secondary small" disabled={busy === interview.id} onClick={() => void interviewAction(interview, 'suggest')}>{text(locale, 'Suggest time', 'اقتراح وقت')}</button><button className="ghost small" disabled={busy === interview.id} onClick={() => void interviewAction(interview, 'decline')}>{text(locale, 'Decline', 'رفض')}</button></div>}
            {interview.meetingJoinUrl && <a className="button primary small" href={interview.meetingJoinUrl} target="_blank" rel="noreferrer">{text(locale, 'Join meeting', 'دخول الاجتماع')}</a>}
          </article>
        ))}
      </section>
    </AppShell>
  );
}

async function inspectVideo(file: File): Promise<{ durationSeconds: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const durationSeconds = Math.ceil(video.duration);
      const height = video.videoHeight;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(durationSeconds) || !height) reject(new Error('Could not read video metadata'));
      else resolve({ durationSeconds, height });
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video file')); };
    video.src = url;
  });
}

function CandidateProfilePage({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyItem[]>([]);
  const [roles, setRoles] = useState<TaxonomyItem[]>([]);
  const [skills, setSkills] = useState<TaxonomyItem[]>([]);
  const [languages, setLanguages] = useState<TaxonomyItem[]>([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [current, currentVideo, categoryList, roleList, skillList, languageList] = await Promise.all([
        api.getCandidateProfile(), api.getCandidateVideo(), api.categories(), api.jobTitles(), api.skills(), api.languages(),
      ]);
      setProfile(current); setVideo(currentVideo); setCategories(categoryList); setRoles(roleList); setSkills(skillList); setLanguages(languageList);
      if (current.primaryCategoryId) setSubcategories(await api.subcategories(current.primaryCategoryId));
    } catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { void load(); }, []);

  async function changeCategory(categoryId: string) {
    if (!profile) return;
    setProfile({ ...profile, primaryCategoryId: categoryId || null, primarySubcategoryId: null });
    setSubcategories(categoryId ? await api.subcategories(categoryId) : []);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (!profile) return;
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
      setProfile(updated); setNotice(text(locale, 'Profile saved.', 'تم حفظ الملف.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  function multiValues(event: React.ChangeEvent<HTMLSelectElement>) {
    return Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
  }

  async function uploadVideo(file: File) {
    setBusy('video'); setError(''); setNotice('');
    try {
      const metadata = await inspectVideo(file);
      if (metadata.durationSeconds > 30) throw new Error(text(locale, 'Introduction Video must be 30 seconds or less.', 'يجب ألا يتجاوز الفيديو التعريفي 30 ثانية.'));
      if (metadata.height > 720) throw new Error(text(locale, 'Please choose a video recorded/exported at 720p or below.', 'يرجى اختيار فيديو بدقة 720p أو أقل.'));
      await api.startCandidateVideo({ filename: file.name, mimeType: file.type, sizeBytes: file.size, durationSeconds: metadata.durationSeconds, height: metadata.height });
      const processing = await api.uploadCandidateVideo(file);
      setVideo(processing);
      setNotice(text(locale, 'Upload complete. Video is processing.', 'اكتمل الرفع. الفيديو قيد المعالجة.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function syncVideo() {
    setBusy('video'); setError('');
    try { const updated = await api.syncCandidateVideo(); setVideo(updated); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function uploadCv(file: File) {
    setBusy('cv'); setError(''); setNotice('');
    try {
      if (file.type !== 'application/pdf' || file.size <= 0 || file.size > 10 * 1024 * 1024) {
        throw new Error(text(locale, 'Choose a PDF no larger than 10 MB.', 'اختر ملف PDF لا يزيد عن 10 ميجابايت.'));
      }
      const result = await api.uploadCandidateCv(file);
      setProfile((current) => current ? { ...current, cvOriginalFilename: result.filename } : current);
      setNotice(text(locale, 'Optional CV uploaded securely.', 'تم رفع السيرة الذاتية الاختيارية بأمان.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function deleteCv() {
    if (!window.confirm(text(locale, 'Delete your uploaded CV?', 'حذف السيرة الذاتية المرفوعة؟'))) return;
    setBusy('cv'); setError(''); setNotice('');
    try {
      await api.deleteCandidateCv();
      setProfile((current) => current ? { ...current, cvOriginalFilename: null } : current);
      setNotice(text(locale, 'CV deleted.', 'تم حذف السيرة الذاتية.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function downloadCv() {
    setBusy('cv'); setError('');
    try {
      const blob = await api.downloadOwnCv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = profile?.cvOriginalFilename ?? 'cv.pdf'; link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  if (!profile) return <AppShell locale={locale} setLocale={setLocale}><div className="loading-panel">{error || text(locale, 'Loading profile…', 'جاري تحميل الملف…')}</div></AppShell>;

  const label = (item: TaxonomyItem) => locale === 'ar' ? item.nameAr : item.nameEn;
  return (
    <AppShell locale={locale} setLocale={setLocale}>
      <PageHead eyebrow={text(locale, 'Profile', 'الملف الشخصي')} title={text(locale, 'Build the profile companies discover', 'ابنِ الملف الذي ستكتشفه الشركات')} description={text(locale, 'Your 30-second Introduction Video is the hero. Professional details support it.', 'الفيديو التعريفي لمدة 30 ثانية هو العنصر الرئيسي، والتفاصيل المهنية تدعمه.')} />
      {error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}
      <div className="profile-layout">
        <form className="panel form-grid two" onSubmit={saveProfile}>
          <div className="panel-head span-two"><div><span className="eyebrow">{text(locale, 'Professional identity', 'الهوية المهنية')}</span><h2>{text(locale, 'Profile details', 'تفاصيل الملف')}</h2></div><button className="button primary" disabled={busy === 'profile'} type="submit">{text(locale, 'Save changes', 'حفظ التغييرات')}</button></div>
          <label>{text(locale, 'Name', 'الاسم')}<input value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
          <label>{text(locale, 'Professional headline', 'المسمى المهني')}<input value={profile.headline ?? ''} onChange={(e) => setProfile({ ...profile, headline: e.target.value || null })} placeholder="Sales Manager" /></label>
          <label>{text(locale, 'Country code', 'رمز الدولة')}<input value={profile.countryCode} maxLength={2} onChange={(e) => setProfile({ ...profile, countryCode: e.target.value.toUpperCase() })} /></label>
          <label>{text(locale, 'City', 'المدينة')}<input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></label>
          <label>{text(locale, 'Main field', 'المجال الرئيسي')}<select value={profile.primaryCategoryId ?? ''} onChange={(e) => void changeCategory(e.target.value)}><option value="">{text(locale, 'Select field', 'اختر المجال')}</option>{categories.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          <label>{text(locale, 'Specialization', 'التخصص')}<select value={profile.primarySubcategoryId ?? ''} onChange={(e) => setProfile({ ...profile, primarySubcategoryId: e.target.value || null })}><option value="">{text(locale, 'Select specialization', 'اختر التخصص')}</option>{subcategories.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          <label>{text(locale, 'Years of experience', 'سنوات الخبرة')}<input type="number" min={0} max={80} value={profile.yearsExperience} onChange={(e) => setProfile({ ...profile, yearsExperience: Number(e.target.value) })} /></label>
          <label>{text(locale, 'Preferred roles (up to 5)', 'الأدوار المفضلة (حتى 5)')}<select multiple value={profile.preferredRoleIds} onChange={(e) => setProfile({ ...profile, preferredRoleIds: multiValues(e).slice(0, 5) })}>{roles.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          <label>{text(locale, 'Skills', 'المهارات')}<select multiple value={profile.skillIds} onChange={(e) => setProfile({ ...profile, skillIds: multiValues(e).slice(0, 50) })}>{skills.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          <label>{text(locale, 'Languages', 'اللغات')}<select multiple value={profile.languageIds} onChange={(e) => setProfile({ ...profile, languageIds: multiValues(e).slice(0, 20) })}>{languages.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
          <label className="span-two">{text(locale, 'Professional summary', 'الملخص المهني')}<textarea rows={5} value={profile.professionalSummary ?? ''} onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value || null })} /></label>
        </form>

        <aside className="panel video-manager">
          <span className="eyebrow">{t(locale, 'introVideo')}</span><h2>{text(locale, 'Your first impression', 'انطباعك الأول')}</h2>
          {video?.status === 'ready' && video.playbackUrl ? <HlsVideo src={video.playbackUrl} poster={video.thumbnailUrl} className="profile-video" /> : <div className="portrait-upload"><span>30</span><small>{text(locale, 'seconds max', 'ثانية كحد أقصى')}</small></div>}
          <div className="video-state"><span className={`status ${video?.status ?? 'missing'}`}>{video?.status ?? text(locale, 'missing', 'غير موجود')}</span>{video?.failureReason && <small>{video.failureReason}</small>}</div>
          <label className={`button secondary full file-button ${busy === 'video' ? 'disabled' : ''}`}>{text(locale, 'Choose 30s video', 'اختر فيديو 30 ثانية')}<input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy === 'video'} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadVideo(file); }} /></label>
          {video && ['processing', 'uploading'].includes(video.status) && <button className="button primary full" disabled={busy === 'video'} onClick={() => void syncVideo()} type="button">{text(locale, 'Check processing', 'فحص المعالجة')}</button>}
          <p className="tiny muted">{text(locale, 'CVIDEO delivery is capped at 720p. Your CV remains optional and secondary.', 'عرض CVIDEO محدود بدقة 720p. السيرة الذاتية اختيارية وثانوية.')}</p>
          <hr />
          <span className="eyebrow">{text(locale, 'Optional CV', 'السيرة الذاتية الاختيارية')}</span>
          <h3>{profile.cvOriginalFilename ?? text(locale, 'No CV uploaded', 'لم يتم رفع سيرة ذاتية')}</h3>
          <label className={`button secondary full file-button ${busy === 'cv' ? 'disabled' : ''}`}>{text(locale, profile.cvOriginalFilename ? 'Replace PDF' : 'Choose PDF', profile.cvOriginalFilename ? 'استبدال PDF' : 'اختر PDF')}<input type="file" accept="application/pdf,.pdf" disabled={busy === 'cv'} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadCv(file); e.currentTarget.value = ''; }} /></label>
          {profile.cvOriginalFilename && <><button className="button secondary full" disabled={busy === 'cv'} onClick={() => void downloadCv()} type="button">{text(locale, 'Download my CV', 'تنزيل سيرتي الذاتية')}</button><button className="ghost full" disabled={busy === 'cv'} onClick={() => void deleteCv()} type="button">{text(locale, 'Delete CV', 'حذف السيرة الذاتية')}</button></>}
          <p className="tiny muted">{text(locale, 'PDF only, up to 10 MB. Stored privately and available only through authorized CVIDEO access.', 'ملف PDF فقط، حتى 10 ميجابايت. يُخزن بشكل خاص ولا يتاح إلا عبر وصول CVIDEO المصرح.')}</p>
        </aside>
      </div>
    </AppShell>
  );
}

function RecruiterSearch({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<CandidateSearchItem[]>([]);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [city, setCity] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [lists, setLists] = useState<SavedList[]>([]);
  const [listId, setListId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [showInterview, setShowInterview] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ opportunityTitle: '', startsAt: '', durationMinutes: 30, meetingType: 'google_meet' as Interview['meetingType'], message: '', location: '' });

  async function search(event?: FormEvent) {
    event?.preventDefault(); setBusy('search'); setError('');
    try {
      const params = new URLSearchParams({ pageSize: '20' });
      if (countryCode.trim()) params.set('countryCode', countryCode.trim().toUpperCase());
      if (city.trim()) params.set('city', city.trim());
      if (minExperience) params.set('minExperienceYears', minExperience);
      const result = await api.searchCandidates(params);
      setCandidates(result.items);
      if (result.items[0]) setSelected(await api.getCandidateDetail(result.items[0].id)); else setSelected(null);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  useEffect(() => {
    void search();
    void api.listSavedLists().then((result) => { setLists(result); setListId(result[0]?.id ?? ''); }).catch(() => undefined);
  }, []);

  async function chooseCandidate(candidateId: string) {
    setBusy('candidate'); setError('');
    try { setSelected(await api.getCandidateDetail(candidateId)); } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function startChat() {
    if (!selected) return; setBusy('chat'); setError('');
    try { const conversation = await api.createConversation(selected.id); navigate(`/recruiter/messages?conversation=${encodeURIComponent(conversation.id)}`); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function downloadCandidateCv() {
    if (!selected?.cvOriginalFilename) return;
    setBusy('cv'); setError('');
    try {
      const blob = await api.downloadCandidateCv(selected.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = selected.cvOriginalFilename; link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function saveCandidate() {
    if (!selected) return; setBusy('save'); setError(''); setNotice('');
    try {
      let target = listId;
      if (!target) {
        const created = await api.createSavedList(text(locale, 'My Candidates', 'مرشحوني'));
        setLists((current) => [created, ...current]); target = created.id; setListId(created.id);
      }
      await api.addCandidateToList(target, selected.id);
      setNotice(text(locale, 'Candidate saved.', 'تم حفظ المرشح.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function requestInterview(event: FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy('interview'); setError(''); setNotice('');
    try {
      if (!interviewForm.startsAt) throw new Error(text(locale, 'Choose an interview date and time.', 'اختر تاريخ ووقت المقابلة.'));
      await api.createInterview({
        candidateId: selected.id,
        opportunityTitle: interviewForm.opportunityTitle,
        startsAtUtc: new Date(interviewForm.startsAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        durationMinutes: interviewForm.durationMinutes,
        meetingType: interviewForm.meetingType,
        message: interviewForm.message || undefined,
        location: interviewForm.meetingType === 'in_person' ? interviewForm.location : undefined,
      });
      setShowInterview(false); setNotice(text(locale, 'Interview request sent.', 'تم إرسال طلب المقابلة.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  return (
    <AppShell locale={locale} setLocale={setLocale}>
      <PageHead eyebrow={text(locale, 'Talent discovery', 'اكتشاف المواهب')} title={text(locale, 'Search. Watch. Decide faster.', 'ابحث. شاهد. قرر أسرع.')} description={text(locale, 'Video first, professional evidence second. No match scores and no application pipeline.', 'الفيديو أولاً، ثم الأدلة المهنية. لا درجات مطابقة ولا مسار طلبات.')}/>
      {error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}
      <div className="discovery-grid live-discovery">
        <aside className="filter-panel panel">
          <form onSubmit={search} className="form-stack">
            <div><span className="eyebrow">{text(locale, 'Filters', 'الفلاتر')}</span><h2>{text(locale, 'Find talent', 'ابحث عن المواهب')}</h2></div>
            <label>{text(locale, 'Country code', 'رمز الدولة')}<input placeholder="JO" maxLength={2} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} /></label>
            <label>{text(locale, 'City', 'المدينة')}<input placeholder={text(locale, 'Amman', 'عمّان')} value={city} onChange={(e) => setCity(e.target.value)} /></label>
            <label>{text(locale, 'Minimum experience', 'الحد الأدنى للخبرة')}<input type="number" min={0} max={80} placeholder="0" value={minExperience} onChange={(e) => setMinExperience(e.target.value)} /></label>
            <button className="button primary full" disabled={busy === 'search'}>{text(locale, 'Search', 'بحث')}</button>
          </form>
          <div className="result-list"><small>{candidates.length} {text(locale, 'results', 'نتيجة')}</small>{candidates.map((candidate) => <button key={candidate.id} type="button" className={`result-card ${selected?.id === candidate.id ? 'active' : ''}`} onClick={() => void chooseCandidate(candidate.id)}><span className="mini-avatar">{candidate.displayName.slice(0, 1)}</span><span><strong>{candidate.displayName}</strong><small>{candidate.headline || text(locale, 'Professional', 'مهني')} · {candidate.city}</small></span></button>)}</div>
        </aside>

        <section className="portrait-video recruiter-video-stage">
          {selected?.introductionVideoUrl ? <HlsVideo src={selected.introductionVideoUrl} poster={selected.introductionVideoThumbnailUrl} className="discovery-video" /> : <div className="portrait-placeholder"><span>▶</span><b>{candidates.length ? text(locale, 'Loading Introduction Video…', 'جاري تحميل الفيديو التعريفي…') : text(locale, 'Search to discover candidates', 'ابحث لاكتشاف المرشحين')}</b></div>}
          {selected && <div className="video-caption"><span className="video-badge">30s {text(locale, 'Introduction Video', 'فيديو تعريفي')}</span><strong>{selected.displayName}</strong><small>{selected.headline}</small></div>}
        </section>

        <aside className="candidate-panel panel">
          {!selected ? <div className="empty-state tall">{text(locale, 'Candidate details appear here.', 'ستظهر تفاصيل المرشح هنا.')}</div> : <>
            <span className="eyebrow">{text(locale, 'Candidate', 'مرشح')}</span><h1>{selected.displayName}</h1><h3>{selected.headline || text(locale, 'Professional candidate', 'مرشح مهني')}</h3><p className="muted">{selected.city}, {selected.countryCode} · {selected.yearsExperience} {text(locale, 'years experience', 'سنوات خبرة')}</p>
            {selected.professionalSummary && <p className="candidate-summary">{selected.professionalSummary}</p>}
            <div className="evidence-row"><span>{selected.skillIds.length} {text(locale, 'skills', 'مهارات')}</span><span>{selected.certificates.length} {text(locale, 'certificates', 'شهادات')}</span><span>{selected.experience.length} {text(locale, 'roles', 'خبرات')}</span></div>
            <div className="action-stack">
              <div className="inline-save"><select value={listId} onChange={(e) => setListId(e.target.value)}><option value="">{text(locale, 'Auto-create list', 'إنشاء قائمة تلقائياً')}</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><button className="button secondary" disabled={busy === 'save'} onClick={() => void saveCandidate()}>{text(locale, 'Save', 'حفظ')}</button></div>
              <button className="button secondary full" disabled={busy === 'chat'} onClick={() => void startChat()}>{text(locale, 'Start Chat', 'بدء محادثة')}</button>
              {selected.cvOriginalFilename && <button className="button secondary full" disabled={busy === 'cv'} onClick={() => void downloadCandidateCv()}>{text(locale, 'Download CV', 'تنزيل السيرة الذاتية')}</button>}
              <button className="button primary full" onClick={() => { setInterviewForm((current) => ({ ...current, opportunityTitle: selected.headline || '' })); setShowInterview(true); }}>{t(locale, 'requestInterview')}</button>
            </div>
            <details className="evidence-details"><summary>{text(locale, 'Open full professional evidence', 'عرض التفاصيل المهنية الكاملة')}</summary><div><h4>{text(locale, 'Experience', 'الخبرة')}</h4>{selected.experience.map((item, index) => <p key={index}>{String(item.jobTitle ?? '')} · {String(item.companyName ?? '')}</p>)}<h4>{text(locale, 'Education', 'التعليم')}</h4>{selected.education.map((item, index) => <p key={index}>{String(item.qualification ?? '')} · {String(item.institution ?? '')}</p>)}<h4>{text(locale, 'Certificates', 'الشهادات')}</h4>{selected.certificates.map((item, index) => <p key={index}>{String(item.name ?? '')}</p>)}</div></details>
          </>}
        </aside>
      </div>

      {showInterview && selected && <div className="modal-backdrop" onMouseDown={() => setShowInterview(false)}><form className="modal-card" onSubmit={requestInterview} onMouseDown={(e) => e.stopPropagation()}><div className="panel-head"><div><span className="eyebrow">{text(locale, 'Interview request', 'طلب مقابلة')}</span><h2>{selected.displayName}</h2></div><button className="ghost" type="button" onClick={() => setShowInterview(false)}>✕</button></div><label>{text(locale, 'Role / opportunity title', 'المسمى / الفرصة')}<input required value={interviewForm.opportunityTitle} onChange={(e) => setInterviewForm({ ...interviewForm, opportunityTitle: e.target.value })} /></label><label>{text(locale, 'Date & time', 'التاريخ والوقت')}<input type="datetime-local" required value={interviewForm.startsAt} onChange={(e) => setInterviewForm({ ...interviewForm, startsAt: e.target.value })} /></label><div className="form-grid two"><label>{text(locale, 'Duration', 'المدة')}<select value={interviewForm.durationMinutes} onChange={(e) => setInterviewForm({ ...interviewForm, durationMinutes: Number(e.target.value) })}><option value={20}>20 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></label><label>{text(locale, 'Type', 'النوع')}<select value={interviewForm.meetingType} onChange={(e) => setInterviewForm({ ...interviewForm, meetingType: e.target.value as Interview['meetingType'] })}><option value="google_meet">Google Meet</option><option value="video_call">{text(locale, 'Video call', 'مكالمة فيديو')}</option><option value="in_person">{text(locale, 'In person', 'حضوري')}</option></select></label></div>{interviewForm.meetingType === 'in_person' && <label>{text(locale, 'Location', 'الموقع')}<input required value={interviewForm.location} onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })} /></label>}<label>{text(locale, 'Message', 'رسالة')}<textarea rows={3} value={interviewForm.message} onChange={(e) => setInterviewForm({ ...interviewForm, message: e.target.value })} /></label><button className="button primary full" disabled={busy === 'interview'}>{text(locale, 'Send interview request', 'إرسال طلب المقابلة')}</button></form></div>}
    </AppShell>
  );
}

function SavedListsPage({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [selected, setSelected] = useState<SavedList | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try { const result = await api.listSavedLists(); setLists(result); if (result[0]) setSelected(await api.getSavedList(result[0].id)); }
    catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent) {
    event.preventDefault(); if (!newName.trim()) return;
    try { const created = await api.createSavedList(newName.trim()); setNewName(''); setLists((current) => [created, ...current]); setSelected(created); }
    catch (err) { setError(errorMessage(err)); }
  }

  async function openList(id: string) {
    try { setSelected(await api.getSavedList(id)); } catch (err) { setError(errorMessage(err)); }
  }

  return <AppShell locale={locale} setLocale={setLocale}><PageHead eyebrow={text(locale, 'Saved Lists', 'القوائم المحفوظة')} title={text(locale, 'Organize people, not applications', 'نظّم الأشخاص، لا طلبات التوظيف')} description={text(locale, 'Saved Lists are private company collections, never ATS stages.', 'القوائم المحفوظة مجموعات خاصة بالشركة وليست مراحل توظيف.')}/>{error && <div className="notice error">{error}</div>}<div className="saved-layout"><section className="panel"><form className="inline-form" onSubmit={create}><input placeholder={text(locale, 'New list name', 'اسم قائمة جديدة')} value={newName} onChange={(e) => setNewName(e.target.value)} /><button className="button primary">＋</button></form><div className="list-stack">{lists.map((list) => <button className={`saved-list-card ${selected?.id === list.id ? 'active' : ''}`} key={list.id} onClick={() => void openList(list.id)}><div><strong>{list.name}</strong><small>{list.description || text(locale, 'Candidate collection', 'مجموعة مرشحين')}</small></div><b>{list.candidateCount}</b></button>)}</div></section><section className="panel"><span className="eyebrow">{text(locale, 'Selected list', 'القائمة المختارة')}</span><h2>{selected?.name || text(locale, 'Choose a list', 'اختر قائمة')}</h2>{selected?.candidateIds?.length ? <div className="candidate-id-list">{selected.candidateIds.map((id) => <div key={id}><span className="mini-avatar">C</span><code>{id}</code></div>)}</div> : <div className="empty-state">{text(locale, 'Save candidates from Search and they will appear here.', 'احفظ المرشحين من البحث وسيظهرون هنا.')}</div>}</section></div></AppShell>;
}

function MessagesPage({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { principal } = useAuth();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState<Array<{ id: string; candidateId: string; lastMessageAt: string | null }>>([]);
  const [activeId, setActiveId] = useState(params.get('conversation') ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  async function loadConversations() {
    try {
      const result = await api.listConversations(); setConversations(result);
      const target = activeId || result[0]?.id || '';
      if (target) { setActiveId(target); setMessages(await api.listMessages(target)); }
    } catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { void loadConversations(); }, []);

  async function openConversation(id: string) {
    setActiveId(id); setError('');
    try { setMessages(await api.listMessages(id)); } catch (err) { setError(errorMessage(err)); }
  }

  async function send(event: FormEvent) {
    event.preventDefault(); if (!activeId || !draft.trim()) return;
    try { const sent = await api.sendMessage(activeId, draft.trim()); setMessages((current) => [...current, sent]); setDraft(''); }
    catch (err) { setError(errorMessage(err)); }
  }

  const candidate = principal?.effectiveRole === 'candidate';
  return <AppShell locale={locale} setLocale={setLocale}><PageHead eyebrow={text(locale, 'Messages', 'الرسائل')} title={candidate ? text(locale, 'Company conversations', 'محادثات الشركات') : text(locale, 'Candidate conversations', 'محادثات المرشحين')} description={candidate ? text(locale, 'You can reply after a company starts the conversation.', 'يمكنك الرد بعد أن تبدأ الشركة المحادثة.') : text(locale, 'Start contact from Search, then continue the professional conversation here.', 'ابدأ التواصل من البحث ثم أكمل المحادثة المهنية هنا.')}/>{error && <div className="notice error">{error}</div>}<div className="messages-layout"><aside className="conversation-list panel">{conversations.length === 0 ? <div className="empty-state">{text(locale, 'No conversations yet.', 'لا توجد محادثات بعد.')}</div> : conversations.map((conversation) => <button className={`conversation-card ${activeId === conversation.id ? 'active' : ''}`} key={conversation.id} onClick={() => void openConversation(conversation.id)}><span className="mini-avatar">C</span><span><strong>{candidate ? text(locale, 'Company conversation', 'محادثة شركة') : text(locale, 'Candidate', 'مرشح')}</strong><small>{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : text(locale, 'New conversation', 'محادثة جديدة')}</small></span></button>)}</aside><section className="chat-panel panel">{!activeId ? <div className="empty-state tall">{text(locale, 'Choose a conversation.', 'اختر محادثة.')}</div> : <><div className="chat-messages">{messages.map((message) => <div key={message.id} className={`bubble ${message.senderUserId === principal?.userId ? 'mine' : ''}`}><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>)}</div><form className="composer" onSubmit={send}><textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={text(locale, 'Write a professional message…', 'اكتب رسالة مهنية…')} /><button className="button primary">{text(locale, 'Send', 'إرسال')}</button></form></>}</section></div></AppShell>;
}

function CompanyAccount({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const { principal } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [verification, setVerification] = useState<CompanyVerificationStatusView | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const [items, status, company, team] = await Promise.all([api.listInterviews(), api.getCompanyVerification(), api.getCompanyProfile(), api.listCompanyMembers()]);
      setInterviews(items); setVerification(status); setProfile(company); setMembers(team);
    } catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (!profile || (principal?.effectiveRole !== 'company_owner' && principal?.effectiveRole !== 'company_admin')) return;
    setBusy('profile'); setError(''); setNotice('');
    try {
      const updated = await api.updateCompanyProfile({ name: profile.name, city: profile.city, industry: profile.industry, companySize: profile.companySize, website: profile.website, description: profile.description });
      setProfile(updated); setNotice(text(locale, 'Company profile saved.', 'تم حفظ ملف الشركة.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function updateMember(member: CompanyMember, next: Pick<CompanyMember, 'role' | 'status'>) {
    setBusy(member.id); setError(''); setNotice('');
    try {
      const updated = await api.updateCompanyMember(member.id, next);
      setMembers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(text(locale, 'Team member updated.', 'تم تحديث عضو الفريق.'));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  const canEditProfile = principal?.effectiveRole === 'company_owner' || principal?.effectiveRole === 'company_admin';
  function canManage(member: CompanyMember) {
    if (member.id === principal?.companyMemberId || member.role === 'company_owner') return false;
    if (principal?.effectiveRole === 'company_owner') return true;
    return principal?.effectiveRole === 'company_admin' && member.role === 'recruiter';
  }

  return <AppShell locale={locale} setLocale={setLocale}>
    <PageHead eyebrow={text(locale, 'Company Account', 'حساب الشركة')} title={profile?.name ?? verification?.companyName ?? text(locale, 'Company workspace', 'مساحة الشركة')} description={text(locale, 'Manage your company profile, verification state and authorized team.', 'أدر ملف شركتك وحالة التحقق والفريق المصرح له.')}/>
    {error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}
    <div className="metric-grid"><Metric label={text(locale, 'Role', 'الدور')} value={principal?.effectiveRole.replaceAll('_', ' ') ?? ''}/><Metric label={text(locale, 'Verification', 'التحقق')} value={verification?.verificationStatus.toUpperCase() ?? '—'}/><Metric label={text(locale, 'Account status', 'حالة الحساب')} value={verification?.operationalStatus.toUpperCase() ?? '—'}/><Metric label={text(locale, 'Interview requests', 'طلبات المقابلة')} value={String(interviews.length)}/></div>
    {verification && <section className="panel"><span className="eyebrow">{text(locale, 'Company verification', 'التحقق من الشركة')}</span><h2>{verification.countryCode} · {verification.commercialRegistrationNumber}</h2><p className="muted">{verification.verificationStatus === 'pending' ? text(locale, 'Your registration is awaiting manual CVIDEO review.', 'سجل شركتك بانتظار مراجعة يدوية من CVIDEO.') : verification.verificationStatus === 'verified' ? text(locale, 'Your company registration has been verified.', 'تم التحقق من سجل شركتك.') : text(locale, `Verification rejected: ${verification.rejectionReason ?? 'Contact support for details.'}`, `تم رفض التحقق: ${verification.rejectionReason ?? 'تواصل مع الدعم للتفاصيل.'}`)}</p></section>}
    {profile && <form className="panel form-grid two" onSubmit={saveProfile}><div className="panel-head span-two"><div><span className="eyebrow">{text(locale, 'Company profile', 'ملف الشركة')}</span><h2>{text(locale, 'Public business details', 'بيانات الشركة')}</h2></div>{canEditProfile && <button className="button primary" disabled={busy === 'profile'}>{text(locale, 'Save changes', 'حفظ التغييرات')}</button>}</div><label>{text(locale, 'Company name', 'اسم الشركة')}<input value={profile.name} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, name: e.target.value })}/></label><label>{text(locale, 'City', 'المدينة')}<input value={profile.city} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, city: e.target.value })}/></label><label>{text(locale, 'Industry', 'القطاع')}<input value={profile.industry ?? ''} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, industry: e.target.value || null })}/></label><label>{text(locale, 'Company size', 'حجم الشركة')}<input value={profile.companySize ?? ''} disabled={!canEditProfile} placeholder="11-50" onChange={(e) => setProfile({ ...profile, companySize: e.target.value || null })}/></label><label className="span-two">{text(locale, 'Website', 'الموقع الإلكتروني')}<input type="url" value={profile.website ?? ''} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, website: e.target.value || null })}/></label><label className="span-two">{text(locale, 'Description', 'الوصف')}<textarea rows={4} value={profile.description ?? ''} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, description: e.target.value || null })}/></label><p className="tiny muted span-two">{text(locale, 'Country and Commercial Registration Number are read-only because changing them requires a new verification policy.', 'الدولة ورقم السجل التجاري للقراءة فقط لأن تغييرهما يتطلب سياسة تحقق جديدة.')}</p></form>}
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">{text(locale, 'Authorized team', 'الفريق المصرح')}</span><h2>{members.length} {text(locale, 'members', 'أعضاء')}</h2></div></div>{members.length === 0 ? <div className="empty-state">{text(locale, 'No team members found.', 'لم يتم العثور على أعضاء.')}</div> : members.map((member) => <article className="interview-row" key={member.id}><div><span className={`status ${member.status}`}>{member.status}</span><h3>{member.email}</h3><p>{member.role.replaceAll('_', ' ')}</p></div>{canManage(member) && <div className="actions compact-actions">{principal?.effectiveRole === 'company_owner' && <select value={member.role} disabled={busy === member.id} onChange={(e) => void updateMember(member, { role: e.target.value as CompanyMember['role'], status: member.status })}><option value="company_admin">{text(locale, 'Company admin', 'مدير الشركة')}</option><option value="recruiter">{text(locale, 'Recruiter', 'مسؤول توظيف')}</option></select>}<button type="button" className="button secondary small" disabled={busy === member.id} onClick={() => void updateMember(member, { role: member.role, status: member.status === 'active' ? 'suspended' : 'active' })}>{member.status === 'active' ? text(locale, 'Suspend', 'تعليق') : text(locale, 'Reactivate', 'إعادة تفعيل')}</button></div>}</article>) }<p className="tiny muted">{text(locale, 'Secure email invitations are intentionally deferred until the delivery and token policy is approved.', 'تم تأجيل دعوات البريد الآمنة حتى اعتماد سياسة الإرسال والرموز.')}</p></section>
    <section className="panel"><h2>{text(locale, 'Recent interview activity', 'نشاط المقابلات الأخير')}</h2>{interviews.length === 0 ? <div className="empty-state">{text(locale, 'No interviews requested yet.', 'لا توجد مقابلات بعد.')}</div> : interviews.slice(0, 8).map((item) => <article className="interview-row" key={item.id}><div><span className={`status ${item.status}`}>{item.status}</span><h3>{item.opportunityTitle}</h3><p>{new Date(item.startsAtUtc).toLocaleString()}</p></div></article>)}</section>
  </AppShell>;
}

function AdminPage({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const [items, setItems] = useState<CompanyVerification[]>([]);
  const [filter, setFilter] = useState<CompanyVerification['verificationStatus'] | 'all'>('pending');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(nextFilter = filter) {
    setError('');
    try { setItems(await api.listCompanyVerifications(nextFilter === 'all' ? undefined : nextFilter)); }
    catch (err) { setError(errorMessage(err)); }
  }
  useEffect(() => { void load(); }, []);

  async function decide(item: CompanyVerification, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? window.prompt(text(locale, 'Enter the rejection reason:', 'أدخل سبب الرفض:')) : null;
    if (action === 'reject' && !reason?.trim()) return;
    const note = window.prompt(text(locale, 'Optional internal review note:', 'ملاحظة مراجعة داخلية اختيارية:')) ?? undefined;
    setBusy(item.id); setError(''); setNotice('');
    try {
      if (action === 'approve') await api.approveCompanyVerification(item.id, note?.trim() || undefined);
      else await api.rejectCompanyVerification(item.id, reason!.trim(), note?.trim() || undefined);
      setNotice(action === 'approve' ? text(locale, 'Company verified.', 'تم التحقق من الشركة.') : text(locale, 'Verification rejected.', 'تم رفض التحقق.'));
      await load();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  async function toggleCompany(item: CompanyVerification) {
    const next = item.operationalStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(text(locale, `${next === 'suspended' ? 'Suspend' : 'Activate'} ${item.companyName}?`, `${next === 'suspended' ? 'تعليق' : 'تفعيل'} ${item.companyName}؟`))) return;
    setBusy(item.companyId); setError('');
    try { await api.setCompanyOperationalStatus(item.companyId, next); await load(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  }

  return <AppShell locale={locale} setLocale={setLocale}>
    <PageHead eyebrow={text(locale, 'Protected administration', 'الإدارة المحمية')} title={text(locale, 'Company verification', 'التحقق من الشركات')} description={text(locale, 'Manual registry review with explicit decisions and audit events.', 'مراجعة يدوية للسجل مع قرارات واضحة وسجل تدقيق.')}/>
    {error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}
    <section className="panel">
      <div className="panel-head"><div><span className="eyebrow">{text(locale, 'Verification queue', 'قائمة التحقق')}</span><h2>{items.length} {text(locale, 'records', 'سجلات')}</h2></div><select value={filter} onChange={(e) => { const value = e.target.value as typeof filter; setFilter(value); void load(value); }}><option value="pending">{text(locale, 'Pending', 'قيد الانتظار')}</option><option value="verified">{text(locale, 'Verified', 'تم التحقق')}</option><option value="rejected">{text(locale, 'Rejected', 'مرفوض')}</option><option value="all">{text(locale, 'All', 'الكل')}</option></select></div>
      {items.length === 0 ? <div className="empty-state tall">{text(locale, 'No verification records in this view.', 'لا توجد سجلات تحقق في هذا العرض.')}</div> : items.map((item) => <article className="interview-row" key={item.id}><div><span className={`status ${item.verificationStatus}`}>{item.verificationStatus}</span><h3>{item.companyName}</h3><p>{item.city}, {item.countryCode} · {text(locale, 'CR', 'السجل')}: {item.commercialRegistrationNumber}</p><small>{item.submittedByEmail} · {new Date(item.createdAt).toLocaleString()}</small>{item.rejectionReason && <p className="notice error">{item.rejectionReason}</p>}</div><div className="actions compact-actions">{item.verificationStatus === 'pending' && <><button className="button primary small" disabled={busy === item.id} onClick={() => void decide(item, 'approve')}>{text(locale, 'Approve', 'موافقة')}</button><button className="button secondary small" disabled={busy === item.id} onClick={() => void decide(item, 'reject')}>{text(locale, 'Reject', 'رفض')}</button></>}<button className="ghost small" disabled={busy === item.companyId} onClick={() => void toggleCompany(item)}>{item.operationalStatus === 'active' ? text(locale, 'Suspend company', 'تعليق الشركة') : text(locale, 'Activate company', 'تفعيل الشركة')}</button></div></article>)}
    </section>
  </AppShell>;
}

export function App() {
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem('cvideo_locale') as Locale | null) ?? 'ar');
  const dir = useMemo(() => direction(locale), [locale]);

  function setLocale(next: Locale) { localStorage.setItem('cvideo_locale', next); setLocaleState(next); }

  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = dir; }, [locale, dir]);

  return (
    <Routes>
      <Route path="/" element={<Landing locale={locale} setLocale={setLocale} />} />
      <Route path="/login" element={<LoginPage locale={locale} setLocale={setLocale} />} />
      <Route path="/register/candidate" element={<CandidateRegister locale={locale} setLocale={setLocale} />} />
      <Route path="/register/company" element={<CompanyRegister locale={locale} setLocale={setLocale} />} />
      <Route path="/candidate/home" element={<RequireRole roles={['candidate']}><CandidateHome locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/candidate/profile" element={<RequireRole roles={['candidate']}><CandidateProfilePage locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/candidate/messages" element={<RequireRole roles={['candidate']}><MessagesPage locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/recruiter/search" element={<RequireRole roles={companyRoles}><RecruiterSearch locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/recruiter/saved-lists" element={<RequireRole roles={companyRoles}><SavedListsPage locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/recruiter/messages" element={<RequireRole roles={companyRoles}><MessagesPage locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/recruiter/account" element={<RequireRole roles={companyRoles}><CompanyAccount locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="/admin" element={<RequireRole roles={['super_admin']}><AdminPage locale={locale} setLocale={setLocale} /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
