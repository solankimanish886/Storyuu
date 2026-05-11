import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Star,
  ExternalLink,
  Loader2,
  Zap,
  Headphones,
  Vote,
  BookOpen,
  Crown,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Logo from '@/components/ui/Logo';

type BillingPlan = 'monthly' | 'yearly';

const MONTHLY_PRICE = 15.00;
const YEARLY_PRICE = 150.00;
const YEARLY_PER_MONTH = YEARLY_PRICE / 12;
const SAVINGS_PCT = 17;

// These 6 features match the Landing page exactly
const PLAN_FEATURES = [
  { label: 'Unlimited episode access', Icon: BookOpen },
  { label: 'Read & Listen every episode', Icon: Headphones },
  { label: 'Vote to shape storylines', Icon: Vote },
  { label: 'Sync across all your devices', Icon: Zap },
  { label: 'New episodes every week', Icon: Star },
  { label: 'Community profile & badges', Icon: Crown },
];

const PLANS = [
  {
    id: 'monthly' as BillingPlan,
    name: 'Monthly',
    price: `$${MONTHLY_PRICE.toFixed(2)}`,
    period: 'per month',
    perMonthNote: null,
    savings: null,
    description: 'Full access, billed monthly. Cancel anytime.',
    badge: null,
    highlighted: false,
    ctaLabel: 'Get Started',
  },
  {
    id: 'yearly' as BillingPlan,
    name: 'Yearly',
    price: `$${YEARLY_PRICE.toFixed(2)}`,
    period: 'per year',
    perMonthNote: `Just $${YEARLY_PER_MONTH.toFixed(2)} / month`,
    savings: `Save ${SAVINGS_PCT}%`,
    description: 'Best value for committed readers. Two months on us.',
    badge: 'Most Popular',
    highlighted: true,
    ctaLabel: 'Get Started',
  },
];

