import { useCallback, useEffect, useState } from 'react';
import type { Card } from '@/types';
import {
  type CreateCardInput,
  type UpdateCardInput,
  createCard as dbCreateCard,
  deleteCard as dbDeleteCard,
  getCardsByDeckId,
  updateCard as dbUpdateCard,
} from '@/db/queries';

interface UseCardsResult {
  cards: Card[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: Omit<CreateCardInput, 'deckId'>) => Promise<Card>;
  update: (id: string, input: UpdateCardInput) => Promise<Card>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook quản lý list cards của 1 deck.
 * Truyền deckId vào để load đúng deck.
 */
export function useCards(deckId: string): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getCardsByDeckId(deckId);
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: Omit<CreateCardInput, 'deckId'>) => {
      const newCard = await dbCreateCard({ ...input, deckId });
      await refresh();
      return newCard;
    },
    [refresh, deckId]
  );

  const update = useCallback(
    async (id: string, input: UpdateCardInput) => {
      const updated = await dbUpdateCard(id, input);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await dbDeleteCard(id);
      await refresh();
    },
    [refresh]
  );

  return { cards, isLoading, error, refresh, create, update, remove };
}