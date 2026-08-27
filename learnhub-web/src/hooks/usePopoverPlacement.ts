import { RefObject, useLayoutEffect, useState } from 'react';

const GAP = 6;

const VIEWPORT_MARGIN = 8;

interface PopoverPlacement {

  dropUp: boolean;

  flipped: boolean;
}

const INITIAL: PopoverPlacement = { dropUp: false, flipped: false };

export function usePopoverPlacement(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  anchorEdge: 'left' | 'right' = 'left'
): PopoverPlacement {
  const [placement, setPlacement] = useState<PopoverPlacement>(INITIAL);

  useLayoutEffect(() => {

    if (!isOpen) {
      setPlacement(INITIAL);
      return;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;

      const rect = anchor.getBoundingClientRect();
      const height = popover.offsetHeight;
      const width = popover.offsetWidth;

      const overflowsBelow = rect.bottom + GAP + height + VIEWPORT_MARGIN > window.innerHeight;
      const fitsAbove = rect.top - GAP - height - VIEWPORT_MARGIN >= 0;

      const overflowsSide =
        anchorEdge === 'right'
          ? rect.right - width < VIEWPORT_MARGIN
          : rect.left + width + VIEWPORT_MARGIN > window.innerWidth;
      const fitsFlipped =
        anchorEdge === 'right'
          ? rect.left + width + VIEWPORT_MARGIN <= window.innerWidth
          : rect.right - width >= VIEWPORT_MARGIN;

      setPlacement({
        dropUp: overflowsBelow && fitsAbove,
        flipped: overflowsSide && fitsFlipped,
      });
    };

    measure();

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isOpen, anchorRef, popoverRef, anchorEdge]);

  return placement;
}
