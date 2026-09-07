import { ReactNode, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';

interface RouteTransitionProps {
  children: ReactNode;
}

const RouteTransition = ({ children }: RouteTransitionProps) => {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduceMotion) return;

    const target = root.querySelector<HTMLElement>('main, [role="main"]') ?? root;
    if (typeof target.animate !== 'function') return;

    animationRef.current?.cancel();
    const animation = target.animate(
      [
        { opacity: 0.78, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: uiConfig.timing.routeTransitionMs,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      animation.cancel();
      if (animationRef.current === animation) animationRef.current = null;
    };

    return () => {
      animation.onfinish = null;
      animation.cancel();
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [pathname]);

  return (
    <div ref={rootRef} className="route-transition">
      {children}
    </div>
  );
};

export default RouteTransition;
