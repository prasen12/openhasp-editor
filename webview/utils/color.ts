function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Applies an LVGL-style 0-255 `bg_opa` value to a hex color, falling back when color/opacity are unset. */
export function colorWithOpacity(color: string | undefined, opa: number | undefined, fallback: string): string {
  const source = color || fallback;
  const alpha = (opa ?? 255) / 255;
  if (alpha >= 1) return source;
  const rgb = hexToRgb(source);
  if (!rgb) return source;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
