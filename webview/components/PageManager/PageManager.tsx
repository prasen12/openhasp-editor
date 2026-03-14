import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import './PageManager.css';

export const PageManager: React.FC = () => {
  const { pages, currentPageId, setCurrentPage, addPage, deletePage } = useEditorStore();

  return (
    <div className="page-tabs">
      {pages.map(page => (
        <div
          key={page.id}
          className={`page-tab ${page.id === currentPageId ? 'active' : ''}`}
          onClick={() => setCurrentPage(page.id)}
          title={`${page.comment || page.name || `Page ${page.id}`} — ${page.widgets.length} widget${page.widgets.length !== 1 ? 's' : ''}`}
        >
          <span className="page-tab-label">
            {page.comment || page.name || `Page ${page.id}`}
          </span>
          {pages.length > 1 && (
            <span
              className="page-tab-close"
              onClick={e => { e.stopPropagation(); deletePage(page.id); }}
              title="Remove page"
            >
              ×
            </span>
          )}
        </div>
      ))}

      <button className="page-tab-add" onClick={addPage} title="Add new page">
        +
      </button>
    </div>
  );
};
