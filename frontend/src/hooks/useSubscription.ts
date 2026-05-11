import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useSubscriptionStore, type SubscriptionInfo } from '@/store/subscriptionStore';
import { useAuthStore } from '@/store/authStore';

export function useSubscription() {
  const { user } = useAuthStore();
  const { subscription, isLoading, hasFetched, setSubscription, setLoading, setFetched, invalidate } =
    useSubscriptionStore();

  useEffect(() => {
    if (!user || hasFetched || isLoading) return;
    setLoading(true);
    api
      .get<{ subscription: SubscriptionInfo | null }>('/subscriptions/me')
      .then(({ data }) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
      .finally(() => {
        setLoading(false);
        setFetched();
      });
  }, [user, hasFetched, isLoading, setSubscription, setLoading, setFetched]);

  const now = new Date();
  const periodValid =
    !subscription?.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > now;
  const isActive =
    (subscription?.status === 'active' && periodValid) ||
    user?.subscriptionStatus === 'active';

  // True only for paid plans (monthly/yearly). Use this — not isActive — to gate
  // billing controls and upsell CTAs, so comp users are never treated as paid.
  const hasPaidSubscription =
    subscription !== null &&
    subscription.status === 'active' &&
    (subscription.plan === 'monthly' || subscription.plan === 'yearly');

  // Call refresh() to force a re-fetch of subscription data (e.g. on Profile mount)
  function refresh() {
    invalidate();
  }

  return { subscription, isLoading, isActive, hasPaidSubscription, refresh };
}
