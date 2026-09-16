import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

export function MobileLogout() {
  const { principal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const insideAuthenticatedApp =
    location.pathname.startsWith('/candidate/') ||
    location.pathname.startsWith('/recruiter/') ||
    location.pathname.startsWith('/admin');

  if (!principal || !insideAuthenticatedApp) return null;

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
      setBusy(false);
    }
  }

  const arabic = document.documentElement.lang === 'ar';

  return (
    <>
      <style>{`
        .mobile-logout-button {
          display: none;
        }
        @media (max-width: 900px) {
          .mobile-logout-button {
            display: inline-flex;
            position: fixed;
            right: 18px;
            bottom: 92px;
            z-index: 1200;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            padding: 0 16px;
            border: 1px solid rgba(255,255,255,.2);
            border-radius: 999px;
            background: #111a36;
            color: #fff;
            font: inherit;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(15,23,42,.22);
          }
          .mobile-logout-button:disabled {
            opacity: .65;
          }
        }
      `}</style>
      <button
        className="mobile-logout-button"
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        aria-label={arabic ? 'تسجيل الخروج' : 'Logout'}
      >
        {busy ? (arabic ? 'جاري الخروج…' : 'Signing out…') : (arabic ? 'تسجيل الخروج' : 'Logout')}
      </button>
    </>
  );
}
