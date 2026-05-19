import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CEFRLevel } from '@/types';
import type { AuthUser } from '@/services/api/auth';

/**
 * Auth state cho Luna English.
 *
 * Thay thế userStore cũ. Khác biệt:
 * - Persist token + user vào AsyncStorage → reopen app vẫn đăng nhập.
 * - Tách isLoading để init flow biết khi nào rehydrate xong.
 * - Thêm lastSyncAt → sync engine dùng để biết "since" khi pull.
 */
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  lastSyncAt: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  setLevel: (level: CEFRLevel) => void;
  setLastSyncAt: (iso: string) => void;
  logout: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      lastSyncAt: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      setLevel: (level) =>
        set((state) => ({
          user: state.user ? { ...state.user, level } : null,
        })),

      setLastSyncAt: (iso) => set({ lastSyncAt: iso }),

      logout: () =>
        set({
          user: null,
          token: null,
          lastSyncAt: null,
          isAuthenticated: false,
        }),

      _setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'luna-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Chỉ persist 3 field này — isHydrated phải reset mỗi lần mở app
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        lastSyncAt: state.lastSyncAt,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    }
  )
);
