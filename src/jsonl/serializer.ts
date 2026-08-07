import { Page, Widget } from '../types/models';
import { optionsTextToArray } from './optionsFormat';

/**
 * Order a page's widgets so every parent is emitted before its children. openHASP creates
 * objects in file order and a child references its parent via `parentid`, so the parent object
 * must already exist when the child line is processed — a plain sort by id would break the
 * hierarchy whenever a child happens to have a lower id than its parent. Siblings keep their
 * id order; a widget whose parentid doesn't resolve on the page is treated as a root.
 */
function orderWidgetsByHierarchy(widgets: Widget[]): Widget[] {
  const ids = new Set(widgets.map(w => w.id));
  const childrenOf = new Map<number | undefined, Widget[]>();

  for (const widget of widgets) {
    const parentId = widget.parentid && ids.has(widget.parentid) ? widget.parentid : undefined;
    const siblings = childrenOf.get(parentId) ?? [];
    siblings.push(widget);
    childrenOf.set(parentId, siblings);
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => a.id - b.id);
  }

  const ordered: Widget[] = [];
  const visited = new Set<number>();
  const emit = (parentId: number | undefined) => {
    for (const widget of childrenOf.get(parentId) ?? []) {
      if (visited.has(widget.id)) continue; // guard against parentid cycles
      visited.add(widget.id);
      ordered.push(widget);
      emit(widget.id);
    }
  };
  emit(undefined);

  // Safety net: if a cycle left anything unvisited, append it rather than drop it.
  for (const widget of widgets) {
    if (!visited.has(widget.id)) {
      visited.add(widget.id);
      ordered.push(widget);
    }
  }

  return ordered;
}

export class JsonlSerializer {
  static serialize(pages: Page[]): string {
    const lines: string[] = [];

    for (const page of [...pages].sort((a, b) => a.id - b.id)) {
      // Add page header with comment
      if (page.comment) {
        lines.push(JSON.stringify({ page: page.id, comment: page.comment }));
      } else {
        lines.push(JSON.stringify({ page: page.id }));
      }

      // Emit widgets parent-before-child so the device can resolve every parentid.
      for (const widget of orderWidgetsByHierarchy(page.widgets)) {
        const { page: _page, description, name: _name, haBinding: _haBinding, ...rest } = widget as any;
        const obj: any = { ...rest };

        // Map editor description to JSONL comment
        if (description) {
          obj.comment = description;
        }

        if ((obj.obj === 'btnmatrix' || obj.obj === 'msgbox') && typeof obj.options === 'string') {
          obj.options = optionsTextToArray(obj.options, obj.obj);
        }

        // Remove undefined, null, and empty string properties
        Object.keys(obj).forEach(key => {
          if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
            delete obj[key];
          }
        });

        lines.push(escapePUA(JSON.stringify(obj)));
      }

      // Add blank line between pages (except after last page)
      if (page !== pages[pages.length - 1]) {
        lines.push('');
      }
    }

    return lines.join('\n') + '\n';
  }

  static serializeWidget(widget: Widget): string {
    const { page: _page, description, name: _name, haBinding: _haBinding, ...rest } = widget as any;
    const obj: any = { ...rest };

    // Map editor description to JSONL comment
    if (description) {
      obj.comment = description;
    }

    if ((obj.obj === 'btnmatrix' || obj.obj === 'msgbox') && typeof obj.options === 'string') {
      obj.options = optionsTextToArray(obj.options, obj.obj);
    }

    // Remove undefined, null, and empty string properties
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
        delete obj[key];
      }
    });

    return escapePUA(JSON.stringify(obj));
  }
}

/**
 * JSON.stringify outputs BMP PUA characters (U+E000–U+F8FF) as raw UTF-8 bytes.
 * openHASP tools expect them as \uXXXX escape sequences. This function converts
 * any raw PUA characters in a JSON string back to their \uXXXX form.
 */
function escapePUA(json: string): string {
  return json.replace(/[\uE000-\uF8FF]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`
  );
}