function formatPeriodEnd(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { subscription, isActive, isLoading: subLoading, hasPaidSubscription, refresh } = useSubscription();

  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wasCanceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (!showCancelModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCancelModal(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showCancelModal]);

  async function handleSubscribe(plan: BillingPlan) {
    if (!user) {
      localStorage.setItem('storyuu.pending_plan', plan);
      navigate('/signup?plan=' + plan);
      return;
    }
    setLoadingPlan(plan);
    setError(null);
    try {
      const { data } = await api.post<{ url: string }>('/subscriptions/checkout', { plan });
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to start checkout. Please try again.');
      setLoadingPlan(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { data } = await api.post<{ url: string }>('/subscriptions/portal-session');
      console.log('[portal] api response:', data);
      if (!data?.url || typeof data.url !== 'string' || !data.url.startsWith('http')) {
        console.error('[portal] invalid url received:', data);
        setError('Could not open billing portal. Please try again.');
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error('[portal] request failed:', err.response?.data ?? err);
      const msg: string = err.response?.data?.error || 'Could not open billing portal. Please try again.';
      setError(msg);
      setPortalLoading(false);
    }
  }

  async function handleCancelConfirm() {
    setCancelLoading(true);
    try {
      await api.post('/subscriptions/cancel');
      setShowCancelModal(false);
      refresh();
    } catch {
      setError('Failed to cancel. Please try again or contact support.');
    } finally {
      setCancelLoading(false);
    }
  }

  const planLabel = subscription?.plan === 'yearly' ? 'Yearly Plan'
    : subscription?.plan === 'monthly' ? 'Monthly Plan'
    : 'Complimentary';

  const cancelModal = showCancelModal ? (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={() => setShowCancelModal(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#12141D] border border-white/10 p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">Cancel your subscription?</h2>
        <p className="text-sm text-neutral-300 mb-3">
          You'll keep access until{' '}
          <strong>{subscription?.currentPeriodEnd ? formatPeriodEnd(subscription.currentPeriodEnd) : 'the end of your billing period'}</strong>.
          After that, voting and gated episodes will be locked.
        </p>
        <p className="text-sm text-neutral-300 mb-6">
          You can resubscribe any time. Your reading progress, bookmarks, and followed stories stay saved.
        </p>
        <div className="flex justify-end gap-3 max-[480px]:flex-col-reverse">
          <button
            type="button"
            onClick={() => setShowCancelModal(false)}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-white/15 text-sm font-bold text-neutral-300 hover:text-white transition-colors"
          >
            Keep Subscription
          </button>
          <button
            type="button"
            disabled={cancelLoading}
            onClick={handleCancelConfirm}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-status-error text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {cancelLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
    {cancelModal}
    <div className="min-h-screen bg-bg-primary md:bg-[#0B0E14] text-white relative">

      {/* =========================================
          MOBILE VIEW
         ========================================= */}
      <div className="md:hidden">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-primary/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-surface transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <Logo variant="mark" className="h-10 md:hidden" />
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-10">
          {/* Notices */}
          {wasCanceled && (
            <div className="mb-8 rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-center text-sm text-status-warning">
              Your checkout was canceled — no charge was made.
            </div>
          )}
          {error && (
            <div className="mb-8 rounded-md border border-status-error/30 bg-status-error/10 px-4 py-3 text-center text-sm text-status-error">
              {error}
            </div>
          )}

          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-1.5">
              <Star size={13} className="fill-brand-cyan text-brand-cyan" />
              <span className="text-xs font-bold uppercase tracking-widest text-brand-cyan">
                Founding Member Pricing
              </span>
            </div>
            <h1 className="mb-4 font-display text-display-l font-bold leading-tight">
              Simple, honest pricing.
            </h1>
            <p className="mx-auto max-w-lg text-subheading text-neutral-300">
              One plan, two billing options. Everything included, no hidden tiers.
            </p>
          </div>

          {/* Already subscribed */}
          {subLoading || (isActive && !subscription) ? (
            <div className="mx-auto max-w-lg flex flex-col gap-3">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10 mx-auto" />
              <div className="h-4 w-32 animate-pulse rounded-lg bg-white/10 mx-auto" />
            </div>
          ) : isActive && subscription ? (
            <div className="mx-auto max-w-lg">
              <div className="rounded-lg border border-brand-cyan/40 bg-bg-surface p-8 text-center shadow-card-dark">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-cyan/15">
                  <Check size={28} className="text-brand-cyan" />
                </div>
                <h2 className="mb-2 text-display-s font-bold">You're subscribed!</h2>
                <p className="mb-1 text-sm text-neutral-300">
                  Plan:{' '}
                  <span className="font-semibold text-white">
                    {planLabel}
                  </span>
                </p>
                {subscription.currentPeriodEnd && (
                  <p className="mb-8 text-xs text-neutral-500">
                    {subscription.cancelAtPeriodEnd
                      ? `Access ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}
                {hasPaidSubscription ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-bg-surface-alt disabled:opacity-50"
                    >
                      {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                      Manage Billing
                    </button>
                    {!subscription.cancelAtPeriodEnd && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
                      >
                        Cancel subscription
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    You're on a complimentary plan. Billing controls aren't available.
                  </p>
                )}
              </div>

              {/* Active benefits */}
              <div className="mt-10 rounded-lg border border-border-subtle bg-bg-surface p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Your premium benefits
                </p>
                <ul className="space-y-3">
                  {PLAN_FEATURES.map(({ label, Icon }) => (
                    <li key={label} className="flex items-center gap-3 text-sm text-neutral-200">
                      <Icon size={16} className="shrink-0 text-brand-cyan" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            /* Plan cards — matches Landing exactly */
            <div className="flex flex-col gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-lg border p-6 transition-all duration-300 ${
                    plan.highlighted
                      ? 'border-brand-cyan/50 bg-bg-surface shadow-[0_0_40px_rgba(7,194,239,0.1)]'
                      : 'border-border-subtle bg-bg-surface shadow-card-dark'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-cyan px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-black">
                      {plan.badge}
                    </span>
                  )}

                  <p className={`text-sm font-bold uppercase tracking-widest ${plan.highlighted ? 'text-brand-cyan' : 'text-neutral-400'}`}>
                    {plan.name}
                  </p>

                  <div className="mt-4 flex items-end gap-1.5">
                    <span className="text-[40px] font-bold leading-none text-white">{plan.price}</span>
                    <span className="mb-1.5 text-sm text-neutral-500">{plan.period}</span>
                  </div>

                  <div className="mt-2 flex min-h-[24px] items-center gap-2">
                    {plan.perMonthNote && (
                      <span className="text-sm text-neutral-400">{plan.perMonthNote}</span>
                    )}
                    {plan.savings && (
                      <span className="rounded-full bg-brand-cyan/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-cyan">
                        {plan.savings}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-5 text-neutral-500">{plan.description}</p>
                  <div className="my-5 h-px bg-border-subtle" />

                  <ul className="mb-6 flex-1 space-y-3">
                    {PLAN_FEATURES.map(({ label }) => (
                      <li key={label} className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-neutral-700 text-neutral-300'}`}>
                          <Check size={12} strokeWidth={2.5} />
                        </span>
                        <span className="text-sm text-neutral-300">{label}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all disabled:opacity-70 ${
                      plan.highlighted
                        ? 'bg-brand-cyan text-black hover:shadow-[0_0_20px_rgba(7,194,239,0.5)]'
                        : 'border border-white/20 text-white hover:bg-white/5'
                    }`}
                  >
                    {loadingPlan === plan.id && <Loader2 size={15} className="animate-spin" />}
                    {user ? plan.ctaLabel : 'Join Storyuu'}
                  </button>
                </div>
              ))}

              {!user && (
                <p className="mt-4 text-center text-sm text-neutral-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="font-semibold text-brand-cyan hover:underline"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Trust stats */}
          <div className="mt-16 border-t border-border-subtle pt-10">
            <div className="grid grid-cols-2 gap-6 text-center">
              {[
                { value: '1,000+', label: 'Episodes available' },
                { value: 'Weekly', label: 'New episodes added' },
                { value: 'Your vote', label: 'Shapes every story' },
                { value: 'Cancel', label: 'Anytime, instantly' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="mb-1 text-display-s font-bold text-brand-cyan">{value}</p>
                  <p className="text-xs text-neutral-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          DESKTOP VIEW
         ========================================= */}
      <div className="hidden md:block">
        {/* Cinematic Header Background */}
        <div className="absolute top-0 left-0 right-0 h-[70vh] overflow-hidden z-0">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-full bg-brand-cyan/20 blur-[150px] rounded-full pointer-events-none opacity-50 animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0E14]/80 to-[#0B0E14] z-10" />
        </div>

        <div className="mx-auto max-w-[1200px] px-8 lg:px-12 py-20 relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="group absolute top-8 left-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-cyan transition-all hover:text-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-cyan/30 bg-brand-cyan/10 transition-colors group-hover:bg-brand-cyan group-hover:text-black">
              <ArrowLeft size={18} />
            </div>
            Back
          </button>

          {/* Notices */}
          {(wasCanceled || error) && (
            <div className="mx-auto max-w-2xl mb-12">
              {wasCanceled && (
                <div className="rounded-[16px] border border-status-warning/30 bg-status-warning/10 px-6 py-4 text-center text-base font-medium text-status-warning">
                  Your checkout was canceled — no charge was made.
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-[16px] border border-status-error/30 bg-status-error/10 px-6 py-4 text-center text-base font-medium text-status-error">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Hero */}
          <div className="mb-16 text-center animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-6 py-2 shadow-[0_0_20px_rgba(7,194,239,0.2)]">
              <Star size={16} className="fill-brand-cyan text-brand-cyan animate-pulse" />
              <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-cyan">
                Founding Member Pricing
              </span>
            </div>
            <h1 className="mb-6 text-6xl lg:text-7xl font-extrabold tracking-tight drop-shadow-xl text-white">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-blue-400">honest pricing.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-[#949BAA] font-light leading-relaxed">
              One plan, two billing options. Everything included, no hidden tiers.
            </p>
          </div>

          {subLoading || (isActive && !subscription) ? (
            <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
              <div className="h-10 w-56 animate-pulse rounded-xl bg-white/10" />
              <div className="h-6 w-40 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : isActive && subscription ? (
            /* Subscribed State */
            <div className="mx-auto max-w-2xl animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="rounded-[32px] border border-brand-cyan/30 bg-[#12141D]/80 backdrop-blur-2xl p-12 text-center shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[80px] pointer-events-none" />

                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-brand-cyan/20 border border-brand-cyan/40 shadow-[0_0_30px_rgba(7,194,239,0.3)]">
                  <Check size={40} className="text-brand-cyan" />
                </div>

                <h2 className="mb-4 text-4xl font-extrabold text-white tracking-tight">You're Subscribed!</h2>
                <div className="inline-flex items-center gap-3 rounded-full bg-[#161923] border border-white/10 px-6 py-3 mb-8">
                  <Crown size={20} className="text-brand-cyan" />
                  <span className="text-lg font-bold text-white">
                    {planLabel}
                  </span>
                </div>

                {subscription.currentPeriodEnd && (
                  <p className="mb-10 text-base font-medium text-[#949BAA]">
                    {subscription.cancelAtPeriodEnd
                      ? `Your access remains active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Your subscription will auto-renew on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}

                {hasPaidSubscription ? (
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-8 py-4 text-base font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(7,194,239,0.5)] disabled:opacity-50"
                    >
                      {portalLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                      Manage Billing Portal
                    </button>
                    {!subscription.cancelAtPeriodEnd && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-6 py-4 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-[#949BAA]">
                    You're on a complimentary plan. Billing controls aren't available.
                  </p>
                )}
              </div>

              <div className="mt-12 text-center">
                <p className="mb-6 text-sm font-bold uppercase tracking-widest text-[#949BAA]">Your Active Benefits</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {PLAN_FEATURES.map(({ label, Icon }) => (
                    <div key={label} className="flex items-center gap-3 rounded-full bg-white/5 border border-white/5 px-5 py-2.5 backdrop-blur-sm">
                      <Icon size={16} className="text-brand-cyan" />
                      <span className="text-sm font-medium text-white">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Plan cards — matches Landing exactly */
            <div className="animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2 items-stretch">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-[24px] border p-8 transition-all duration-300 ${
                      plan.highlighted
                        ? 'border-brand-cyan/50 bg-bg-surface shadow-[0_0_40px_rgba(7,194,239,0.1)] hover:shadow-[0_0_56px_rgba(7,194,239,0.18)]'
                        : 'border-border-subtle bg-[#12141D]/80 backdrop-blur-xl shadow-card-dark hover:border-neutral-700'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-cyan px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(7,194,239,0.4)]">
                        {plan.badge}
                      </span>
                    )}

                    <p className={`text-sm font-bold uppercase tracking-widest ${plan.highlighted ? 'text-brand-cyan' : 'text-neutral-400'}`}>
                      {plan.name}
                    </p>

                    <div className="mt-4 flex items-end gap-1.5">
                      <span className="text-[44px] font-bold leading-none text-white">{plan.price}</span>
                      <span className="mb-1.5 text-sm text-neutral-500">{plan.period}</span>
                    </div>

                    <div className="mt-2 flex min-h-[24px] items-center gap-2">
                      {plan.perMonthNote && (
                        <span className="text-sm text-neutral-400">{plan.perMonthNote}</span>
                      )}
                      {plan.savings && (
                        <span className="rounded-full bg-brand-cyan/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-cyan">
                          {plan.savings}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-5 text-neutral-500">{plan.description}</p>
                    <div className="my-6 h-px bg-border-subtle" />

                    <ul className="flex-1 space-y-3">
                      {PLAN_FEATURES.map(({ label }) => (
                        <li key={label} className="flex items-center gap-3">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-neutral-700 text-neutral-300'}`}>
                            <Check size={12} strokeWidth={2.5} />
                          </span>
                          <span className="text-sm text-neutral-300">{label}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loadingPlan !== null}
                      className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-medium transition-all disabled:opacity-70 ${
                        plan.highlighted
                          ? 'bg-brand-cyan text-black hover:shadow-lg hover:shadow-brand-cyan/30'
                          : 'border border-white/20 text-white hover:bg-white/5'
                      }`}
                    >
                      {loadingPlan === plan.id && <Loader2 size={16} className="animate-spin" />}
                      {user ? plan.ctaLabel : 'Join Storyuu'}
                    </button>
                  </div>
                ))}
              </div>

              {!user && (
                <div className="mt-10 text-center">
                  <p className="text-lg text-[#949BAA]">
                    Already part of the community?{' '}
                    <button
                      onClick={() => navigate('/login')}
                      className="font-bold text-brand-cyan hover:underline hover:text-white transition-colors"
                    >
                      Log in to your account
                    </button>
                  </p>
                </div>
              )}

              {/* Trust Stats */}
              <div className="mx-auto max-w-3xl mt-20 pt-12 border-t border-white/5">
                <div className="grid grid-cols-4 gap-8 rounded-[24px] bg-[#161923]/50 border border-white/5 p-10 backdrop-blur-md">
                  {[
                    { value: '1,000+', label: 'Premium Episodes' },
                    { value: 'Weekly', label: 'New Content Drops' },
                    { value: 'Your Vote', label: 'Directs the Narrative' },
                    { value: 'Anytime', label: 'Cancel with 1-Click' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="mb-2 text-3xl font-extrabold tracking-tight text-white">{value}</p>
                      <p className="text-sm font-bold uppercase tracking-widest text-[#949BAA]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
