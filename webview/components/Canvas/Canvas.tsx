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

  // Page 0 is the overlay page — its widgets are shown (read-only) on top of every other page.
  const overlayPage = currentPageId !== 0 ? pages.find(p => p.id === 0) : undefined;
  const overlayWidgets = overlayPage?.widgets || [];
  const overlayRootWidgets = getRootWidgets(overlayWidgets);

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

          {overlayRootWidgets.length > 0 && (
            <div className="canvas-overlay-layer">
              {overlayRootWidgets.map(widget => (
                <CanvasWidget key={`overlay-${widget.id}`} widget={widget} pageId={0} allWidgets={overlayWidgets} interactive={false} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {allWidgets.length === 0 && overlayWidgets.length === 0 && (
            <div className="canvas-empty-state">
              <p>Drag widgets from the palette to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
