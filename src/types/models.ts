export type WidgetType =
  | 'screen' | 'obj' | 'container' | 'cont' | 'window' | 'msgbox' | 'tileview' | 'tabview' | 'tab'
  | 'btn' | 'button' | 'btnmatrix' | 'imgbtn' | 'checkbox' | 'switch' | 'slider'
  | 'textarea' | 'spinbox' | 'cpicker' | 'keyboard'
  | 'label' | 'gauge' | 'bar' | 'linemeter' | 'led' | 'arc' | 'spinner' | 'chart' | 'datetime'
  | 'dropdown' | 'roller' | 'list' | 'table' | 'calendar' | 'menu'
  | 'line' | 'img' | 'animimage' | 'canvas' | 'mask' | 'qrcode'
  | 'alarm' | 'page' | 'span';

export interface Widget {
  // Core identifiers
  id: number;
  obj: WidgetType;
  page?: number;

  // Metadata (editor-only, not rendered by openHASP)
  name?: string;
  description?: string;

  // Layout properties
  x?: number;
  y?: number;
  w?: number;
  h?: number;

  // Hierarchy
  parentid?: number;
  groupid?: number;

  // Common styling
  bg_color?: string;
  bg_opa?: number;
  bg_grad_color?: string;
  bg_grad_dir?: number;
  bg_grad_stop?: number;
  bg_main_stop?: number;
  border_width?: number;
  border_color?: string;
  border_opa?: number;
  border_side?: number;
  radius?: number;
  hidden?: boolean;
  opacity?: number;

  // Text styling
  text?: string;
  text_color?: string;
  text_font?: number;
  text_opa?: number;
  text_letter_space?: number;
  text_line_space?: number;
  text_decor?: number;
  align?: string;

  // Shadow
  shadow_color?: string;
  shadow_opa?: number;
  shadow_width?: number;
  shadow_ofs_x?: number;
  shadow_ofs_y?: number;
  shadow_spread?: number;

  // Outline
  outline_color?: string;
  outline_opa?: number;
  outline_width?: number;
  outline_pad?: number;

  // Padding
  pad_top?: number;
  pad_right?: number;
  pad_bottom?: number;
  pad_left?: number;

  // Image
  image_opa?: number;
  image_recolor?: string;
  image_recolor_opa?: number;

  // Widget-specific properties (dynamic)
  [key: string]: any;
}

export interface Page {
  id: number;
  name?: string;
  comment?: string;
  widgets: Widget[];
}

export interface DeviceProperties {
  width: number;
  height: number;
  deviceName: string;
  description?: string;
  fontOverrideFile?: string;
  fontName?: string;
}

export interface HaspDocument {
  deviceProperties: DeviceProperties;
  layout: Page[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  widgets: Widget[];
}

export type ToWebviewMessage =
  | { type: 'init'; pages: Page[]; fileName: string; canvasWidth: number; canvasHeight: number; deviceProperties?: DeviceProperties; fontOverrideUri?: string; imageUris?: Record<string, string> }
  | { type: 'documentChanged'; pages: Page[]; deviceProperties?: DeviceProperties; fontOverrideUri?: string; imageUris?: Record<string, string> }
  | { type: 'navigateTo'; pageId: number; widgetId?: number };

export type ToExtensionMessage =
  | { type: 'update'; pages: Page[]; deviceProperties?: DeviceProperties }
  | { type: 'export'; pages: Page[]; format: 'jsonl' | 'json' }
  | { type: 'ready' };
