import { addDays } from 'date-fns';
import type { Card, ReviewRating } from '@/types';

/**
 * SM-2 algorithm (SuperMemo 2)
 * Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

export interface SRSUpdate {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
}

/**
 * Calculate next review parameters based on user's rating (0-5)
 * - 0-2: failed (reset repetitions)
 * - 3-5: passed (advance schedule)
 */
export function calculateNextReview(
  card: Pick<Card, 'easeFactor' | 'interval' | 'repetitions'>,
  rating: ReviewRating
): SRSUpdate {
  let { easeFactor, interval, repetitions } = card;

  if (rating < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed — advance
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor (kept between 1.3 and 2.5+)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  );

  const nextReviewAt = addDays(new Date(), interval).toISOString();

  return { easeFactor, interval, repetitions, nextReviewAt };
}

export const DEFAULT_SRS: Pick<
  Card,
  'easeFactor' | 'interval' | 'repetitions'
> = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
};
