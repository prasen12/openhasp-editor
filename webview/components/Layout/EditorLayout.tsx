import React from 'react';
import './EditorLayout.css';

interface EditorLayoutProps {
  leftPanel: React.ReactNode;
  canvas: React.ReactNode;
  rightPanel: React.ReactNode;
  topBar?: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  leftPanel,
  canvas,
  rightPanel,
  topBar,
  bottomBar
}) => {
  return (
    <div className="editor-layout">
      {topBar && <div className="editor-topbar">{topBar}</div>}

      <div className="editor-main">
        <div className="editor-left-panel">{leftPanel}</div>
        <div className="editor-canvas-area">{canvas}</div>
        <div className="editor-right-panel">{rightPanel}</div>
      </div>

      {bottomBar && <div className="editor-bottombar">{bottomBar}</div>}
    </div>
  );
};
