import { apiRequest } from './client';

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface BadgesResponse {
  earned: BadgeInfo[];
  locked: BadgeInfo[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  level: number;
  xp: number;
  isMe?: boolean;
}

export interface LeaderboardResult {
  scope: 'alltime' | 'week';
  entries: LeaderboardEntry[];
  myRank: number | null;
  myXp: number;
  totalUsers: number;
}

export async function fetchBadges(): Promise<BadgesResponse> {
  return apiRequest<BadgesResponse>('/me/badges');
}

export async function fetchLeaderboard(scope: 'alltime' | 'week' = 'alltime'): Promise<LeaderboardResult> {
  return apiRequest<LeaderboardResult>(`/leaderboard?scope=${scope}`);
}
