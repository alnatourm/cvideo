import { useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'ar';

const copy = {
  en: {
    how: 'How It Works',
    candidates: 'For Candidates',
    companies: 'For Companies',
    pricing: 'Pricing',
    login: 'Login',
    start: 'Get Started',
    eyebrow: 'Reverse Employment, powered by video',
    title: 'Meet the person before the CV.',
    body: 'Candidates build professional profiles with 30-second introduction videos. Companies search the talent pool, watch, save, start conversations and request interviews.',
    find: 'Find Talent',
    create: 'Create Your Profile',
    workflow: 'Search → Watch → Save → Chat → Interview',
  },
  ar: {
    how: 'كيف تعمل',
    candidates: 'للباحثين عن فرص',
    companies: 'للشركات',
    pricing: 'الأسعار',
    login: 'تسجيل الدخول',
    start: 'ابدأ الآن',
    eyebrow: 'التوظيف العكسي بالفيديو',
    title: 'تعرّف على الشخص قبل السيرة الذاتية.',
    body: 'ينشئ المرشح ملفاً مهنياً يتصدره فيديو تعريفي مدته 30 ثانية. تبحث الشركات في قاعدة المواهب، تشاهد وتحفظ الملفات وتبدأ المحادثات وتطلب المقابلات.',
    find: 'ابحث عن المواهب',
    create: 'أنشئ ملفك',
    workflow: 'ابحث ← شاهد ← احفظ ← تواصل ← مقابلة',
  },
} as const;

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const t = useMemo(() => copy[language], [language]);
  const isArabic = language === 'ar';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [language, isArabic]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CVIDEO home">CVIDEO</a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#how">{t.how}</a>
          <a href="#candidates">{t.candidates}</a>
          <a href="#companies">{t.companies}</a>
          <a href="#pricing">{t.pricing}</a>
        </nav>
        <div className="header-actions">
          <button className="language-button" type="button" onClick={() => setLanguage(isArabic ? 'en' : 'ar')}>
            {isArabic ? 'EN' : 'العربية'}
          </button>
          <button className="button ghost" type="button">{t.login}</button>
          <button className="button primary" type="button">{t.start}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.body}</p>
            <div className="hero-actions">
              <button className="button primary large" type="button">{t.find}</button>
              <button className="button secondary large" type="button">{t.create}</button>
            </div>
            <div className="workflow" aria-label="CVIDEO recruiter workflow">{t.workflow}</div>
          </div>

          <div className="video-card" aria-label="Candidate introduction video preview">
            <div className="video-surface">
              <div className="video-badge">30s Introduction Video</div>
              <div className="candidate-meta">
                <strong>Candidate Name</strong>
                <span>Senior Sales Manager</span>
                <span>Amman, Jordan · 6 years</span>
                <div className="chips"><span>Sales</span><span>B2B</span><span>CRM</span></div>
              </div>
            </div>
            <div className="candidate-actions">
              <button type="button">Save</button>
              <button type="button">Chat</button>
              <button className="primary" type="button">Request Interview</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
