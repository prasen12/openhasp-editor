import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '../../store/useEditorStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { CanvasWidget } from './CanvasWidget';
import { Grid } from './Grid';
import { getRootWidgets } from '../../utils/widgetHierarchy';
import './Canvas.css';

export const Canvas: React.FC = () => {
  const { pages, currentPageId, canvasWidth, canvasHeight } = useEditorStore();
  const { clearSelection } = useSelectionStore();

  const { setNodeRef } = useDroppable({
    id: 'canvas',
    data: { type: 'canvas' }
  });

  const currentPage = pages.find(p => p.id === currentPageId);
  const allWidgets = currentPage?.widgets || [];
  const rootWidgets = getRootWidgets(allWidgets);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Clear selection if clicking on canvas background
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  return (
    <div className="canvas-container">
      <div className="canvas-viewport">
        <div
          ref={setNodeRef}
          className="canvas"
          onClick={handleCanvasClick}
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            position: 'relative'
          }}
        >
          <Grid size={10} />

          {rootWidgets.map(widget => (
            <CanvasWidget key={widget.id} widget={widget} pageId={currentPageId} allWidgets={allWidgets} />
          ))}

          {/* Empty state */}
          {allWidgets.length === 0 && (
            <div className="canvas-empty-state">
              <p>Drag widgets from the palette to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
