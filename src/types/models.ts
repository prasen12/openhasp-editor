export type WidgetType =
  | 'screen' | 'obj' | 'container' | 'cont' | 'window' | 'msgbox' | 'tileview' | 'tabview' | 'tab'
  | 'btn' | 'button' | 'btnmatrix' | 'imgbtn' | 'checkbox' | 'switch' | 'slider'
  | 'textarea' | 'spinbox' | 'cpicker' | 'keyboard'
  | 'label' | 'gauge' | 'bar' | 'linemeter' | 'led' | 'arc' | 'spinner' | 'chart' | 'datetime'
  | 'dropdown' | 'roller' | 'list' | 'table' | 'calendar' | 'menu'
  | 'line' | 'image' | 'img' | 'animimage' | 'canvas' | 'mask' | 'qrcode'
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
  border_width?: number;
  border_color?: string;
  border_opa?: number;
  radius?: number;
  hidden?: boolean;
  opacity?: number;

  // Text styling
  text?: string;
  text_color?: string;
  text_font?: number;
  align?: string;

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
  | { type: 'init'; pages: Page[]; fileName: string; canvasWidth: number; canvasHeight: number; deviceProperties?: DeviceProperties; fontOverrideUri?: string }
  | { type: 'documentChanged'; pages: Page[]; deviceProperties?: DeviceProperties; fontOverrideUri?: string }
  | { type: 'navigateTo'; pageId: number; widgetId?: number };

export type ToExtensionMessage =
  | { type: 'update'; pages: Page[]; deviceProperties?: DeviceProperties }
  | { type: 'export'; pages: Page[]; format: 'jsonl' | 'json' }
  | { type: 'ready' };
