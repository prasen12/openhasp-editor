import { useCallback, useRef } from 'react';
import { useEditorStore } from '../store/useEditorStore';

const GRID = 10;
const MIN_SIZE = 10;

export type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeState {
  direction: ResizeDirection;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

export function useResize(widgetId: number, pageId: number) {
  const resizeRef = useRef<ResizeState | null>(null);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const state = resizeRef.current;
    if (!state) return;

    const { updateWidget, canvasWidth, canvasHeight, pages } = useEditorStore.getState();
    const currentPage = pages.find(p => p.id === pageId);
    if (!currentPage) return;

    const widget = currentPage.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const deltaX = e.clientX - state.startMouseX;
    const deltaY = e.clientY - state.startMouseY;
    const dir = state.direction;

    let newX = state.startX;
    let newY = state.startY;
    let newW = state.startW;
    let newH = state.startH;

    if (dir.includes('e')) newW = state.startW + deltaX;
    if (dir.includes('w')) { newW = state.startW - deltaX; newX = state.startX + deltaX; }
    if (dir.includes('s')) newH = state.startH + deltaY;
    if (dir.includes('n')) { newH = state.startH - deltaY; newY = state.startY + deltaY; }

    newX = Math.round(newX / GRID) * GRID;
    newY = Math.round(newY / GRID) * GRID;
    newW = Math.round(newW / GRID) * GRID;
    newH = Math.round(newH / GRID) * GRID;

    if (newW < MIN_SIZE) {
      newW = MIN_SIZE;
      if (dir.includes('w')) newX = state.startX + state.startW - MIN_SIZE;
    }
    if (newH < MIN_SIZE) {
      newH = MIN_SIZE;
      if (dir.includes('n')) newY = state.startY + state.startH - MIN_SIZE;
    }

    let maxW = canvasWidth;
    let maxH = canvasHeight;
    if (widget.parentid) {
      const parent = currentPage.widgets.find(w => w.id === widget.parentid);
      if (parent) {
        maxW = parent.w ?? 100;
        maxH = parent.h ?? 30;
      }
    }

    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    if (newX + newW > maxW) newW = Math.floor((maxW - newX) / GRID) * GRID;
    if (newY + newH > maxH) newH = Math.floor((maxH - newY) / GRID) * GRID;
    newW = Math.max(MIN_SIZE, newW);
    newH = Math.max(MIN_SIZE, newH);

    updateWidget(pageId, widgetId, { x: newX, y: newY, w: newW, h: newH });
  }, [widgetId, pageId]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    resizeRef.current = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handlePointerMove]);

  const startResize = useCallback((direction: ResizeDirection, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const { pages } = useEditorStore.getState();
    const currentPage = pages.find(p => p.id === pageId);
    const widget = currentPage?.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    resizeRef.current = {
      direction,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: widget.x ?? 0,
      startY: widget.y ?? 0,
      startW: widget.w ?? 100,
      startH: widget.h ?? 30,
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = `${direction}-resize`;
    document.body.style.userSelect = 'none';
  }, [widgetId, pageId, handlePointerMove, handlePointerUp]);

  return { startResize };
}
