import { getDatabase } from './schema';

/**
 * Stats queries cho tab Profile và các thống kê khác.
 */

export interface UserStats {
  totalReviews: number;
  cardsLearned: number; // số card có repetitions > 0
  totalCards: number;
  currentStreak: number; // số ngày liên tiếp có ít nhất 1 review
  reviewsToday: number;
}

export async function getUserStats(): Promise<UserStats> {
  const db = await getDatabase();

  const totalReviewsResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM review_logs`
  );

  const learnedResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards WHERE repetitions > 0`
  );

  const totalCardsResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards`
  );

  // Reviews trong 24h qua
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reviewsTodayResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM review_logs WHERE reviewed_at >= ?`,
    [todayStart.toISOString()]
  );

  // Streak: số ngày liên tiếp có review (đến hôm nay/hôm qua)
  // Lấy tất cả ngày có review, đếm chuỗi liên tiếp gần nhất
  const distinctDaysResult = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(reviewed_at) as day FROM review_logs
     ORDER BY day DESC`
  );
  const streak = computeStreak(distinctDaysResult.map((r) => r.day));

  return {
    totalReviews: totalReviewsResult?.count ?? 0,
    cardsLearned: learnedResult?.count ?? 0,
    totalCards: totalCardsResult?.count ?? 0,
    currentStreak: streak,
    reviewsToday: reviewsTodayResult?.count ?? 0,
  };
}

/**
 * Tính streak từ list ngày DESC.
 * Streak còn nếu ngày gần nhất là hôm nay hoặc hôm qua.
 * Đếm chuỗi liên tiếp ngược về quá khứ.
 */
function computeStreak(days: string[]): number {
  if (days.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  // Streak chỉ tính nếu hôm nay hoặc hôm qua có review
  if (days[0] !== todayStr && days[0] !== yesterdayStr) return 0;

  let streak = 1;
  let expected = new Date(days[0]);

  for (let i = 1; i < days.length; i++) {
    expected.setDate(expected.getDate() - 1);
    const expectedStr = formatDate(expected);
    if (days[i] === expectedStr) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}