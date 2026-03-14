import { create } from 'zustand';
import { Page, Widget, DeviceProperties } from '../types';

interface EditorState {
  pages: Page[];
  currentPageId: number;
  fileName: string;
  isDirty: boolean;
  canvasWidth: number;
  canvasHeight: number;
  deviceProperties: DeviceProperties | null;
  fontOverrideUri: string;

  setPages: (pages: Page[]) => void;
  setFileName: (fileName: string) => void;
  setCurrentPage: (pageId: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setDeviceProperties: (props: DeviceProperties) => void;
  setFontOverrideUri: (uri: string) => void;

  addPage: () => void;
  deletePage: (pageId: number) => void;
  updatePage: (pageId: number, updates: Partial<Page>) => void;

  addWidget: (pageId: number, widget: Widget) => void;
  updateWidget: (pageId: number, widgetId: number, updates: Partial<Widget>) => void;
  deleteWidget: (pageId: number, widgetId: number) => void;
  deleteWidgets: (pageId: number, widgetIds: number[]) => void;

  markDirty: () => void;
  markClean: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pages: [],
  currentPageId: 1,
  fileName: '',
  isDirty: false,
  canvasWidth: 720,
  canvasHeight: 480,
  deviceProperties: null,
  fontOverrideUri: '',

  setPages: (pages: Page[]) => {
    set({ pages, isDirty: false });
    const currentPageId = get().currentPageId;
    if (!pages.find(p => p.id === currentPageId) && pages.length > 0) {
      set({ currentPageId: pages[0].id });
    }
  },

  setFileName: (fileName: string) => set({ fileName }),

  setCanvasSize: (width: number, height: number) => set({ canvasWidth: width, canvasHeight: height }),

  setCurrentPage: (pageId: number) => set({ currentPageId: pageId }),

  setDeviceProperties: (props: DeviceProperties) => set({ deviceProperties: props, isDirty: true }),

  setFontOverrideUri: (uri: string) => set({ fontOverrideUri: uri }),

  addPage: () => {
    const pages = get().pages;
    const maxId = pages.length > 0 ? Math.max(...pages.map(p => p.id)) : 0;
    const newPage: Page = {
      id: maxId + 1,
      widgets: [],
      comment: `Page ${maxId + 1}`
    };
    set({ pages: [...pages, newPage], currentPageId: newPage.id, isDirty: true });
  },

  deletePage: (pageId: number) => {
    const pages = get().pages.filter(p => p.id !== pageId);
    const newState: any = { pages, isDirty: true };
    if (get().currentPageId === pageId && pages.length > 0) {
      newState.currentPageId = pages[0].id;
    }
    set(newState);
  },

  updatePage: (pageId: number, updates: Partial<Page>) => {
    set({
      pages: get().pages.map(p =>
        p.id === pageId ? { ...p, ...updates } : p
      ),
      isDirty: true
    });
  },

  addWidget: (pageId: number, widget: Widget) => {
    set({
      pages: get().pages.map(page =>
        page.id === pageId
          ? { ...page, widgets: [...page.widgets, widget] }
          : page
      ),
      isDirty: true
    });
  },

  updateWidget: (pageId: number, widgetId: number, updates: Partial<Widget>) => {
    set({
      pages: get().pages.map(page =>
        page.id === pageId
          ? {
              ...page,
              widgets: page.widgets.map(w =>
                w.id === widgetId ? { ...w, ...updates } : w
              )
            }
          : page
      ),
      isDirty: true
    });
  },

  deleteWidget: (pageId: number, widgetId: number) => {
    set({
      pages: get().pages.map(page =>
        page.id === pageId
          ? { ...page, widgets: page.widgets.filter(w => w.id !== widgetId) }
          : page
      ),
      isDirty: true
    });
  },

  deleteWidgets: (pageId: number, widgetIds: number[]) => {
    set({
      pages: get().pages.map(page =>
        page.id === pageId
          ? { ...page, widgets: page.widgets.filter(w => !widgetIds.includes(w.id)) }
          : page
      ),
      isDirty: true
    });
  },

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false })
}));
