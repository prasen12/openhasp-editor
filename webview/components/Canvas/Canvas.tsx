import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '../../store/useEditorStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { CanvasWidget } from './CanvasWidget';
import { Grid } from './Grid';
import { getRootWidgets } from '../../utils/widgetHierarchy';
import { collectHaWidgets, requestHaEvaluation } from '../../utils/haValues';
import './Canvas.css';

export const Canvas: React.FC = () => {
  const {
    pages, currentPageId, canvasWidth, canvasHeight,
    haPreviewEnabled, setHaPreviewEnabled, haValuesLoading, haValuesError,
  } = useEditorStore();
  const { clearSelection } = useSelectionStore();

  const boundWidgetCount = collectHaWidgets(pages).length;

  const togglePreview = () => {
    const next = !haPreviewEnabled;
    setHaPreviewEnabled(next);
    if (next) requestHaEvaluation(pages);
  };

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

  const previewTitle = haValuesError
    ? `Live HA values — error: ${haValuesError}`
    : haPreviewEnabled
      ? 'Live Home Assistant values shown, refreshed every 10s — click to turn off'
      : `Show live Home Assistant values (${boundWidgetCount} bound widget${boundWidgetCount === 1 ? '' : 's'})`;

  return (
    <div className="canvas-container">
      <div className="canvas-toolbar">
        <button
          type="button"
          className={`ha-preview-toggle ${haPreviewEnabled ? 'active' : ''}`}
          onClick={togglePreview}
          disabled={boundWidgetCount === 0 && !haPreviewEnabled}
          title={previewTitle}
        >
          {haValuesLoading ? '⏳' : '⚡'} Live HA{haPreviewEnabled && haValuesError ? ' ⚠' : ''}
        </button>
        {haPreviewEnabled && (
          <button
            type="button"
            className="ha-preview-refresh"
            onClick={() => requestHaEvaluation(pages)}
            title="Refresh values from Home Assistant"
          >
            ⟳
          </button>
        )}
      </div>
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
