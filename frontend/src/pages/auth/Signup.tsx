import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import SignupStep1 from '@/components/auth/SignupStep1';
import SignupStep2 from '@/components/auth/SignupStep2';

const PENDING_PLAN_KEY = 'storyuu.pending_plan';

function resolvePendingPlan(searchParams: URLSearchParams): 'monthly' | 'yearly' | null {
  // URL param takes priority; fall back to localStorage set by Subscribe.tsx
  const fromUrl = searchParams.get('plan');
  const fromStorage = localStorage.getItem(PENDING_PLAN_KEY);
  const raw = fromUrl ?? fromStorage;
  return raw === 'monthly' || raw === 'yearly' ? raw : null;
}

// ---------------------------------------------------------------------------
// Full-screen overlay shown while the browser navigates to Stripe
// ---------------------------------------------------------------------------
function CheckoutRedirectOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0D0F14]">
      <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/20 border-t-brand-cyan" />
      <div className="text-center">
        <p className="text-[15px] font-semibold text-white">Redirecting to secure checkout…</p>
        <p className="mt-1 text-[13px] text-white/40">Please wait, you will be redirected to Stripe.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; name?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  // True while the Stripe checkout URL has been received and we're navigating away
  const [checkoutRedirecting, setCheckoutRedirecting] = useState(false);

  function validateStep1() {
    if (!email) {
      setErrors({ email: 'Email is required.' });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrors({ email: 'Enter a valid email address.' });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateStep2() {
    const e: typeof errors = {};
    if (!name) e.name = 'Name is required.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (Object.keys(e).length) {
      setErrors(e);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleStep1Continue() {
    if (!validateStep1()) return;
    setLoading(true);
    try {
      await api.post('/auth/check-email', { email });
      setStep(2);
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? '';
      setErrors({ email: msg || 'Email already in use.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      // 1. Create account (email + password)
      const { data: step1Data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/signup-step1', {
        email,
        password,
      });

      // Write token immediately so all subsequent requests are authenticated
      setSession(step1Data.user, step1Data.accessToken);

      // 2. Complete profile (first name) — use returned user to hydrate store with the name
      const { data: step2Data } = await api.post<{ user: AuthUser }>('/auth/signup', { firstName: name });
      updateUser(step2Data.user);

      // 3. Trigger checkout if a plan was selected before signup
      const plan = resolvePendingPlan(searchParams);
      // Clear storage regardless of outcome so stale entries don't affect future signups
      localStorage.removeItem(PENDING_PLAN_KEY);

      if (plan) {
        try {
          const { data: checkoutData } = await api.post<{ url: string }>('/subscriptions/checkout', { plan });

          // Show the redirect overlay before navigating — prevents the blank-page flash
          setCheckoutRedirecting(true);
          window.location.href = checkoutData.url;
          return;
        } catch {
          // Account is created and session is live. Checkout failed (most likely Stripe
          // is not configured in this environment). Send the authenticated user to the
          // Subscribe page where they can retry in one click.
          navigate(`/subscribe?plan=${plan}`, { replace: true });
          return;
        }
      }

      navigate('/home', { replace: true });
    } catch (err: any) {
      const data = err.response?.data as { error?: string; issues?: Record<string, string[]> } | undefined;
      if (data?.issues) {
        const issues = data.issues;
        const emailErr = issues.email?.[0];
        const passwordErr = issues.password?.[0];
        if (emailErr || passwordErr) {
          setErrors({ email: emailErr, password: passwordErr });
          if (emailErr) setStep(1);
        } else {
          setErrors({ form: data.error ?? 'Invalid input.' });
        }
      } else if (err.response) {
        setErrors({ form: data?.error ?? 'Something went wrong. Please try again.' });
      } else {
        setErrors({ form: 'Cannot connect to server. Please check your connection.' });
      }
    } finally {
      setLoading(false);
    }
  }

  // Show the Stripe redirect overlay as soon as we have the URL
  if (checkoutRedirecting) return <CheckoutRedirectOverlay />;

  if (step === 1) {
    return (
      <SignupStep1
        email={email}
        setEmail={setEmail}
        onContinue={handleStep1Continue}
        loading={loading}
        error={errors.email}
      />
    );
  }

  return (
    <SignupStep2
      name={name}
      setName={setName}
      password={password}
      setPassword={setPassword}
      onSubmit={handleSubmit}
      loading={loading}
      errors={errors}
    />
  );
}
