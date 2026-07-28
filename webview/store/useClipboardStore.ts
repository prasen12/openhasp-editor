import { create } from 'zustand';
import { Widget } from '../types';

interface ClipboardState {
  copiedWidgets: Widget[];
  pasteCount: number;

  copyWidgets: (widgets: Widget[]) => void;
  registerPaste: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  copiedWidgets: [],
  pasteCount: 0,

  copyWidgets: (widgets: Widget[]) => {
    set({ copiedWidgets: widgets, pasteCount: 0 });
  },

  registerPaste: () => {
    set({ pasteCount: get().pasteCount + 1 });
  }
}));
