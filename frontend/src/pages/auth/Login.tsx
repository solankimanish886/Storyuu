import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';

import Button from '@/components/ui/Button';
import LoginCollage from '@/components/auth/LoginCollage';
import Logo from '@/components/ui/Logo';


export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('storyuu.session_ended')) {
      sessionStorage.removeItem('storyuu.session_ended');
      setSessionNotice('Your session has ended. Please log in again.');
    }
  }, []);

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required.';
    if (!password) e.password = 'Password is required.';
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      setSession(data.user, data.accessToken);
      const defaultRedirect = (data.user.role === 'admin' || data.user.role === 'superadmin')
        ? '/admin/dashboard'
        : '/home';
      const redirect = searchParams.get('redirect') ?? defaultRedirect;
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const data = err.response?.data as { error?: string; issues?: Record<string, string[]> } | undefined;
      if (!err.response) {
        setErrors({ form: 'Cannot connect to server. Please check your connection.' });
      } else if (data?.issues) {
        const issues = data.issues;
        setErrors({
          email: issues.email?.[0],
          password: issues.password?.[0],
          form: !issues.email && !issues.password ? (data.error ?? 'Invalid input.') : undefined,
        });
      } else {
        setErrors({ form: data?.error ?? 'Something went wrong. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white overflow-x-hidden">
      {/* Top Collage Section */}
      <LoginCollage />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-8 pb-12 -mt-16 relative z-10">
        <h1 className="text-center text-display-s md:text-display-m font-bold max-w-[280px] md:max-w-md leading-tight mb-10">
          Explore and co-create fictional worlds with us in just a few minutes
        </h1>

        {sessionNotice && (
          <p className="w-full max-w-sm rounded-md bg-brand-cyan/10 border border-brand-cyan/20 px-3 py-2 text-sm text-brand-cyan text-center mb-2">
            {sessionNotice}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm flex flex-col gap-5">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
              <Mail size={20} />
            </div>
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full bg-white/5 border border-neutral-700 rounded-md py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="mt-1 text-xs text-status-error">{errors.email}</p>}
          </div>

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
              <Lock size={20} />
            </div>
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/5 border border-neutral-700 rounded-md py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="mt-1 text-xs text-status-error">{errors.password}</p>}
          </div>

          <div className="flex justify-start -mt-2">
            <Link to="/forgot-password" className="text-sm text-neutral-400 hover:text-white underline decoration-neutral-700 underline-offset-4">
              Forgot Password
            </Link>
          </div>

          {errors.form && (
            <p className="rounded-md bg-status-error/10 px-3 py-2 text-sm text-status-error text-center">
              {errors.form}
            </p>
          )}

          <Button type="submit" variant="cyan" loading={loading} className="w-full py-4 font-bold rounded-md text-base mt-2">
            Let's do it!
          </Button>

          {/* Social Logins */}
          <div className="mt-4">
            <button 
              type="button" 
              onClick={() => window.location.href = `${api.defaults.baseURL}/auth/google`}
              className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 py-3 rounded-md text-sm font-semibold hover:bg-neutral-100 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4" />
              Google Account
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm font-medium">
          Don’t have an account?{' '}
          <Link to="/signup" className="text-brand-orange hover:underline font-bold ml-1">
            Sign up
          </Link>
        </p>

        {/* Logo at bottom */}
        <div className="mt-16">
          <Logo variant="hori-tag" className="hidden h-12 md:block" />
          <Logo variant="mark" className="h-10 md:hidden" />
        </div>
      </div>
    </div>
  );
}
