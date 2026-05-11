import { create } from 'zustand';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbStore {
  trail: BreadcrumbItem[];
  setTrail: (trail: BreadcrumbItem[]) => void;
  updateTailLabel: (label: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  trail: [],
  setTrail: (trail) => set({ trail }),
  updateTailLabel: (label) =>
    set((state) => {
      if (!state.trail.length) return state;
      const next = [...state.trail];
      next[next.length - 1] = { ...next[next.length - 1], label };
      return { trail: next };
    }),
}));
