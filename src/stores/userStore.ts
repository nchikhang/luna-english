import { create } from 'zustand';
import type { CEFRLevel, User } from '@/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLevel: (level: CEFRLevel) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLevel: (level) =>
    set((state) => ({
      user: state.user ? { ...state.user, level } : null,
    })),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
