import { useCallback, useEffect, useState } from 'react';
import type { Card } from '@/types';
import { getCardsByDeckId } from '@/db/queries';
import { generateMatchPairs, type MatchPair } from '@/lib/quiz';

export type MatchStatus = 'loading' | 'active' | 'finished' | 'insufficient';

export interface MatchResult {
  totalPairs: number;
  wrongAttempts: number;
  totalTimeMs: number;
  accuracy: number; // pairs / (pairs + wrong)
}

interface UseMatchPairsParams {
  deckId: string;
  pairCount: number;
}

interface MatchTile {
  id: string;
  pairId: string; // cardId — 2 tile cùng pairId là cặp đúng
  side: 'left' | 'right';
  text: string;
  isMatched: boolean;
}

interface UseMatchPairsResult {
  status: MatchStatus;
  tiles: MatchTile[];
  selectedLeftId: string | null;
  selectedRightId: string | null;
  wrongPair: { leftId: string; rightId: string } | null; // flash đỏ
  matchedCount: number;
  totalPairs: number;
  wrongAttempts: number;
  result: MatchResult | null;
  selectTile: (tileId: string) => void;
  restart: () => Promise<void>;
}

const MIN_CARDS = 4;
const WRONG_FLASH_MS = 600;

export function useMatchPairs({
  deckId,
  pairCount,
}: UseMatchPairsParams): UseMatchPairsResult {
  const [status, setStatus] = useState<MatchStatus>('loading');
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [totalPairs, setTotalPairs] = useState(0);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ leftId: string; rightId: string } | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  const loadRound = useCallback(async () => {
    setStatus('loading');
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setWrongPair(null);
    setWrongAttempts(0);
    setMatchedCount(0);
    setEndTime(null);

    try {
      const cards: Card[] = await getCardsByDeckId(deckId);
      if (cards.length < MIN_CARDS) {
        setStatus('insufficient');
        return;
      }

      const actualCount = Math.min(pairCount, cards.length);
      const pairs: MatchPair[] = generateMatchPairs(cards, actualCount);

      // Tạo tiles: mỗi pair tạo 2 tile (left=word, right=meaning)
      const leftTiles: MatchTile[] = pairs.map((p) => ({
        id: `L_${p.cardId}`,
        pairId: p.cardId,
        side: 'left',
        text: p.word,
        isMatched: false,
      }));
      const rightTiles: MatchTile[] = pairs.map((p) => ({
        id: `R_${p.cardId}`,
        pairId: p.cardId,
        side: 'right',
        text: p.meaning,
        isMatched: false,
      }));

      // Shuffle 2 cột riêng biệt
      const shuffledLeft = shuffle(leftTiles);
      const shuffledRight = shuffle(rightTiles);

      setTiles([...shuffledLeft, ...shuffledRight]);
      setTotalPairs(pairs.length);
      setStartTime(Date.now());
      setStatus('active');
    } catch (err) {
      console.error('[MatchPairs] Load failed:', err);
      setStatus('insufficient');
    }
  }, [deckId, pairCount]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const selectTile = useCallback(
    (tileId: string) => {
      // Đang flash đỏ → bỏ qua tap (chờ flash xong)
      if (wrongPair) return;

      const tile = tiles.find((t) => t.id === tileId);
      if (!tile || tile.isMatched) return;

      if (tile.side === 'left') {
        // Toggle nếu đã chọn
        if (selectedLeftId === tileId) {
          setSelectedLeftId(null);
          return;
        }
        setSelectedLeftId(tileId);
      } else {
        if (selectedRightId === tileId) {
          setSelectedRightId(null);
          return;
        }
        setSelectedRightId(tileId);
      }
    },
    [tiles, selectedLeftId, selectedRightId, wrongPair]
  );

  // Check match khi cả 2 side đã chọn
  useEffect(() => {
    if (!selectedLeftId || !selectedRightId) return;

    const leftTile = tiles.find((t) => t.id === selectedLeftId);
    const rightTile = tiles.find((t) => t.id === selectedRightId);
    if (!leftTile || !rightTile) return;

    const isMatch = leftTile.pairId === rightTile.pairId;

    if (isMatch) {
      // Match đúng: đánh dấu cả 2 tile là matched
      setTiles((prev) =>
        prev.map((t) =>
          t.id === leftTile.id || t.id === rightTile.id
            ? { ...t, isMatched: true }
            : t
        )
      );
      setMatchedCount((c) => c + 1);
      setSelectedLeftId(null);
      setSelectedRightId(null);
    } else {
      // Sai: flash đỏ 600ms rồi reset
      setWrongPair({ leftId: leftTile.id, rightId: rightTile.id });
      setWrongAttempts((c) => c + 1);

      const timer = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, WRONG_FLASH_MS);

      return () => clearTimeout(timer);
    }
  }, [selectedLeftId, selectedRightId, tiles]);

  // Check hoàn thành
  useEffect(() => {
    if (matchedCount > 0 && matchedCount === totalPairs && status === 'active') {
      setEndTime(Date.now());
      setStatus('finished');
    }
  }, [matchedCount, totalPairs, status]);

  const result: MatchResult | null =
    status === 'finished' && endTime
      ? {
          totalPairs,
          wrongAttempts,
          totalTimeMs: endTime - startTime,
          accuracy:
            totalPairs / (totalPairs + wrongAttempts), // 0-1
        }
      : null;

  return {
    status,
    tiles,
    selectedLeftId,
    selectedRightId,
    wrongPair,
    matchedCount,
    totalPairs,
    wrongAttempts,
    result,
    selectTile,
    restart: loadRound,
  };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
