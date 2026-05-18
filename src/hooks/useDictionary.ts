import { useEffect, useState } from 'react';
import {
  type DictionaryResult,
  DictionaryError,
  lookupWord,
} from '@/services/api/dictionary';

interface UseDictionaryResult {
  data: DictionaryResult | null;
  isLoading: boolean;
  error: DictionaryError | null;
}

/**
 * Hook tra từ điển. Tự động fetch khi `word` thay đổi.
 * Nên dùng kết hợp với useDebounce để tránh gọi quá nhiều:
 *
 *   const debouncedWord = useDebounce(input, 500);
 *   const { data, isLoading } = useDictionary(debouncedWord);
 *
 * Nếu word rỗng/ngắn quá thì không fetch.
 */
export function useDictionary(word: string): UseDictionaryResult {
  const [data, setData] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<DictionaryError | null>(null);

  useEffect(() => {
    // Reset khi từ ngắn / rỗng
    if (!word || word.trim().length < 2) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    lookupWord(word)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const dictError =
          err instanceof DictionaryError
            ? err
            : new DictionaryError(String(err), 'UNKNOWN');
        setError(dictError);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Cleanup: nếu component unmount hoặc word đổi trước khi fetch xong
    // → ignore kết quả cũ (tránh race condition)
    return () => {
      cancelled = true;
    };
  }, [word]);

  return { data, isLoading, error };
}