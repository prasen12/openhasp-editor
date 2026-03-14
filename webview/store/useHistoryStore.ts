import { create } from 'zustand';
import { Page } from '../types';

interface HistoryState {
  past: Page[][];
  future: Page[][];
  maxHistory: number;

  pushHistory: (pages: Page[]) => void;
  undo: (currentPages: Page[]) => Page[] | null;
  redo: (currentPages: Page[]) => Page[] | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  pushHistory: (pages: Page[]) => {
    const past = get().past;
    const maxHistory = get().maxHistory;

    // Deep clone pages to avoid reference issues
    const clone = JSON.parse(JSON.stringify(pages));

    // Add to past, limit size
    const newPast = [...past, clone].slice(-maxHistory);

    set({
      past: newPast,
      future: [] // Clear future when new action is performed
    });
  },

  undo: (currentPages: Page[]) => {
    const past = get().past;
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    // Deep clone current pages for future
    const currentClone = JSON.parse(JSON.stringify(currentPages));

    set({
      past: newPast,
      future: [currentClone, ...get().future]
    });

    return previous;
  },

  redo: (currentPages: Page[]) => {
    const future = get().future;
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    // Deep clone current pages for past
    const currentClone = JSON.parse(JSON.stringify(currentPages));

    set({
      past: [...get().past, currentClone],
      future: newFuture
    });

    return next;
  },

  clear: () => {
    set({ past: [], future: [] });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}));
