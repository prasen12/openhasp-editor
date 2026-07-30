import { Widget, Page } from '../types';
import { useEditorStore } from '../store/useEditorStore';
import { vscode } from './vscodeApi';

/** Composite key uniquely identifying a widget instance across pages (matches the eval request key). */
export function widgetValueKey(pageId: number, widgetId: number): string {
  return `${pageId}:${widgetId}`;
}

/**
 * Returns a shallow copy of the widget with Home Assistant-rendered values applied over its
 * design-time props. Numeric-looking strings are coerced to numbers so numeric widgets
 * (val, opacity, …) behave; anything else (hex colors, text) is kept as a string.
 */
export function applyHaValues(widget: Widget, values?: Record<string, string>): Widget {
  if (!values || Object.keys(values).length === 0) return widget;
  const resolved: Widget = { ...widget };
  for (const [key, raw] of Object.entries(values)) {
    const num = Number(raw);
    resolved[key] = raw.trim() !== '' && !Number.isNaN(num) ? num : raw;
  }
  return resolved;
}

/** Every widget (across all pages) that has a Home Assistant binding, as evaluation requests. */
export function collectHaWidgets(pages: Page[]): Array<{ key: string; obj: string; haBinding: unknown }> {
  const out: Array<{ key: string; obj: string; haBinding: unknown }> = [];
  for (const page of pages) {
    for (const w of page.widgets) {
      if (w.haBinding) out.push({ key: widgetValueKey(page.id, w.id), obj: w.obj, haBinding: w.haBinding });
    }
  }
  return out;
}

/** Ask the extension to render every bound widget's templates against the live Home Assistant state. */
export function requestHaEvaluation(pages: Page[]): void {
  const widgets = collectHaWidgets(pages);
  const store = useEditorStore.getState();
  if (widgets.length === 0) {
    store.setHaWidgetValues({});
    return;
  }
  store.setHaValuesLoading(true);
  vscode.evaluateHaWidgets(`eval-${Date.now()}`, widgets);
}
