import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Widget } from '../../types';
import { getPageLabel, sortPages } from '../../utils/pageLabel';

const nodeStyle = (depth: number, isSelected: boolean, isPage: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: `2px 6px 2px ${8 + depth * 14}px`,
  fontSize: '12px',
  cursor: 'pointer',
  borderRadius: '2px',
  userSelect: 'none',
  background: isSelected
    ? 'var(--vscode-list-activeSelectionBackground)'
    : 'transparent',
  color: isSelected
    ? 'var(--vscode-list-activeSelectionForeground)'
    : isPage
    ? 'var(--vscode-foreground)'
    : 'var(--vscode-foreground)',
  fontWeight: isPage ? 600 : 400,
});

function widgetLabel(w: Widget): string {
  if (w.name) return `${w.obj} — ${w.name}`;
  return `${w.obj} #${w.id}`;
}

interface WidgetNodeProps {
  widget: Widget;
  allWidgets: Widget[];
  depth: number;
  pageId: number;
  selectedIds: number[];
  onSelect: (widgetId: number, pageId: number) => void;
}

const WidgetNode: React.FC<WidgetNodeProps> = ({ widget, allWidgets, depth, pageId, selectedIds, onSelect }) => {
  const children = allWidgets.filter(w => w.parentid === widget.id);
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedIds.includes(widget.id);

  return (
    <>
      <div
        style={nodeStyle(depth, isSelected, false)}
        onClick={() => onSelect(widget.id, pageId)}
        title={widget.description ?? widget.name ?? `${widget.obj} #${widget.id}`}
      >
        {children.length > 0 && (
          <span
            style={{ fontSize: '10px', opacity: 0.6, width: '10px', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          >
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {children.length === 0 && <span style={{ width: '10px', flexShrink: 0 }} />}
        <span style={{ opacity: 0.5, fontSize: '10px', flexShrink: 0 }}>⬡</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {widgetLabel(widget)}
        </span>
      </div>
      {expanded && children.map(child => (
        <WidgetNode
          key={child.id}
          widget={child}
          allWidgets={allWidgets}
          depth={depth + 1}
          pageId={pageId}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

export const LayoutOutline: React.FC = () => {
  const { pages, currentPageId, setCurrentPage } = useEditorStore();
  const { selectedWidgetIds, selectWidget, clearSelection } = useSelectionStore();
  const [expanded, setExpanded] = useState(true);
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});

  const isPageExpanded = (pageId: number) =>
    expandedPages[pageId] !== undefined ? expandedPages[pageId] : true;

  const togglePage = (pageId: number) =>
    setExpandedPages(prev => ({ ...prev, [pageId]: !isPageExpanded(pageId) }));

  const handleSelectWidget = (widgetId: number, pageId: number) => {
    setCurrentPage(pageId);
    clearSelection();
    selectWidget(widgetId, false);
  };

  const handleSelectPage = (pageId: number) => {
    setCurrentPage(pageId);
    clearSelection();
  };

  return (
    <div style={{ borderBottom: '1px solid var(--vscode-panel-border)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          opacity: 0.8,
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <span>Layout Outline</span>
        <span>{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div style={{ paddingBottom: '4px', maxHeight: '280px', overflowY: 'auto' }}>
          {sortPages(pages).map(page => {
            const rootWidgets = page.widgets.filter(w => !w.parentid);
            const isActive = page.id === currentPageId;
            const open = isPageExpanded(page.id);

            return (
              <div key={page.id}>
                <div
                  style={{
                    ...nodeStyle(0, isActive && selectedWidgetIds.length === 0, true),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={() => handleSelectPage(page.id)}
                  title={page.comment ?? page.name ?? `Page ${page.id}`}
                >
                  <span
                    style={{ fontSize: '10px', opacity: 0.6, width: '10px', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); togglePage(page.id); }}
                  >
                    {open ? '▾' : '▸'}
                  </span>
                  <span style={{ opacity: 0.5, fontSize: '10px', flexShrink: 0 }}>▣</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPageLabel(page)}
                  </span>
                  <span style={{ marginLeft: 'auto', opacity: 0.4, fontSize: '10px', flexShrink: 0 }}>
                    {page.widgets.length}
                  </span>
                </div>

                {open && rootWidgets.map(widget => (
                  <WidgetNode
                    key={widget.id}
                    widget={widget}
                    allWidgets={page.widgets}
                    depth={1}
                    pageId={page.id}
                    selectedIds={selectedWidgetIds}
                    onSelect={handleSelectWidget}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
