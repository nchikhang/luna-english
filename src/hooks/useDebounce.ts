import { useEffect, useState } from 'react';

/**
 * Debounce một value: chỉ update sau khi value đứng yên `delay` ms.
 * Dùng để tránh gọi API mỗi lần user gõ phím.
 *
 * Ví dụ:
 *   const debouncedQuery = useDebounce(searchInput, 500);
 *   useEffect(() => { fetch(debouncedQuery) }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}