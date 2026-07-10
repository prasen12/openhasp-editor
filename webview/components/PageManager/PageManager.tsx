import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { getPageLabel, isOverlayPage, sortPages } from '../../utils/pageLabel';
import './PageManager.css';

export const PageManager: React.FC = () => {
  const { pages, currentPageId, setCurrentPage, addPage, addOverlayPage, deletePage } = useEditorStore();
  const hasOverlayPage = pages.some(isOverlayPage);

  return (
    <div className="page-tabs">
      {sortPages(pages).map(page => (
        <div
          key={page.id}
          className={`page-tab ${page.id === currentPageId ? 'active' : ''} ${isOverlayPage(page) ? 'page-tab-overlay' : ''}`}
          onClick={() => setCurrentPage(page.id)}
          title={`${getPageLabel(page)} — ${page.widgets.length} widget${page.widgets.length !== 1 ? 's' : ''}`}
        >
          <span className="page-tab-label">
            {getPageLabel(page)}
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
      {!hasOverlayPage && (
        <button className="page-tab-add page-tab-add-overlay" onClick={addOverlayPage} title="Add overlay page (Page 0) — shown on top of every page">
          +0
        </button>
      )}
    </div>
  );
};
