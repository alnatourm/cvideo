import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';

export function MobileLogout() {
  const { principal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const isCandidateProfile = principal?.effectiveRole === 'candidate' && location.pathname === '/candidate/profile';
  const isCompanyAccount = principal?.effectiveRole !== 'candidate' && principal?.effectiveRole !== 'super_admin' && location.pathname === '/recruiter/account';

  if (!principal || (!isCandidateProfile && !isCompanyAccount)) return null;

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
    <div className="mobile-account-actions">
      <style>{`
        .mobile-account-actions { display: none; }
        @media (max-width: 900px) {
          .mobile-account-actions {
            display: block;
            margin: -118px 18px 118px;
            position: relative;
            z-index: 2;
          }
          .mobile-account-logout {
            width: 100%;
            min-height: 52px;
            border: 1px solid #fecaca;
            border-radius: 14px;
            background: #fff;
            color: #b91c1c;
            font: inherit;
            font-weight: 800;
          }
          .mobile-account-logout:disabled { opacity: .65; }
        }
      `}</style>
      <button
        className="mobile-account-logout"
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
      >
        {busy ? (arabic ? 'جاري تسجيل الخروج…' : 'Signing out…') : (arabic ? 'تسجيل الخروج' : 'Logout')}
      </button>
    </div>
  );
}
