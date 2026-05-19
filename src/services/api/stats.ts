import { apiRequest } from './client';

export interface UserStats {
  totalXp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  cardsMastered: number;
  totalReviews: number;
  today: {
    xpEarned: number;
    goalXp: number;
    goalMet: boolean;
    reviewsCount: number;
  };
  recentEvents: Array<{
    action: string;
    points: number;
    createdAt: string;
  }>;
}

export interface XpEvent {
  id: string;
  action: string;
  points: number;
  createdAt: string;
  meta: Record<string, unknown> | null;
}

export async function fetchUserStats(): Promise<UserStats> {
  return apiRequest<UserStats>('/me/stats');
}

export async function updateDailyGoal(goalXp: number): Promise<{ success: boolean; dailyGoalXp: number }> {
  return apiRequest('/me/daily-goal', {
    method: 'PATCH',
    body: { dailyGoalXp: goalXp },
  });
}

export async function fetchXpHistory(limit = 30): Promise<{ events: XpEvent[] }> {
  return apiRequest(`/me/xp-history?limit=${limit}`);
}
