import { useCallback, useEffect, useRef, useState } from 'react';

export const useCoalescedRefreshTrigger = (delayMs = 150) => {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const timerRef = useRef<number | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setRefreshVersion((version) => version + 1);
    }, delayMs);
  }, [delayMs]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  return { refreshVersion, scheduleRefresh };
};
