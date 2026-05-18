import { useCallback, useEffect, useState } from 'react';
import type { Card, ReviewRating } from '@/types';
import { applyReview, getCardsDueForReview } from '@/db/queries';
import { calculateNextReview } from '@/lib/srs';
import { SRS_CONFIG } from '@/constants';

export type SessionStatus = 'loading' | 'active' | 'finished' | 'empty';

export interface SessionStats {
  totalCards: number;
  completed: number;
  again: number;
  accuracy: number;
}

interface UseStudySessionResult {
  status: SessionStatus;
  currentCard: Card | null;
  queueLength: number;
  stats: SessionStats;
  isSubmitting: boolean;
  submitRating: (rating: ReviewRating) => Promise<void>;
  restart: () => Promise<void>;
}

const REQUEUE_OFFSET = 3;

export function useStudySession(deckId: string): UseStudySessionResult {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [queue, setQueue] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSession = useCallback(async () => {
    setStatus('loading');
    setCompleted(0);
    setAgainCount(0);
    setIsSubmitting(false);

    try {
      const cards = await getCardsDueForReview(deckId, SRS_CONFIG.newCardsPerDay);

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

  const submitRating = useCallback(
    async (rating: ReviewRating) => {
      if (queue.length === 0 || isSubmitting) return;
      const card = queue[0];

      try {
        setIsSubmitting(true);
        const srsUpdate = calculateNextReview(card, rating);
        await applyReview({
          cardId: card.id,
          rating,
          srsUpdate,
        });

        if (rating < 3) {
          setQueue((prev) => {
            const rest = prev.slice(1);
            const insertAt = Math.min(REQUEUE_OFFSET, rest.length);
            const reloadedCard = { ...card, ...srsUpdate };
            return [
              ...rest.slice(0, insertAt),
              reloadedCard,
              ...rest.slice(insertAt),
            ];
          });
          setAgainCount((c) => c + 1);
        } else {
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
      } finally {
        setIsSubmitting(false);
      }
    },
    [queue, isSubmitting]
  );

  const stats: SessionStats = {
    totalCards,
    completed,
    again: againCount,
    accuracy:
      completed + againCount > 0 ? completed / (completed + againCount) : 0,
  };

  return {
    status,
    currentCard: queue[0] ?? null,
    queueLength: queue.length,
    stats,
    isSubmitting,
    submitRating,
    restart: loadSession,
  };
}