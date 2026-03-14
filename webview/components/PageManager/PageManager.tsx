import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import './PageManager.css';

export const PageManager: React.FC = () => {
  const { pages, currentPageId, setCurrentPage, addPage } = useEditorStore();

  return (
    <div className="page-manager">
      <div className="page-manager-header">
        <h3>Pages</h3>
        <button className="add-page-button" onClick={addPage} title="Add new page">
          +
        </button>
      </div>

      <div className="page-list">
        {pages.map(page => (
          <div
            key={page.id}
            className={`page-item ${page.id === currentPageId ? 'active' : ''}`}
            onClick={() => setCurrentPage(page.id)}
          >
            <div className="page-icon">📄</div>
            <div className="page-info">
              <div className="page-name">
                {page.comment || page.name || `Page ${page.id}`}
              </div>
              <div className="page-meta">
                {page.widgets.length} widget{page.widgets.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}

        {pages.length === 0 && (
          <div className="page-list-empty">
            <p>No pages yet</p>
            <button onClick={addPage}>Create First Page</button>
          </div>
        )}
      </div>
    </div>
  );
};
