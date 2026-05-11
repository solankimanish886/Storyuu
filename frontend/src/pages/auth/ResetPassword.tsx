import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import LoginCollage from '@/components/auth/LoginCollage';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center text-white">
        <h1 className="mb-2 text-2xl font-bold">Invalid link</h1>
        <p className="mb-6 text-sm text-neutral-400">This reset link is missing a token.</p>
        <Link to="/forgot-password" className="text-brand-cyan hover:underline">
          Request a new one
        </Link>
      </div>
    );
  }

  function validate() {
    const e: typeof errors = {};
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
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
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: any) {
      setErrors({ form: err.response?.data?.error ?? 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary text-white overflow-x-hidden">
      {/* Top Collage Section */}
      <div className="relative">
        <LoginCollage />
        <Link 
          to="/login" 
          className="absolute top-6 left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-8 pb-12 -mt-16 relative z-10">
        {!done ? (
          <>
            <h1 className="text-center text-[28px] md:text-display-m font-bold leading-tight mb-16">
              Reset your password
            </h1>

            <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm flex flex-col gap-5">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  placeholder="New Password"
                  className="w-full bg-white/5 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && <p className="mt-1 text-xs text-status-error ml-1">{errors.password}</p>}
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-brand-cyan transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full bg-white/5 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-brand-cyan transition-all"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {errors.confirm && <p className="mt-1 text-xs text-status-error ml-1">{errors.confirm}</p>}
              </div>

              {errors.form && (
                <p className="rounded-md bg-status-error/10 px-3 py-2 text-sm text-status-error text-center">
                  {errors.form}
                </p>
              )}

              <Button 
                type="submit" 
                variant="cyan" 
                loading={loading} 
                className="w-full py-4 font-bold rounded-md text-base mt-2 shadow-lg shadow-brand-cyan/20"
              >
                Confirm
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-[28px] md:text-display-m font-bold leading-tight mb-4 max-w-[340px]">
              Your Password has been changed.
            </h1>
            <p className="text-white text-[22px] font-medium leading-tight mb-20 max-w-[320px]">
              Go back and try logging in with the new password.
            </p>

            <Button 
              type="button" 
              variant="cyan" 
              className="w-full max-w-sm py-4 font-bold rounded-md text-base shadow-lg shadow-brand-cyan/20"
              onClick={() => navigate('/login')}
            >
              Back to Login Page
            </Button>
          </div>
        )}

        {/* Logo at bottom */}
        <div className="mt-16">
          <Logo variant="hori-tag" className="hidden h-12 md:block" />
          <Logo variant="mark" className="h-10 md:hidden" />
        </div>
      </div>
    </div>
  );
}
