import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { useEditorStore } from './store/useEditorStore';
import { useSelectionStore } from './store/useSelectionStore';
import { useHistoryStore } from './store/useHistoryStore';

if (process.env.NODE_ENV !== 'production') {
  // Expose stores on window for console inspection during development:
  //   window.__editor.getState()
  //   window.__selection.getState()
  //   window.__history.getState()
  (window as any).__editor = useEditorStore;
  (window as any).__selection = useSelectionStore;
  (window as any).__history = useHistoryStore;
}

console.log('Webview script loaded');

const container = document.getElementById('root');
if (container) {
  console.log('Root element found, rendering app...');
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
}
