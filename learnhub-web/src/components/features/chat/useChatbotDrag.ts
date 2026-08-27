import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { calculateChatbotPanelLayout, ChatbotPanelLayout } from './chatbotPlacement';

const POSITION_KEY = 'learnhub-chatbot-widget-position';
const DEFAULT_POSITION = { x: 0, y: 0 };

type DragState = {
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  rect: DOMRect;
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
  const [panelLayout, setPanelLayout] = useState<ChatbotPanelLayout>({
    placement: 'top',
    offsetX: 0,
    offsetY: 0,
  });
  const widgetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);
  const positionRef = useRef(dragPosition);

  const updatePosition = (clientX: number, clientY: number) => {
    const current = dragStateRef.current;
    if (!current) return;
    const deltaX = clientX - current.startX;
    const deltaY = clientY - current.startY;
    if (!draggedRef.current && Math.hypot(deltaX, deltaY) < 4) return;
    draggedRef.current = true;

    const safeDeltaX = Math.min(
      Math.max(deltaX, 8 - current.rect.left),
      window.innerWidth - 8 - current.rect.right
    );
    const safeDeltaY = Math.min(
      Math.max(deltaY, 8 - current.rect.top),
      window.innerHeight - 8 - current.rect.bottom
    );
    const panelWidth = panelRef.current?.offsetWidth ?? Math.min(window.innerWidth * 0.5, 680);
    const panelHeight = panelRef.current?.offsetHeight ?? Math.min(window.innerHeight * 0.7, 720);
    const layout = calculateChatbotPanelLayout({
      buttonLeft: current.rect.left + safeDeltaX,
      buttonTop: current.rect.top + safeDeltaY,
      buttonWidth: current.rect.width,
      buttonHeight: current.rect.height,
      panelWidth,
      panelHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setPanelLayout(layout);
    const next = { x: current.startOffsetX + safeDeltaX, y: current.startOffsetY + safeDeltaY };
    positionRef.current = next;
    setDragPosition(next);
  };

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
      setPanelLayout(layout);
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
      rect,
    };
    draggedRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current) return;
    updatePosition(event.clientX, event.clientY);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
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
    '--chatbot-panel-offset-x': `${panelLayout.offsetX}px`,
    '--chatbot-panel-offset-y': `${panelLayout.offsetY}px`,
  } as CSSProperties;

  return {
    widgetRef,
    panelRef,
    isDragging,
    panelPlacement: panelLayout.placement,
    widgetStyle,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    consumeDragged,
  };
};
