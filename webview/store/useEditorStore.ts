import { create } from 'zustand';
import { Page, Widget, DeviceProperties, HaEntity } from '../types';

interface EditorState {
  pages: Page[];
  currentPageId: number;
  fileName: string;
  isDirty: boolean;
  canvasWidth: number;
  canvasHeight: number;
  deviceProperties: DeviceProperties | null;
  fontOverrideUri: string;
  imageUris: Record<string, string>;
  haEntities: HaEntity[];
  haEntitiesError: string | null;
  haEntitiesLoading: boolean;
  /** Live canvas preview of Home Assistant values: on/off, resolved values, and last error. */
  haPreviewEnabled: boolean;
  haWidgetValues: Record<string, Record<string, string>>;
  haValuesError: string | null;
  haValuesLoading: boolean;

  setPages: (pages: Page[]) => void;
  setFileName: (fileName: string) => void;
  setCurrentPage: (pageId: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setDeviceProperties: (props: DeviceProperties) => void;
  setFontOverrideUri: (uri: string) => void;
  setImageUris: (uris: Record<string, string>) => void;
  setHaEntities: (entities: HaEntity[]) => void;
  setHaEntitiesError: (message: string) => void;
  setHaEntitiesLoading: (loading: boolean) => void;
  setHaPreviewEnabled: (enabled: boolean) => void;
  setHaWidgetValues: (values: Record<string, Record<string, string>>) => void;
  setHaValuesError: (message: string | null) => void;
  setHaValuesLoading: (loading: boolean) => void;

  addPage: () => void;
  addOverlayPage: () => void;
  deletePage: (pageId: number) => void;
  updatePage: (pageId: number, updates: Partial<Page>) => void;

  addWidget: (pageId: number, widget: Widget) => void;
  addWidgets: (pageId: number, widgets: Widget[]) => void;
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
  imageUris: {},
  haEntities: [],
  haEntitiesError: null,
  haEntitiesLoading: false,
  haPreviewEnabled: false,
  haWidgetValues: {},
  haValuesError: null,
  haValuesLoading: false,

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

  setImageUris: (uris: Record<string, string>) => set({ imageUris: uris }),

  setHaEntities: (entities: HaEntity[]) => set({ haEntities: entities, haEntitiesError: null, haEntitiesLoading: false }),

  setHaEntitiesError: (message: string) => set({ haEntitiesError: message, haEntitiesLoading: false }),

  setHaEntitiesLoading: (loading: boolean) => set({ haEntitiesLoading: loading }),

  setHaPreviewEnabled: (enabled: boolean) => set({ haPreviewEnabled: enabled }),

  setHaWidgetValues: (values: Record<string, Record<string, string>>) =>
    set({ haWidgetValues: values, haValuesLoading: false }),

  setHaValuesError: (message: string | null) => set({ haValuesError: message, haValuesLoading: false }),

  setHaValuesLoading: (loading: boolean) => set({ haValuesLoading: loading }),

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

  addOverlayPage: () => {
    const pages = get().pages;
    if (pages.some(p => p.id === 0)) {
      set({ currentPageId: 0 });
      return;
    }
    const newPage: Page = {
      id: 0,
      widgets: [],
      comment: 'Overlay (all pages)'
    };
    set({ pages: [...pages, newPage], currentPageId: 0, isDirty: true });
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

  addWidgets: (pageId: number, widgets: Widget[]) => {
    set({
      pages: get().pages.map(page =>
        page.id === pageId
          ? { ...page, widgets: [...page.widgets, ...widgets] }
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
