import React from 'react';
import { Widget } from '../types';
import { colorWithOpacity } from './color';

/**
 * Common LVGL/openHASP "MAIN part" box styling (border, shadow, outline) applied
 * uniformly to every widget's canvas wrapper, regardless of type. Background color
 * stays widget-renderer-owned since several widgets (switch, slider, bar) reuse
 * `bg_color` for an indicator fill rather than the object's own background.
 */
export function getBoxStyle(widget: Widget): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (widget.radius !== undefined) {
    style.borderRadius = widget.radius;
  }

  const borderWidth = widget.border_width ?? 0;
  if (borderWidth > 0) {
    const borderColor = colorWithOpacity(widget.border_color, widget.border_opa, '#000000');
    const edge = `${borderWidth}px solid ${borderColor}`;
    // border_side bitmask: 0=none, 1=bottom, 2=top, 4=left, 8=right, 15=full (default).
    const sides = widget.border_side;
    if (sides === undefined || (sides & 15) === 15) {
      style.border = edge;
    } else {
      if (sides & 2) style.borderTop = edge;
      if (sides & 1) style.borderBottom = edge;
      if (sides & 4) style.borderLeft = edge;
      if (sides & 8) style.borderRight = edge;
    }
  }

  if (widget.shadow_width) {
    const ofsX = widget.shadow_ofs_x ?? 0;
    const ofsY = widget.shadow_ofs_y ?? 0;
    const spread = widget.shadow_spread ?? 0;
    const color = colorWithOpacity(widget.shadow_color, widget.shadow_opa, '#000000');
    style.boxShadow = `${ofsX}px ${ofsY}px ${widget.shadow_width}px ${spread}px ${color}`;
  }

  if (widget.outline_width) {
    style.outline = `${widget.outline_width}px solid ${colorWithOpacity(widget.outline_color, widget.outline_opa, '#000000')}`;
    style.outlineOffset = widget.outline_pad ?? 0;
  }

  return style;
}

/**
 * Background fill for widget renderers that own their own MAIN-part background
 * (GenericWidget, ButtonWidget, LabelWidget). Adds an optional linear gradient
 * (bg_grad_color/bg_grad_dir/bg_grad_stop/bg_main_stop) on top of the flat bg_color/bg_opa fill.
 */
export function getBackgroundStyle(widget: Widget, fallback: string): React.CSSProperties {
  const backgroundColor = colorWithOpacity(widget.bg_color, widget.bg_opa, fallback);
  if (!widget.bg_grad_color || widget.bg_grad_dir === 0) return { backgroundColor };

  const angle = widget.bg_grad_dir === 2 ? 'to bottom' : 'to right';
  const gradColor = colorWithOpacity(widget.bg_grad_color, widget.bg_opa, widget.bg_grad_color);
  const mainStop = ((widget.bg_main_stop ?? 0) / 255) * 100;
  const gradStop = ((widget.bg_grad_stop ?? 255) / 255) * 100;

  return {
    backgroundColor,
    backgroundImage: `linear-gradient(${angle}, ${backgroundColor} ${mainStop}%, ${gradColor} ${gradStop}%)`,
  };
}

/** Inner content padding — kept off the positioning wrapper so it doesn't shift absolutely-positioned children. */
export function getPaddingStyle(widget: Widget): React.CSSProperties {
  const { pad_top, pad_right, pad_bottom, pad_left } = widget;
  if (!pad_top && !pad_right && !pad_bottom && !pad_left) return {};
  return {
    paddingTop: pad_top ?? 0,
    paddingRight: pad_right ?? 0,
    paddingBottom: pad_bottom ?? 0,
    paddingLeft: pad_left ?? 0,
    boxSizing: 'border-box',
  };
}

function textDecorationCss(decor: number | undefined): string | undefined {
  switch (decor) {
    case 1: return 'underline';
    case 2: return 'line-through';
    case 3: return 'underline line-through';
    default: return undefined;
  }
}

/** Extra text-part styling (opacity, spacing, decoration) for widgets that render their own text content. */
export function getTextStyleExtras(widget: Widget): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (widget.text_opa !== undefined) style.opacity = widget.text_opa / 255;
  if (widget.text_letter_space !== undefined) style.letterSpacing = widget.text_letter_space;
  if (widget.text_line_space !== undefined) {
    style.lineHeight = `${(widget.text_font ?? 16) + widget.text_line_space}px`;
  }
  const decoration = textDecorationCss(widget.text_decor);
  if (decoration) style.textDecoration = decoration;
  return style;
}
