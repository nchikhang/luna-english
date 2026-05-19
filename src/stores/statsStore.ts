import { create } from 'zustand';
import {
  fetchUserStats,
  type UserStats,
} from '@/services/api/stats';

/**
 * Stats store — cache UserStats locally để render nhanh.
 *
 * Pattern:
 * - load() pull từ server, lưu vào state, set isLoading.
 * - refresh() force re-fetch (sau action lớn vd finish quiz).
 * - bumpXp() optimistic update — không gọi server, chỉ update local.
 *   Dùng cho toast "+10 XP" ngay khi user review.
 *   Sau đó refresh() sẽ sync với truth từ server.
 */
interface StatsState {
  stats: UserStats | null;
  isLoading: boolean;
  lastFetchAt: number | null;
  error: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  bumpXp: (points: number) => void;
  reset: () => void;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  stats: null,
  isLoading: false,
  lastFetchAt: null,
  error: null,

  load: async () => {
    // Skip nếu đã fetch trong 30s gần đây
    const last = get().lastFetchAt;
    if (last && Date.now() - last < 30_000 && get().stats) return;

    set({ isLoading: true, error: null });
    try {
      const stats = await fetchUserStats();
      set({ stats, isLoading: false, lastFetchAt: Date.now() });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Lỗi tải stats',
      });
    }
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await fetchUserStats();
      set({ stats, isLoading: false, lastFetchAt: Date.now() });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Lỗi tải stats',
      });
    }
  },

  bumpXp: (points: number) => {
    const current = get().stats;
    if (!current) return;
    // Optimistic update — actual XP sẽ correct lại sau refresh()
    set({
      stats: {
        ...current,
        totalXp: current.totalXp + points,
        today: {
          ...current.today,
          xpEarned: current.today.xpEarned + points,
        },
      },
    });
  },

  reset: () => set({ stats: null, lastFetchAt: null, error: null }),
}));
