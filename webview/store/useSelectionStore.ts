import { create } from 'zustand';

interface SelectionState {
  selectedWidgetIds: number[];
  hoveredWidgetId: number | null;

  selectWidget: (id: number, multiSelect?: boolean) => void;
  selectMultiple: (ids: number[]) => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;
  setHovered: (id: number | null) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedWidgetIds: [],
  hoveredWidgetId: null,

  selectWidget: (id: number, multiSelect = false) => {
    if (multiSelect) {
      const current = get().selectedWidgetIds;
      if (current.includes(id)) {
        // Deselect if already selected
        set({ selectedWidgetIds: current.filter(wid => wid !== id) });
      } else {
        // Add to selection
        set({ selectedWidgetIds: [...current, id] });
      }
    } else {
      // Single selection
      set({ selectedWidgetIds: [id] });
    }
  },

  selectMultiple: (ids: number[]) => {
    set({ selectedWidgetIds: ids });
  },

  clearSelection: () => {
    set({ selectedWidgetIds: [] });
  },

  isSelected: (id: number) => {
    return get().selectedWidgetIds.includes(id);
  },

  setHovered: (id: number | null) => {
    set({ hoveredWidgetId: id });
  }
}));
