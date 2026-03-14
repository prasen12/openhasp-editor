import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Widget } from '../../types';
import { useSelectionStore } from '../../store/useSelectionStore';
import { WidgetRenderer } from '../Rendering/WidgetRenderer';
import { getChildWidgets } from '../../utils/widgetHierarchy';
import './CanvasWidget.css';

interface CanvasWidgetProps {
  widget: Widget;
  pageId: number;
  allWidgets: Widget[];
}

export const CanvasWidget: React.FC<CanvasWidgetProps> = ({ widget, pageId, allWidgets }) => {
  const { selectWidget, isSelected } = useSelectionStore();
  const selected = isSelected(widget.id);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `widget-${widget.id}`,
    data: {
      type: 'canvas-widget',
      widget,
      pageId
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(widget.id, e.shiftKey);
  };

  const childWidgets = getChildWidgets(widget.id, allWidgets);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: widget.x || 0,
    top: widget.y || 0,
    width: widget.w || 100,
    height: widget.h || 30,
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    overflow: childWidgets.length > 0 ? 'hidden' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-widget ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      <WidgetRenderer widget={widget} />

      {childWidgets.map(child => (
        <CanvasWidget key={child.id} widget={child} pageId={pageId} allWidgets={allWidgets} />
      ))}

      {selected && (
        <div className="widget-selection-overlay">
          <div className="resize-handle resize-handle-nw" />
          <div className="resize-handle resize-handle-ne" />
          <div className="resize-handle resize-handle-sw" />
          <div className="resize-handle resize-handle-se" />
        </div>
      )}
    </div>
  );
};
