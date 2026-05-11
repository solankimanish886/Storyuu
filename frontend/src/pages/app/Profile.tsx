import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/Toast';
import { Check, Crown, Edit2, LogOut, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import GuestHero from '@/components/auth/GuestHero';
import { getAvatarInitial } from '@/lib/avatarInitial';

interface UserDetail {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPeriodEnd(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPlan(plan: string) {
  if (plan === 'monthly') return 'Monthly Plan';
  if (plan === 'yearly') return 'Yearly Plan';
  return 'Complimentary';
}

function planPrice(plan: string): string | null {
  if (plan === 'monthly') return '$15.00 / month';
  if (plan === 'yearly') return '$150.00 / year';
  return null;
}

const PLAN_FEATURES = [
  'Unlimited episode access',
  'Read & Listen every episode',
  'Vote to shape storylines',
  'Sync across all your devices',
  'New episodes every week',
  'Community profile & badges',
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, clearSession, updateUser } = useAuthStore();
  const { subscription, isLoading: subLoading, isActive, hasPaidSubscription, refresh } = useSubscription();
  const reset = useSubscriptionStore((s) => s.reset);
  const { toast } = useToast();

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ user: UserDetail }>('/me')
      .then(({ data }) => {
        setDetail(data.user);
        setFullName([data.user.firstName, data.user.lastName].filter(Boolean).join(' '));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!showCancelModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCancelModal(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showCancelModal]);

  async function handleCancelConfirm() {
    setCancelLoading(true);
    try {
      const { data } = await api.post<{ currentPeriodEnd?: string }>('/subscriptions/cancel');
      setShowCancelModal(false);
      const endDate = data.currentPeriodEnd ? formatPeriodEnd(data.currentPeriodEnd) : 'the end of your billing period';
      toast(`Subscription cancelled. You have access until ${endDate}.`);
      refresh();
    } catch {
      toast('Failed to cancel. Please try again.', 'error');
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleResumeSubscription() {
    setResumeLoading(true);
    try {
      await api.post('/subscriptions/resume');
      toast('Subscription resumed.');
      refresh();
    } catch {
      toast('Failed to resume subscription. Please try again.', 'error');
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { data } = await api.post<{ url: string }>('/subscriptions/portal-session');
      if (!data?.url || typeof data.url !== 'string' || !data.url.startsWith('http')) {
        toast('Could not open billing portal. Please try again.', 'error');
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err: any) {
      const msg: string = err.response?.data?.error || 'Could not open billing portal. Please try again.';
      toast(msg, 'error');
      setPortalLoading(false);
    }
  }

  if (!user) {
    return <GuestHero />;
  }

  function startEdit() {
    setFullName(detail ? [detail.firstName, detail.lastName].filter(Boolean).join(' ') : '');
    setSaveError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError('');
  }

  async function saveName() {
    setSaving(true);
    setSaveError('');
    try {
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');
      await api.put('/me', { firstName, lastName });
      setDetail((d) => d ? { ...d, firstName, lastName } : d);
      updateUser({ ...user!, firstName, lastName });
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearSession();
    reset();
    navigate('/', { replace: true });
  }

  const initials = getAvatarInitial(detail ?? user);
  const displayName = detail
    ? [detail.firstName, detail.lastName].filter(Boolean).join(' ')
    : user?.firstName ?? '';

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

      {/* =========================================
          MOBILE VIEW
         ========================================= */}
      <div className="md:hidden mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-display-m font-bold text-white">Profile</h1>

        {/* Avatar + Name */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-orange">
            <span className="text-2xl font-bold text-black">{initials}</span>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{displayName}</p>
            <p className="text-sm text-neutral-500">{user?.email}</p>
            {detail?.createdAt && (
              <p className="text-xs text-neutral-600">Member since {formatDate(detail.createdAt)}</p>
            )}
          </div>
        </div>

        {/* Personal Info */}
        <div className="mb-6 rounded-lg border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Personal Info</h2>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md bg-white/5 border border-neutral-700 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
              {saveError && <p className="text-xs text-status-error">{saveError}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="cyan"
                  loading={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm"
                  onClick={saveName}
                >
                  <Check size={14} /> Save
                </Button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Name</span>
                <span className="text-white">{displayName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Email</span>
                <span className="text-white">{user?.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="mb-6 rounded-lg border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-brand-cyan" />
            <h2 className="font-bold text-white">Subscription</h2>
          </div>

          {subLoading || (isActive && !subscription) ? (
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            </div>
          ) : isActive && subscription ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Plan</span>
                <div className="text-right">
                  <span className="text-white font-medium block">{formatPlan(subscription.plan)}</span>
                  {planPrice(subscription.plan) && (
                    <span className="text-xs text-neutral-500">{planPrice(subscription.plan)}</span>
                  )}
                </div>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">
                    {subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'}
                  </span>
                  <span className={subscription.cancelAtPeriodEnd ? 'text-status-warning' : 'text-white'}>
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
              )}

              {subscription.cancelAtPeriodEnd ? (
                <div className="rounded-md bg-status-warning/10 border border-status-warning/20 px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-status-warning">
                    Cancelled — access ends {subscription.currentPeriodEnd ? formatPeriodEnd(subscription.currentPeriodEnd) : ''}
                  </p>
                  <button
                    type="button"
                    disabled={resumeLoading}
                    onClick={handleResumeSubscription}
                    className="shrink-0 text-xs font-bold text-brand-cyan hover:underline disabled:opacity-60"
                  >
                    {resumeLoading ? 'Resuming…' : 'Resume Subscription'}
                  </button>
                </div>
              ) : hasPaidSubscription ? (
                <div className="mt-1 border-t border-border-subtle pt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={portalLoading}
                    onClick={handleManageBilling}
                    className="text-sm text-brand-cyan hover:underline text-left disabled:opacity-60"
                  >
                    {portalLoading ? 'Opening portal…' : 'Manage Billing Portal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="text-sm text-neutral-500 hover:text-white text-left"
                  >
                    Cancel Subscription
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-neutral-500 border-t border-border-subtle pt-3">
                  You're on a complimentary plan. Billing controls aren't available.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-400">No active subscription.</p>
              <button
                type="button"
                onClick={() => navigate('/subscribe')}
                className="flex items-center gap-2 rounded-full bg-brand-cyan px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 self-start"
              >
                <Crown size={14} /> Subscribe
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle py-3 text-sm font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* =========================================
          DESKTOP VIEW
         ========================================= */}
      <div className="hidden md:block mx-auto max-w-[1000px] px-4 md:px-8 lg:px-12 py-10 lg:py-16 min-h-[90vh]">
        <div className="animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
          <h1 className="mb-2 text-3xl md:text-5xl font-extrabold text-white tracking-tight">Account Settings</h1>
          <p className="mb-8 md:mb-12 text-[#949BAA] text-base md:text-lg font-light">Manage your profile and subscription.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
          <div className="flex flex-col gap-8 animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.1s', animationFillMode: 'both' }}>

            {/* Identity Panel */}
            <div className="rounded-[24px] bg-[#12141D]/80 backdrop-blur-xl border border-white/5 p-8 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-brand-cyan/20">
              <div className="flex items-center gap-5 mb-8">
                <div className="flex h-20 w-20 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-full bg-brand-orange">
                  <span className="text-3xl md:text-4xl font-extrabold text-black">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">{displayName}</p>
                  <p className="text-[#949BAA] text-sm md:text-base mt-1 truncate">{user?.email}</p>
                  {detail?.createdAt && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Member since {formatDate(detail.createdAt)}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[#1E222B] pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white tracking-tight">Personal Details</h2>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="flex items-center gap-2 text-sm font-bold text-brand-cyan hover:text-white transition-colors"
                    >
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#949BAA]">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl bg-[#161923] border border-white/10 px-5 py-3.5 text-base text-white placeholder:text-neutral-500 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-4 border-t border-[#1E222B] pt-6">
                      {saveError && <p className="text-sm text-status-error mr-auto">{saveError}</p>}
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-6 py-2.5 text-sm font-bold text-neutral-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={saveName}
                        className="flex items-center gap-2 rounded-full bg-brand-cyan px-6 py-2.5 text-sm font-bold text-black transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(7,194,239,0.5)]"
                      >
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <Check size={16} />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#949BAA]">Full Name</span>
                      <span className="text-base md:text-lg font-medium text-white">{displayName || '—'}</span>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#949BAA]">Email Address</span>
                      <span className="text-base md:text-lg font-medium text-white truncate">{user?.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Panel */}
            <div className="rounded-[24px] bg-[#12141D]/80 backdrop-blur-xl border border-status-error/10 p-8 transition-all duration-500 hover:border-status-error/30">
              <h2 className="text-xl font-bold text-white tracking-tight mb-2">Sign Out</h2>
              <p className="text-[#949BAA] text-sm mb-6">You will be securely signed out of your account on this device.</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-full border border-status-error/30 bg-status-error/10 px-6 py-3 text-sm font-bold text-status-error transition-all hover:bg-status-error hover:text-white hover:shadow-[0_0_20px_rgba(235,87,87,0.4)]"
              >
                <LogOut size={16} />
                Sign Out Securely
              </button>
            </div>
          </div>

          {/* Right column — Subscription Panel */}
          <div className="flex flex-col gap-8 animate-fade-in-up" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="rounded-[24px] bg-gradient-to-b from-[#161923] to-[#12141D] border border-brand-cyan/20 p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 blur-[50px] pointer-events-none" />

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cyan/20">
                  <Crown size={20} className="text-brand-cyan" />
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Plan Details</h2>
              </div>

              {subLoading || (isActive && !subscription) ? (
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="h-6 w-32 animate-pulse rounded-lg bg-white/10" />
                  <div className="h-4 w-48 animate-pulse rounded-lg bg-white/10" />
                </div>
              ) : isActive && subscription ? (
                <div className="flex flex-col gap-6 relative z-10">
                  <div className="rounded-xl bg-[#0B0E14]/50 p-5 border border-white/5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#949BAA] block mb-1">Current Plan</span>
                    <span className="text-2xl font-extrabold text-white">{formatPlan(subscription.plan)}</span>
                    {planPrice(subscription.plan) && (
                      <span className="block text-sm text-[#949BAA] mt-1">{planPrice(subscription.plan)}</span>
                    )}
                  </div>

                  {subscription.currentPeriodEnd && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#949BAA]">
                        {subscription.cancelAtPeriodEnd ? 'Access Ends' : hasPaidSubscription ? 'Next Billing Date' : 'Access Until'}
                      </span>
                      <span className={`text-lg font-medium ${subscription.cancelAtPeriodEnd ? 'text-status-warning' : 'text-white'}`}>
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  )}

                  {subscription.cancelAtPeriodEnd ? (
                    <div className="rounded-lg bg-status-warning/10 border border-status-warning/20 p-4 flex flex-col gap-3">
                      <p className="text-sm font-medium text-status-warning leading-relaxed">
                        Cancelled — access ends {subscription.currentPeriodEnd ? formatPeriodEnd(subscription.currentPeriodEnd) : ''}
                      </p>
                      <button
                        type="button"
                        disabled={resumeLoading}
                        onClick={handleResumeSubscription}
                        className="self-start flex items-center gap-2 rounded-full bg-brand-cyan px-5 py-2 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(7,194,239,0.4)] disabled:opacity-60 disabled:scale-100"
                      >
                        {resumeLoading && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />}
                        Resume Subscription
                      </button>
                    </div>
                  ) : hasPaidSubscription ? (
                    <>
                      <div className="rounded-xl bg-[#0B0E14]/50 border border-white/5 p-5">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#949BAA]">Plan Includes</p>
                        <ul className="flex flex-col gap-2">
                          {PLAN_FEATURES.map((f) => (
                            <li key={f} className="flex items-center gap-3 text-sm text-neutral-200">
                              <Check size={14} className="shrink-0 text-brand-cyan" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={portalLoading}
                        onClick={handleManageBilling}
                        className="flex items-center justify-center gap-2 rounded-full bg-white/10 border border-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100"
                      >
                        {portalLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        Manage Billing Portal
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className="text-sm text-neutral-500 hover:text-white transition-colors text-center"
                      >
                        Cancel Subscription
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-[#949BAA]">
                      You're on a complimentary plan. Billing controls aren't available.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6 relative z-10">
                  <div className="rounded-xl bg-[#0B0E14]/50 p-5 border border-white/5 flex flex-col items-center text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#949BAA] block mb-2">Current Plan</span>
                    <span className="text-xl font-bold text-white mb-1">No Active Plan</span>
                  </div>
                  <p className="text-sm text-[#949BAA] text-center px-4">
                    Subscribe for unlimited access to all stories and audio episodes.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/subscribe')}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-brand-cyan px-6 py-4 text-sm font-bold text-black transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(7,194,239,0.5)]"
                  >
                    <Crown size={16} /> Subscribe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
