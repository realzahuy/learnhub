import { useCallback, useEffect, useState } from 'react';

interface Identifiable {
  id: number;
}

interface DragReorderResult {
  itemProps: (id: number) => {
    draggable: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };

  handleProps: (id: number) => {
    onMouseDown: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };

  isDragging: (id: number) => boolean;

  isDropTarget: (id: number) => boolean;
}

export const useDragReorder = <T extends Identifiable>(
  items: T[],
  onReorder: (next: T[]) => void
): DragReorderResult => {
  const [heldId, setHeldId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    if (heldId === null) return;
    const release = () => setHeldId(null);
    document.addEventListener('mouseup', release);
    return () => document.removeEventListener('mouseup', release);
  }, [heldId]);

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
        return;
      }
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [items, onReorder]
  );

  const moveById = useCallback(
    (id: number, targetId: number) => {
      move(
        items.findIndex((item) => item.id === id),
        items.findIndex((item) => item.id === targetId)
      );
    },
    [items, move]
  );

  const itemProps = useCallback(
    (id: number) => ({
      draggable: heldId === id,

      onMouseDown: (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('input, textarea, select, button, a')) return;

        e.stopPropagation();
        setHeldId(id);
      },
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation();

        e.dataTransfer.setData('text/plain', String(id));
        e.dataTransfer.effectAllowed = 'move';
        setDragId(id);
      },
      onDragEnter: (e: React.DragEvent) => {
        e.stopPropagation();
        setOverId(id);
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragId !== null) moveById(dragId, id);
        setHeldId(null);
        setDragId(null);
        setOverId(null);
      },
      onDragEnd: () => {
        setHeldId(null);
        setDragId(null);
        setOverId(null);
      },
    }),
    [heldId, dragId, moveById]
  );

  const handleProps = useCallback(
    (id: number) => ({
      onMouseDown: () => setHeldId(id),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const from = items.findIndex((item) => item.id === id);
        move(from, from + (e.key === 'ArrowUp' ? -1 : 1));
      },
    }),
    [items, move]
  );

  return {
    itemProps,
    handleProps,
    isDragging: (id: number) => dragId === id,
    isDropTarget: (id: number) => overId === id && dragId !== null && dragId !== id,
  };
};
