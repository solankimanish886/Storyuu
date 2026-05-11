import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Status = 'pending' | 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'pending');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        if (user) updateUser({ ...user, isEmailVerified: true });
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.error ?? 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  }, []);

  if (status === 'verifying') {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
        <p className="mt-4 text-sm text-neutral-400">Verifying your email…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-success/20 text-3xl text-status-success">
          ✓
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Email verified!</h1>
        <p className="mb-8 text-sm text-neutral-400">Your account is fully active.</p>
        <button
          onClick={() => navigate('/home')}
          className="rounded-full bg-brand-orange px-8 py-3 text-sm font-semibold text-white hover:bg-brand-orange-deep transition-colors"
        >
          Start reading
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-error/20 text-3xl text-status-error">
          ✕
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Verification failed</h1>
        <p className="mb-8 text-sm text-neutral-400">{errorMsg}</p>
        <Link to="/login" className="text-sm text-brand-cyan hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  // status === 'pending' — no token in URL; user just signed up
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-cyan/10 text-3xl">
        📬
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">Check your inbox</h1>
      <p className="mb-2 text-sm text-neutral-400">
        We sent a verification link to{' '}
        <span className="font-medium text-white">{user?.email ?? 'your email'}</span>.
      </p>
      <p className="mb-8 text-sm text-neutral-500">It expires in 24 hours.</p>
      <button
        onClick={() => navigate('/home')}
        className="rounded-full bg-brand-orange px-8 py-3 text-sm font-semibold text-white hover:bg-brand-orange-deep transition-colors"
      >
        Continue to app
      </button>
    </div>
  );
}
