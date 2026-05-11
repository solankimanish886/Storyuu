import { create } from 'zustand';
import { api } from '@/lib/api';

interface StoryCounts {
  total: number;
  published: number;
  draft: number;
  archived: number;
}

interface AdminCountsState {
  counts: StoryCounts | null;
  fetchCounts: () => Promise<void>;
}

export const useAdminCountsStore = create<AdminCountsState>((set) => ({
  counts: null,
  fetchCounts: async () => {
    try {
      const { data } = await api.get<StoryCounts>('/admin/stories/counts');
      set({ counts: data });
    } catch {
      // silently ignore — sidebar badge gracefully shows nothing
    }
  },
}));
