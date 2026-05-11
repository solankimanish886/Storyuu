import { create } from 'zustand';

export interface SSENotification {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

type NotificationState = {
  unreadCount: number;
  latestSSENotification: SSENotification | null;
  setUnreadCount: (n: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  setLatestSSENotification: (n: SSENotification | null) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  latestSSENotification: null,

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  incrementUnreadCount: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrementUnreadCount: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
  setLatestSSENotification: (n) => set({ latestSSENotification: n }),
}));
