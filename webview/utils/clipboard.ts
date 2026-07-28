import { Widget } from '../types';
import { getChildWidgets } from './widgetHierarchy';

/**
 * Given a set of widget ids, returns those widgets plus all of their
 * descendants (so copying a container also copies its children).
 */
export function collectWithDescendants(ids: number[], widgets: Widget[]): Widget[] {
  const result: Widget[] = [];
  const seen = new Set<number>();

  const addSubtree = (widget: Widget) => {
    if (seen.has(widget.id)) return;
    seen.add(widget.id);
    result.push(widget);
    for (const child of getChildWidgets(widget.id, widgets)) {
      addSubtree(child);
    }
  };

  for (const id of ids) {
    const widget = widgets.find(w => w.id === id);
    if (widget) addSubtree(widget);
  }

  return result;
}

/**
 * Clones copied widgets for insertion into a (possibly different) page:
 * assigns fresh unique ids (unique against destinationWidgets and each other),
 * remaps parentid within the copied set, and drops+offsets parentid for
 * widgets whose parent wasn't part of the copy (so they paste as roots
 * instead of silently vanishing under an unrelated parent).
 */
export function cloneWidgetsForPaste(
  sourceWidgets: Widget[],
  destinationWidgets: Widget[],
  pageId: number,
  offset: number
): Widget[] {
  const copiedIds = new Set(sourceWidgets.map(w => w.id));
  let nextId = destinationWidgets.length > 0 ? Math.max(...destinationWidgets.map(w => w.id)) + 1 : 1;

  const idMap = new Map<number, number>();
  for (const widget of sourceWidgets) {
    idMap.set(widget.id, nextId++);
  }

  return sourceWidgets.map(widget => {
    const clone: Widget = JSON.parse(JSON.stringify(widget));
    clone.id = idMap.get(widget.id)!;
    clone.page = pageId;

    const parentCopied = widget.parentid !== undefined && copiedIds.has(widget.parentid);
    if (parentCopied) {
      clone.parentid = idMap.get(widget.parentid!);
    } else {
      delete clone.parentid;
      clone.x = (widget.x ?? 0) + offset;
      clone.y = (widget.y ?? 0) + offset;
    }

    return clone;
  });
}
