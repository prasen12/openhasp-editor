import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { WidgetDefinition } from '../../config/widgetDefinitions';
import './DraggableWidget.css';

interface DraggableWidgetProps {
  definition: WidgetDefinition;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({ definition }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}`,
    data: {
      type: 'palette-widget',
      widgetType: definition.type,
      definition
    }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`draggable-widget ${isDragging ? 'dragging' : ''}`}
      title={definition.description}
    >
      <span className="widget-icon">{definition.icon}</span>
      <span className="widget-name">{definition.name}</span>
    </div>
  );
};
