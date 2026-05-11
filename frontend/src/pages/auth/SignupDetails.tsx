import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function SignupDetails() {
  const navigate = useNavigate();
  const { user, accessToken, setSession } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<{ firstName?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // Guard: step 1 must be completed first
  if (!user || !accessToken) {
    navigate('/signup', { replace: true });
    return null;
  }

  function validate() {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = 'First name is required.';
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
      const { data } = await api.post<{ user: AuthUser }>('/auth/signup', {
        firstName: firstName.trim(),
        ...(lastName.trim() && { lastName: lastName.trim() }),
      });
      setSession(data.user, accessToken!);
      navigate('/signup/verify-email');
    } catch (err: any) {
      setErrors({ form: err.response?.data?.error ?? 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md md:rounded-2xl md:border md:border-white/10 md:bg-white/5 md:p-10 md:backdrop-blur-md md:shadow-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-cyan">
          Step 2 of 2
        </p>
        <h1 className="mb-1 text-2xl font-bold text-white">Tell us your name</h1>
        <p className="mb-8 text-sm text-neutral-400">So authors can greet you properly.</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            autoComplete="given-name"
            autoFocus
          />
          <Input
            label="Last name (optional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
          {errors.form && (
            <p className="rounded-md bg-status-error/10 px-3 py-2 text-sm text-status-error">
              {errors.form}
            </p>
          )}
          <Button type="submit" loading={loading} className="mt-2">
            Finish setup
          </Button>
        </form>
      </div>
    </div>
  );
}
