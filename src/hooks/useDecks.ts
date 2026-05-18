import { useCallback, useEffect, useState } from 'react';
import type { Deck } from '@/types';
import {
  type CreateDeckInput,
  type UpdateDeckInput,
  createDeck as dbCreateDeck,
  deleteDeck as dbDeleteDeck,
  getAllDecks,
  updateDeck as dbUpdateDeck,
} from '@/db/queries';

interface UseDecksResult {
  decks: Deck[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: CreateDeckInput) => Promise<Deck>;
  update: (id: string, input: UpdateDeckInput) => Promise<Deck>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook quản lý list decks.
 *
 * Pattern: hook tự load data khi mount, expose các action.
 * Sau mỗi action thành công, refresh để UI sync với DB.
 *
 * Cách dùng:
 *   const { decks, isLoading, create, remove } = useDecks();
 */
export function useDecks(): UseDecksResult {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllDecks();
      setDecks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load lần đầu khi component dùng hook mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateDeckInput) => {
      const newDeck = await dbCreateDeck(input);
      await refresh();
      return newDeck;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, input: UpdateDeckInput) => {
      const updated = await dbUpdateDeck(id, input);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await dbDeleteDeck(id);
      await refresh();
    },
    [refresh]
  );

  return { decks, isLoading, error, refresh, create, update, remove };
}