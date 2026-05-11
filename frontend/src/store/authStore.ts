import { create } from 'zustand';

export type Role = 'reader' | 'admin' | 'superadmin';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: Role;
  isEmailVerified: boolean;
  isFoundingMember: boolean;
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  avatarUrl?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  updateUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('storyuu.access_token'),
  isHydrated: false,

  setSession: (user, accessToken) => {
    localStorage.setItem('storyuu.access_token', accessToken);
    set({ user, accessToken, isHydrated: true });
  },

  updateUser: (user) => set({ user }),

  setAccessToken: (token) => {
    localStorage.setItem('storyuu.access_token', token);
    set({ accessToken: token });
  },

  clearSession: () => {
    localStorage.removeItem('storyuu.access_token');
    set({ user: null, accessToken: null, isHydrated: true });
  },

  setHydrated: () => set({ isHydrated: true }),
}));
