import { Widget } from '../types';

/**
 * Translates openHASP/LVGL BMP PUA codepoints back to the MDI supplementary
 * codepoints that materialdesignicons-webfont.ttf actually stores glyphs at.
 *
 * openHASP compiles icon fonts with lv_font_conv using a codepoint shift:
 *   U+F0XXX (MDI native, supplementary) → U+EXXX  (LVGL BMP PUA, stored in JSONL)
 *   U+F1XXX (MDI native, supplementary) → U+FXXX  (LVGL BMP PUA, stored in JSONL)
 *
 * Reverse formulas:
 *   U+E000–EFFF → U+F0000 + (cp − 0xE000)
 *   U+F000–F8FF → U+F1000 + (cp − 0xF000)
 */
export function translateLVGLToMDI(text: unknown): string {
  return [...String(text ?? '')].map(char => {
    const cp = char.codePointAt(0)!;
    if (cp >= 0xE000 && cp <= 0xEFFF) {
      return String.fromCodePoint(0xF0000 + (cp - 0xE000));
    }
    if (cp >= 0xF000 && cp <= 0xF8FF) {
      return String.fromCodePoint(0xF1000 + (cp - 0xF000));
    }
    return char;
  }).join('');
}

/**
 * Converts literal unicode escape sequences (e.g. the 6-character string \uF001)
 * to their actual Unicode characters. This handles JSONL text values that were
 * double-escaped (stored as \\uXXXX) or manually entered as escape notation.
 * Also logs the codepoints of any BMP PUA characters to the console so you can
 * open DevTools (Help → Toggle Developer Tools) to see exactly which glyphs are needed.
 */
export function decodeUnicodeEscapes(text: unknown): string {
  const decoded = String(text ?? '').replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Log all non-ASCII codepoints so we can identify which icon font/range is needed.
  // Open DevTools: Help → Toggle Developer Tools → Console tab.
  const nonAscii = [...decoded].filter(c => c.charCodeAt(0) > 0x7F);
  if (nonAscii.length > 0) {
    const points = nonAscii.map(c => {
      const cp = c.charCodeAt(0);
      const range = cp >= 0xE000 && cp <= 0xF8FF ? 'BMP-PUA'
                  : cp >= 0xD800 && cp <= 0xDFFF ? 'surrogate'
                  : cp > 0xFFFF                   ? 'supplementary'
                  : 'other-unicode';
      return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}(${range})`;
    });
    console.log(`[openHASP] non-ASCII in text "${text}":`, points.join(', '));
  }

  return decoded;
}

export function getWidgetAbsoluteRect(
  widgetId: number,
  widgets: Widget[]
): { x: number; y: number; w: number; h: number } | null {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return null;

  const x = widget.x ?? 0;
  const y = widget.y ?? 0;
  const w = widget.w ?? 100;
  const h = widget.h ?? 30;

  if (!widget.parentid) return { x, y, w, h };

  const parentRect = getWidgetAbsoluteRect(widget.parentid, widgets);
  if (!parentRect) return { x, y, w, h };

  return { x: parentRect.x + x, y: parentRect.y + y, w, h };
}

export function findWidgetAtPoint(
  x: number,
  y: number,
  widgets: Widget[],
  excludeId?: number
): Widget | null {
  const candidates = widgets.filter(w => {
    if (w.id === excludeId) return false;
    const rect = getWidgetAbsoluteRect(w.id, widgets);
    if (!rect) return false;
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
  });

  if (candidates.length === 0) return null;

  // Return the smallest-area widget (most specific / deepest in hierarchy)
  candidates.sort((a, b) => (a.w ?? 100) * (a.h ?? 30) - (b.w ?? 100) * (b.h ?? 30));
  return candidates[0];
}

export function isDescendant(widgetId: number, ancestorId: number, widgets: Widget[]): boolean {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget?.parentid) return false;
  if (widget.parentid === ancestorId) return true;
  return isDescendant(widget.parentid, ancestorId, widgets);
}

export function getRootWidgets(widgets: Widget[]): Widget[] {
  return widgets.filter(w => !w.parentid);
}

export function getChildWidgets(parentId: number, widgets: Widget[]): Widget[] {
  return widgets.filter(w => w.parentid === parentId);
}
