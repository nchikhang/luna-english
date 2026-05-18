import { useCallback, useEffect, useState } from 'react';
import type { Card, ReviewRating } from '@/types';
import { applyReview, getCardsDueForReview } from '@/db/queries';
import { calculateNextReview } from '@/lib/srs';
import { SRS_CONFIG } from '@/constants';

/**
 * State của 1 session học flashcard.
 *
 * Logic re-queue (Anki style):
 * - Khi user chọn "Again" (rating 0-2): card được đẩy lại vào queue
 *   sau 2-3 vị trí, để học lại trong session
 * - Khi user chọn "Hard/Good/Easy" (rating 3-5): card hoàn thành,
 *   không xuất hiện nữa trong session này
 *
 * Stats tracking:
 * - totalCards: số card unique trong session (không tính re-queue)
 * - completed: số card đã pass (rating >= 3)
 * - again: số lần user bấm Again
 */

export type SessionStatus = 'loading' | 'active' | 'finished' | 'empty';

export interface SessionStats {
  totalCards: number;
  completed: number;
  again: number;
  accuracy: number; // 0-1
}

interface UseStudySessionResult {
  status: SessionStatus;
  currentCard: Card | null;
  queueLength: number;
  stats: SessionStats;
  submitRating: (rating: ReviewRating) => Promise<void>;
  restart: () => Promise<void>;
}

const REQUEUE_OFFSET = 3; // Card "Again" sẽ xuất hiện lại sau 3 card

export function useStudySession(deckId: string): UseStudySessionResult {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [queue, setQueue] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [againCount, setAgainCount] = useState(0);

  // Load initial cards
  const loadSession = useCallback(async () => {
    setStatus('loading');
    setCompleted(0);
    setAgainCount(0);

    try {
      const cards = await getCardsDueForReview(
        deckId,
        SRS_CONFIG.newCardsPerDay
      );

      if (cards.length === 0) {
        setStatus('empty');
        setQueue([]);
        setTotalCards(0);
        return;
      }

      setQueue(cards);
      setTotalCards(cards.length);
      setStatus('active');
    } catch (err) {
      console.error('[StudySession] Failed to load cards:', err);
      setStatus('empty');
    }
  }, [deckId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  /**
   * User bấm rating sau khi xem card.
   * 1. Tính SRS values mới và update DB
   * 2. Nếu Again → re-queue card vào sau vài vị trí
   * 3. Nếu pass → loại card khỏi queue, tăng completed
   * 4. Nếu queue rỗng → session finished
   */
  const submitRating = useCallback(
    async (rating: ReviewRating) => {
      if (queue.length === 0) return;
      const card = queue[0];

      try {
        // Tính SRS update và lưu vào DB
        const srsUpdate = calculateNextReview(card, rating);
        await applyReview({
          cardId: card.id,
          rating,
          srsUpdate,
        });

        // Update queue logic
        if (rating < 3) {
          // Failed: re-queue card
          setQueue((prev) => {
            const rest = prev.slice(1);
            const insertAt = Math.min(REQUEUE_OFFSET, rest.length);
            // Reload card với SRS values mới (sau khi update DB)
            const reloadedCard = { ...card, ...srsUpdate };
            return [
              ...rest.slice(0, insertAt),
              reloadedCard,
              ...rest.slice(insertAt),
            ];
          });
          setAgainCount((c) => c + 1);
        } else {
          // Passed: remove from queue
          setQueue((prev) => {
            const newQueue = prev.slice(1);
            if (newQueue.length === 0) {
              setStatus('finished');
            }
            return newQueue;
          });
          setCompleted((c) => c + 1);
        }
      } catch (err) {
        console.error('[StudySession] Submit rating failed:', err);
      }
    },
    [queue]
  );

  const stats: SessionStats = {
    totalCards,
    completed,
    again: againCount,
    accuracy:
      completed + againCount > 0
        ? completed / (completed + againCount)
        : 0,
  };

  return {
    status,
    currentCard: queue[0] ?? null,
    queueLength: queue.length,
    stats,
    submitRating,
    restart: loadSession,
  };
}