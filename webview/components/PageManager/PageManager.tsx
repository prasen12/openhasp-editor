import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { getPageLabel, isOverlayPage, sortPages } from '../../utils/pageLabel';
import { Page } from '../../types';
import './PageManager.css';

export const PageManager: React.FC = () => {
  const { pages, currentPageId, setCurrentPage, addPage, addOverlayPage, deletePage } = useEditorStore();
  const hasOverlayPage = pages.some(isOverlayPage);
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null);

  const requestDelete = (page: Page) => {
    // Deleting an empty page is harmless — only confirm when widgets would be lost.
    if (page.widgets.length === 0) deletePage(page.id);
    else setPendingDelete(page);
  };

  const confirmDelete = () => {
    if (pendingDelete) deletePage(pendingDelete.id);
    setPendingDelete(null);
  };

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
              onClick={e => { e.stopPropagation(); requestDelete(page); }}
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

      {pendingDelete && (
        <div className="page-delete-overlay" onClick={() => setPendingDelete(null)}>
          <div className="page-delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="page-delete-title">Delete {getPageLabel(pendingDelete)}?</h3>
            <p className="page-delete-message">
              This page has {pendingDelete.widgets.length} widget{pendingDelete.widgets.length !== 1 ? 's' : ''} that
              will be removed with it.
            </p>
            <div className="page-delete-actions">
              <button className="page-delete-btn" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="page-delete-btn page-delete-btn-danger" onClick={confirmDelete} autoFocus>
                Delete page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
