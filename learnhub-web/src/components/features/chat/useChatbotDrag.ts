import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { calculateChatbotPanelLayout, PanelPlacement } from './chatbotPlacement';

const POSITION_KEY = 'learnhub-chatbot-widget-position';
const DEFAULT_POSITION = { x: 0, y: 0 };

type DragState = {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  rectLeft: number;
  rectRight: number;
  rectTop: number;
  rectBottom: number;
};

const loadPosition = () => {
  try {
    const saved = localStorage.getItem(POSITION_KEY);
    if (!saved) return DEFAULT_POSITION;
    const parsed = JSON.parse(saved);
    return typeof parsed.x === 'number' && typeof parsed.y === 'number' ? parsed : DEFAULT_POSITION;
  } catch {
    return DEFAULT_POSITION;
  }
};

export const useChatbotDrag = (isOpen: boolean) => {
  const [dragPosition, setDragPosition] = useState(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [panelPlacement, setPanelPlacement] = useState<PanelPlacement>('top');
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);
  const placementRef = useRef<PanelPlacement>('top');
  const positionRef = useRef(dragPosition);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const current = dragStateRef.current;
    if (!current) return;
    const deltaX = clientX - current.startX;
    const deltaY = clientY - current.startY;
    if (!draggedRef.current && Math.hypot(deltaX, deltaY) < 4) return;
    draggedRef.current = true;

    const safeDeltaX = Math.min(Math.max(deltaX, 8 - current.rectLeft), window.innerWidth - 8 - current.rectRight);
    const safeDeltaY = Math.min(Math.max(deltaY, 8 - current.rectTop), window.innerHeight - 8 - current.rectBottom);
    const panelWidth = panelRef.current?.offsetWidth ?? Math.min(window.innerWidth * 0.5, 680);
    const panelHeight = panelRef.current?.offsetHeight ?? Math.min(window.innerHeight * 0.7, 720);
    const layout = calculateChatbotPanelLayout({
      buttonLeft: current.rectLeft + safeDeltaX,
      buttonTop: current.rectTop + safeDeltaY,
      buttonWidth: current.rectRight - current.rectLeft,
      buttonHeight: current.rectBottom - current.rectTop,
      panelWidth,
      panelHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    if (layout.placement !== placementRef.current) {
      placementRef.current = layout.placement;
      setPanelPlacement(layout.placement);
    }
    setPanelOffset({ x: layout.offsetX, y: layout.offsetY });
    const next = { x: current.startOffsetX + safeDeltaX, y: current.startOffsetY + safeDeltaY };
    positionRef.current = next;
    setDragPosition(next);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const widget = widgetRef.current;
      const panel = panelRef.current;
      if (!widget || !panel) return;
      const rect = widget.getBoundingClientRect();
      const layout = calculateChatbotPanelLayout({
        buttonLeft: rect.left,
        buttonTop: rect.top,
        buttonWidth: rect.width,
        buttonHeight: rect.height,
        panelWidth: panel.offsetWidth,
        panelHeight: panel.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      placementRef.current = layout.placement;
      setPanelPlacement(layout.placement);
      setPanelOffset({ x: layout.offsetX, y: layout.offsetY });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: dragPosition.x,
      startOffsetY: dragPosition.y,
      rectLeft: rect.left,
      rectRight: rect.right,
      rectTop: rect.top,
      rectBottom: rect.bottom,
    };
    draggedRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const pointer = pointerRef.current;
      if (pointer) updatePosition(pointer.x, pointer.y);
    });
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      const pointer = pointerRef.current;
      if (pointer) updatePosition(pointer.x, pointer.y);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    pointerRef.current = null;
    setIsDragging(false);
    if (draggedRef.current) localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
  };

  const consumeDragged = () => {
    if (!draggedRef.current) return false;
    draggedRef.current = false;
    return true;
  };

  const widgetStyle = {
    transform: `translate3d(${dragPosition.x}px, ${dragPosition.y}px, 0)`,
    '--chatbot-panel-offset-x': `${panelOffset.x}px`,
    '--chatbot-panel-offset-y': `${panelOffset.y}px`,
  } as CSSProperties;

  return {
    widgetRef,
    panelRef,
    isDragging,
    panelPlacement,
    widgetStyle,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    consumeDragged,
  };
};
