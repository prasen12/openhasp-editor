import React, { useEffect, useRef, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEditorStore } from './store/useEditorStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useSelectionStore } from './store/useSelectionStore';
import { useClipboardStore } from './store/useClipboardStore';
import { vscode } from './utils/vscodeApi';
import { EditorLayout } from './components/Layout/EditorLayout';
import { WidgetPalette } from './components/Palette/WidgetPalette';
import { Canvas } from './components/Canvas/Canvas';
import { PageManager } from './components/PageManager/PageManager';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';
import { DevicePropertiesPanel } from './components/DeviceProperties/DevicePropertiesPanel';
import { WidgetRenderer } from './components/Rendering/WidgetRenderer';
import { getNextWidgetId, WidgetDefinition } from './config/widgetDefinitions';
import { Widget } from './types';
import { findWidgetAtPoint, getWidgetAbsoluteRect, isDescendant } from './utils/widgetHierarchy';
import { collectWithDescendants, cloneWidgetsForPaste } from './utils/clipboard';
import { getPageLabel } from './utils/pageLabel';

const GRID = 10;

export const App: React.FC = () => {
  let { pages, setPages, setFileName, isDirty, currentPageId, setCurrentPage, addWidget, addWidgets, updateWidget, deleteWidgets,
        canvasWidth, canvasHeight, setCanvasSize, deviceProperties, setDeviceProperties, setFontOverrideUri, setImageUris,
        setHaEntities, setHaEntitiesError } = useEditorStore();
  const { pushHistory } = useHistoryStore();
  const { selectedWidgetIds, clearSelection, selectWidget, selectMultiple } = useSelectionStore();
  const { copiedWidgets, pasteCount, copyWidgets, registerPaste } = useClipboardStore();

  const [activeCanvasWidget, setActiveCanvasWidget] = useState<Widget | null>(null);
  const [activePaletteDefinition, setActivePaletteDefinition] = useState<WidgetDefinition | null>(null);

  // Delete / copy / paste selected widgets via keyboard (skip when focus is in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWidgetIds.length === 0) return;
        e.preventDefault();
        deleteWidgets(currentPageId, selectedWidgetIds);
        clearSelection();
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;
      const currentPage = pages.find(p => p.id === currentPageId);
      if (!currentPage) return;

      if (e.key.toLowerCase() === 'c') {
        if (selectedWidgetIds.length === 0) return;
        e.preventDefault();
        copyWidgets(collectWithDescendants(selectedWidgetIds, currentPage.widgets));
        return;
      }

      if (e.key.toLowerCase() === 'v') {
        if (copiedWidgets.length === 0) return;
        e.preventDefault();
        const offset = 20 + pasteCount * 20;
        const newWidgets = cloneWidgetsForPaste(copiedWidgets, currentPage.widgets, currentPageId, offset);
        addWidgets(currentPageId, newWidgets);
        registerPaste();
        selectMultiple(newWidgets.map(w => w.id));
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, currentPageId, pages, deleteWidgets, clearSelection, copiedWidgets, pasteCount, copyWidgets, registerPaste, addWidgets, selectMultiple]);
  const fontStyleRef = useRef<HTMLStyleElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Inject font-face CSS when fontOverrideUri changes
  const applyFontOverride = (fontOverrideUri: string, fontName?: string) => {
    if (fontStyleRef.current) {
      fontStyleRef.current.remove();
      fontStyleRef.current = null;
    }
    if (!fontOverrideUri) return;

    const name = fontName || 'HaspOverrideFont';
    const ext = fontOverrideUri.split('.').pop()?.toLowerCase() ?? '';
    const fmt = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : 'truetype';

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${name}';
        src: url('${fontOverrideUri}') format('${fmt}');
      }
    `;
    document.head.appendChild(style);
    fontStyleRef.current = style;
  };

  useEffect(() => {
    vscode.ready();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'init':
          setPages(message.pages);
          setFileName(message.fileName);
          setCanvasSize(message.canvasWidth, message.canvasHeight);
          canvasHeight = message.canvasHeight;
          canvasWidth = message.canvasWidth;
          if (message.deviceProperties) {
            setDeviceProperties(message.deviceProperties);
            // After setting from server, clear dirty so we don't immediately re-save
            useEditorStore.setState({ isDirty: false });
          }
          if (message.fontOverrideUri !== undefined) {
            setFontOverrideUri(message.fontOverrideUri);
            applyFontOverride(message.fontOverrideUri, message.deviceProperties?.fontName);
          }
          if (message.imageUris !== undefined) {
            setImageUris(message.imageUris);
          }
          break;

        case 'documentChanged':
          setPages(message.pages);
          if (message.deviceProperties) {
            setDeviceProperties(message.deviceProperties);
            useEditorStore.setState({ isDirty: false });
          }
          if (message.fontOverrideUri !== undefined) {
            setFontOverrideUri(message.fontOverrideUri);
            applyFontOverride(message.fontOverrideUri, message.deviceProperties?.fontName);
          }
          if (message.imageUris !== undefined) {
            setImageUris(message.imageUris);
          }
          break;

        case 'navigateTo':
          setCurrentPage(message.pageId);
          clearSelection();
          if (message.widgetId !== undefined) {
            selectWidget(message.widgetId, false);
          }
          break;

        case 'haEntities':
          setHaEntities(message.entities);
          break;

        case 'haEntitiesError':
          setHaEntitiesError(message.message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setPages, setFileName]);

  useEffect(() => {
    if (isDirty && pages.length > 0) {
      vscode.updatePages(pages, deviceProperties ?? undefined);
    }
  }, [pages, isDirty, deviceProperties]);

  useEffect(() => {
    if (pages.length > 0) {
      const timer = setTimeout(() => {
        pushHistory(pages);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pages, pushHistory]);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'canvas-widget') {
      setActiveCanvasWidget(event.active.data.current.widget);
      setActivePaletteDefinition(null);
    } else if (event.active.data.current?.type === 'palette-widget') {
      setActivePaletteDefinition(event.active.data.current.definition);
      setActiveCanvasWidget(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCanvasWidget(null);
    setActivePaletteDefinition(null);

    if (!over) return;

    if (active.data.current?.type === 'palette-widget' && over.id === 'canvas') {
      const definition = active.data.current.definition as WidgetDefinition;
      const currentPage = pages.find(p => p.id === currentPageId);
      if (!currentPage) return;

      const canvasElement = document.querySelector('.canvas') as HTMLElement;
      if (!canvasElement) return;

      const rect = canvasElement.getBoundingClientRect();
      const w = (definition.defaultProps.w as number) ?? 50;
      const h = (definition.defaultProps.h as number) ?? 25;

      const finalMouseX = (event.activatorEvent as MouseEvent).clientX + event.delta.x;
      const finalMouseY = (event.activatorEvent as MouseEvent).clientY + event.delta.y;
      const dropAbsX = finalMouseX - rect.left - w / 2;
      const dropAbsY = finalMouseY - rect.top - h / 2;
      const dropCenterX = finalMouseX - rect.left;
      const dropCenterY = finalMouseY - rect.top;

      const parentWidget = findWidgetAtPoint(dropCenterX, dropCenterY, currentPage.widgets);

      let x: number, y: number, parentid: number | undefined;
      if (parentWidget) {
        const parentRect = getWidgetAbsoluteRect(parentWidget.id, currentPage.widgets)!;
        x = Math.max(0, Math.min((parentWidget.w ?? 100) - w, Math.round((dropAbsX - parentRect.x) / GRID) * GRID));
        y = Math.max(0, Math.min((parentWidget.h ?? 30) - h, Math.round((dropAbsY - parentRect.y) / GRID) * GRID));
        parentid = parentWidget.id;
      } else {
        x = Math.max(0, Math.min(canvasWidth - w, Math.round(dropAbsX / GRID) * GRID));
        y = Math.max(0, Math.min(canvasHeight - h, Math.round(dropAbsY / GRID) * GRID));
        parentid = undefined;
      }

      const newWidget: Widget = {
        ...definition.defaultProps,
        obj: definition.defaultProps.obj!,
        id: getNextWidgetId(currentPage.widgets),
        x,
        y,
        page: currentPageId,
        ...(parentid !== undefined ? { parentid } : {}),
      };

      addWidget(currentPageId, newWidget);
    }

    if (active.data.current?.type === 'canvas-widget' && over.id === 'canvas') {
      const widget = active.data.current.widget as Widget;
      const pageId = active.data.current.pageId as number;
      const delta = event.delta;
      const currentPage = pages.find(p => p.id === pageId);
      if (!currentPage) return;

      const currentAbsRect = getWidgetAbsoluteRect(widget.id, currentPage.widgets);
      if (!currentAbsRect) return;

      const absNewX = Math.round((currentAbsRect.x + delta.x) / GRID) * GRID;
      const absNewY = Math.round((currentAbsRect.y + delta.y) / GRID) * GRID;
      const dropCenterX = absNewX + (widget.w ?? 100) / 2;
      const dropCenterY = absNewY + (widget.h ?? 30) / 2;

      const targetWidget = findWidgetAtPoint(dropCenterX, dropCenterY, currentPage.widgets, widget.id);
      const isCircular = targetWidget ? isDescendant(targetWidget.id, widget.id, currentPage.widgets) : false;

      if (targetWidget && !isCircular && targetWidget.id !== widget.parentid) {
        const parentRect = getWidgetAbsoluteRect(targetWidget.id, currentPage.widgets)!;
        const relX = Math.max(0, Math.min((targetWidget.w ?? 100) - (widget.w ?? 100), absNewX - parentRect.x));
        const relY = Math.max(0, Math.min((targetWidget.h ?? 30) - (widget.h ?? 30), absNewY - parentRect.y));
        updateWidget(pageId, widget.id, { parentid: targetWidget.id, x: relX, y: relY });
      } else if (!targetWidget && widget.parentid) {
        const relX = Math.max(0, Math.min(canvasWidth - (widget.w ?? 100), absNewX));
        const relY = Math.max(0, Math.min(canvasHeight - (widget.h ?? 30), absNewY));
        updateWidget(pageId, widget.id, { parentid: undefined, x: relX, y: relY });
      } else if (widget.parentid) {
        const parentWidget = currentPage.widgets.find(w => w.id === widget.parentid);
        const parentRect = getWidgetAbsoluteRect(widget.parentid, currentPage.widgets);
        if (parentWidget && parentRect) {
          const relX = Math.max(0, Math.min((parentWidget.w ?? 100) - (widget.w ?? 100), absNewX - parentRect.x));
          const relY = Math.max(0, Math.min((parentWidget.h ?? 30) - (widget.h ?? 30), absNewY - parentRect.y));
          updateWidget(pageId, widget.id, { x: relX, y: relY });
        }
      } else {
        updateWidget(pageId, widget.id, {
          x: Math.max(0, Math.min(canvasWidth - (widget.w ?? 100), absNewX)),
          y: Math.max(0, Math.min(canvasHeight - (widget.h ?? 30), absNewY)),
        });
      }
    }
  };

  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <EditorLayout
        topBar={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>
              {currentPage ? getPageLabel(currentPage) : `Page ${currentPageId}`}
            </span>
            {isDirty && <span style={{ fontSize: '11px', opacity: 0.6 }}>• Modified</span>}
          </div>
        }
        leftPanel={
          <>
            <DevicePropertiesPanel />
            <div style={{ borderTop: '1px solid var(--vscode-panel-border)', marginTop: '8px' }} />
            <WidgetPalette />
          </>
        }
        canvasHeader={<PageManager />}
        canvas={<Canvas />}
        rightPanel={<PropertiesPanel />}
        bottomBar={
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{currentPage?.widgets.length || 0} widget{currentPage?.widgets.length !== 1 ? 's' : ''}</span>
          </div>
        }
      />
      <DragOverlay>
        {activeCanvasWidget && (
          <div style={{ width: activeCanvasWidget.w ?? 100, height: activeCanvasWidget.h ?? 30, opacity: 0.75, pointerEvents: 'none' }}>
            <WidgetRenderer widget={activeCanvasWidget} />
          </div>
        )}
        {activePaletteDefinition && (
          <div style={{
            padding: '4px 10px',
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {activePaletteDefinition.icon} {activePaletteDefinition.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
