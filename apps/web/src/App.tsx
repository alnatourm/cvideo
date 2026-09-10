import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { direction, type Locale, t } from './i18n';

function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <button className="ghost" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}

function PublicHeader({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <header className="header">
      <Link to="/" className="brand">CVIDEO</Link>
      <nav className="nav" aria-label="Public navigation">
        <a href="#how">How It Works</a>
        <a href="#candidates">For Candidates</a>
        <a href="#companies">For Companies</a>
        <Link to="/login">Login</Link>
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </nav>
    </header>
  );
}

function Landing({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div className="page-shell">
      <PublicHeader locale={locale} setLocale={setLocale} />
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">Reverse Employment, powered by video.</span>
            <h1>{t(locale, 'heroTitle')}</h1>
            <p>{t(locale, 'heroBody')}</p>
            <div className="actions">
              <Link className="button primary" to="/recruiter/search">{t(locale, 'findTalent')}</Link>
              <Link className="button secondary" to="/candidate/home">{t(locale, 'createProfile')}</Link>
            </div>
          </div>
          <div className="video-card" aria-label="Candidate introduction video preview">
            <div className="video-placeholder">30s</div>
            <div className="video-meta">
              <strong>Maya A.</strong>
              <span>Senior Graphic Designer · Amman · 6 years</span>
              <div className="chips"><span>Figma</span><span>Branding</span><span>Packaging</span></div>
            </div>
          </div>
        </section>
        <section id="how" className="section-grid">
          <article><b>1</b><h2>Search</h2><p>Filter professional profiles by role, skills, experience and location.</p></article>
          <article><b>2</b><h2>Watch</h2><p>Review a concise 30-second professional introduction video.</p></article>
          <article><b>3</b><h2>Connect</h2><p>Save candidates, start a conversation, and request an interview.</p></article>
        </section>
      </main>
    </div>
  );
}

function LoginShell() {
  return (
    <main className="center-card">
      <Link to="/" className="brand">CVIDEO</Link>
      <h1>Login</h1>
      <p className="muted">Visual shell only. Authentication is intentionally not implemented in Phase 1.</p>
      <label>Email<input type="email" placeholder="name@example.com" /></label>
      <label>Password<input type="password" placeholder="••••••••" /></label>
      <button className="button primary" type="button" disabled>Continue</button>
    </main>
  );
}

function CandidateHome({ locale }: { locale: Locale }) {
  return (
    <AppShell items={[t(locale, 'candidateHome'), t(locale, 'messages'), t(locale, 'profile')]}>
      <div className="dashboard-head"><div><span className="eyebrow">Candidate</span><h1>{t(locale, 'candidateHome')}</h1></div></div>
      <div className="metric-grid">
        <Metric label="Profile completeness" value="72%" />
        <Metric label="Video status" value="Ready" />
        <Metric label="Profile views" value="128" />
        <Metric label="Interview requests" value="3" />
      </div>
      <section className="panel"><h2>{t(locale, 'introVideo')}</h2><div className="wide-video">30s Introduction Video</div></section>
    </AppShell>
  );
}

function RecruiterSearch({ locale }: { locale: Locale }) {
  return (
    <AppShell items={[t(locale, 'recruiterSearch'), t(locale, 'savedLists'), t(locale, 'messages'), t(locale, 'companyAccount')]}>
      <div className="discovery-grid">
        <aside className="filter-panel"><h2>Search</h2><input placeholder="Role or skill" /><button className="filter-chip">Jordan</button><button className="filter-chip">5+ years</button><button className="filter-chip">English</button></aside>
        <section className="portrait-video"><span className="video-badge">30s Introduction Video</span><div className="portrait-placeholder">Video</div></section>
        <aside className="candidate-panel"><span className="eyebrow">Candidate</span><h1>Maya A.</h1><p>Senior Graphic Designer</p><p className="muted">Amman, Jordan · 6 years</p><div className="chips"><span>Figma</span><span>Branding</span><span>Packaging</span></div><button className="button secondary">Save</button><button className="button secondary">Start Chat</button><button className="button primary">{t(locale, 'requestInterview')}</button></aside>
      </div>
    </AppShell>
  );
}

function AdminShell() {
  return (
    <AppShell items={['Overview', 'Users', 'Candidates', 'Companies', 'Verification', 'Taxonomy', 'Audit']}>
      <span className="eyebrow">Protected admin preview</span><h1>Administration</h1><p className="muted">Phase 1 visual route shell. No admin authorization or data actions are implemented.</p>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>;
}

function AppShell({ items, children }: { items: string[]; children: React.ReactNode }) {
  return <div className="app-shell"><aside className="sidebar"><Link to="/" className="brand">CVIDEO</Link>{items.map((item) => <button key={item} className="side-item">{item}</button>)}</aside><main className="app-content">{children}</main></div>;
}

export function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const dir = useMemo(() => direction(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  return (
    <Routes>
      <Route path="/" element={<Landing locale={locale} setLocale={setLocale} />} />
      <Route path="/login" element={<LoginShell />} />
      <Route path="/candidate/home" element={<CandidateHome locale={locale} />} />
      <Route path="/recruiter/search" element={<RecruiterSearch locale={locale} />} />
      <Route path="/admin" element={<AdminShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
