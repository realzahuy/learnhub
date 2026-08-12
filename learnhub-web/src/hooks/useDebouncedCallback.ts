import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 500
): [(...args: A) => void, () => void] {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args: A) => {
      cancel();
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [cancel, delay]
  );

  useEffect(() => cancel, [cancel]);

  return [debounced, cancel];
}
