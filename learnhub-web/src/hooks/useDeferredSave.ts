import { useCallback, useEffect, useRef } from 'react';
import { uiConfig } from '../config/uiConfig';

export function useDeferredSave<T>(save: (payload: T) => Promise<void>): (payload: T) => void {
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ payload: T } | null>(null);
  const queueRef = useRef<Promise<unknown> | null>(null);

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const enqueue = useCallback((payload: T) => {
    const previous = queueRef.current ?? Promise.resolve();

    const next = previous.catch(() => undefined).then(() => saveRef.current(payload));
    queueRef.current = next;
    next.catch(() => undefined).then(() => {
      if (queueRef.current === next) queueRef.current = null;
    });
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) enqueue(pending.payload);
  }, [enqueue]);

  const schedule = useCallback(
    (payload: T) => {
      pendingRef.current = { payload };
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, uiConfig.timing.reorderSaveDelayMs);
    },
    [flush]
  );

  useEffect(() => {

    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);

      flush();
    };
  }, [flush]);

  return schedule;
}
