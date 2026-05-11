import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import type { AuthUser } from '@/store/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 1. Get user profile using the new token
      api.get<{ user: AuthUser }>('/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ data }) => {
        // 2. Save session
        setSession(data.user, token);
        // 3. Go home
        navigate('/home', { replace: true });
      }).catch((err) => {
        console.error('Failed to hydrate session after social login:', err);
        navigate('/login?error=social_failed', { replace: true });
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary text-white">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-400 animate-pulse">Completing secure login...</p>
      </div>
    </div>
  );
}
