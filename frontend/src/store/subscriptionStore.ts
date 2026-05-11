import { create } from 'zustand';

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'suspended';
export type SubscriptionPlan = 'monthly' | 'yearly' | 'comp';

export type SubscriptionInfo = {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
};

type SubscriptionState = {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  hasFetched: boolean;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setFetched: () => void;
  invalidate: () => void;
  reset: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: null,
  isLoading: false,
  hasFetched: false,
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (isLoading) => set({ isLoading }),
  setFetched: () => set({ hasFetched: true }),
  invalidate: () => set({ hasFetched: false, subscription: null }),
  reset: () => set({ subscription: null, isLoading: false, hasFetched: false }),
}));
