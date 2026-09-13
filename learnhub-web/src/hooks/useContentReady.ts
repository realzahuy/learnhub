import { useLayoutEffect, useRef } from 'react';
import { uiConfig } from '../config/uiConfig';

export function useContentReady(loading: boolean) {
  const contentRef = useRef<HTMLDivElement>(null);
  const wasLoading = useRef(loading);

  useLayoutEffect(() => {
    const reveal = wasLoading.current && !loading;
    wasLoading.current = loading;
    const content = contentRef.current;
    if (!reveal || !content || content.querySelector('.app-skeleton')
        || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof content.animate !== 'function') return;

    const animation = content.animate([{ opacity: 0.65 }, { opacity: 1 }], {
      duration: uiConfig.timing.routeTransitionMs,
      easing: 'ease-out',
    });
    return () => animation.cancel();
  }, [loading]);

  return contentRef;
}
