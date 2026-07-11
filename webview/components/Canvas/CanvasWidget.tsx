import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Widget } from '../../types';
import { useSelectionStore } from '../../store/useSelectionStore';
import { WidgetRenderer } from '../Rendering/WidgetRenderer';
import { getChildWidgets } from '../../utils/widgetHierarchy';
import { useResize, ResizeDirection } from '../../hooks/useResize';
import { getBoxStyle, getPaddingStyle } from '../../utils/styleProps';
import './CanvasWidget.css';

interface CanvasWidgetProps {
  widget: Widget;
  pageId: number;
  allWidgets: Widget[];
  /** False for widgets inherited from the Page 0 overlay layer — shown but not selectable/editable from other pages. */
  interactive?: boolean;
}

export const CanvasWidget: React.FC<CanvasWidgetProps> = ({ widget, pageId, allWidgets, interactive = true }) => {
  const { selectWidget, isSelected } = useSelectionStore();
  const selected = interactive && isSelected(widget.id);
  const { startResize } = useResize(widget.id, pageId);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `widget-${pageId}-${widget.id}`,
    data: {
      type: 'canvas-widget',
      widget,
      pageId
    },
    disabled: !interactive
  });

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    selectWidget(widget.id, e.shiftKey);
  };

  const handleResizePointerDown = (direction: ResizeDirection) => (e: React.PointerEvent) => {
    startResize(direction, e);
  };

  const childWidgets = getChildWidgets(widget.id, allWidgets);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: widget.x || 0,
    top: widget.y || 0,
    width: widget.w || 100,
    height: widget.h || 30,
    transform: CSS.Translate.toString(transform),
    cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default',
    opacity: (isDragging ? 0.5 : 1) * ((widget.opacity ?? 255) / 255),
    overflow: childWidgets.length > 0 ? 'hidden' : undefined,
    ...getBoxStyle(widget),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-widget ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      {...(interactive ? listeners : undefined)}
      {...(interactive ? attributes : undefined)}
    >
      <div style={{ width: '100%', height: '100%', ...getPaddingStyle(widget) }}>
        <WidgetRenderer widget={widget} />
      </div>

      {childWidgets.map(child => (
        <CanvasWidget key={child.id} widget={child} pageId={pageId} allWidgets={allWidgets} interactive={interactive} />
      ))}

      {selected && (
        <div className="widget-selection-overlay">
          <div className="resize-handle resize-handle-nw" onPointerDown={handleResizePointerDown('nw')} />
          <div className="resize-handle resize-handle-n" onPointerDown={handleResizePointerDown('n')} />
          <div className="resize-handle resize-handle-ne" onPointerDown={handleResizePointerDown('ne')} />
          <div className="resize-handle resize-handle-e" onPointerDown={handleResizePointerDown('e')} />
          <div className="resize-handle resize-handle-se" onPointerDown={handleResizePointerDown('se')} />
          <div className="resize-handle resize-handle-s" onPointerDown={handleResizePointerDown('s')} />
          <div className="resize-handle resize-handle-sw" onPointerDown={handleResizePointerDown('sw')} />
          <div className="resize-handle resize-handle-w" onPointerDown={handleResizePointerDown('w')} />
        </div>
      )}
    </div>
  );
};
