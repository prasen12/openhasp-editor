export type WidgetType =
  | 'screen' | 'obj' | 'container' | 'cont' | 'window' | 'msgbox' | 'tileview' | 'tabview' | 'tab'
  | 'btn' | 'button' | 'btnmatrix' | 'imgbtn' | 'checkbox' | 'switch' | 'slider'
  | 'textarea' | 'spinbox' | 'cpicker' | 'keyboard'
  | 'label' | 'gauge' | 'bar' | 'linemeter' | 'led' | 'arc' | 'spinner' | 'chart' | 'datetime'
  | 'dropdown' | 'roller' | 'list' | 'table' | 'calendar' | 'menu'
  | 'line' | 'image' | 'img' | 'animimage' | 'canvas' | 'mask' | 'qrcode'
  | 'alarm' | 'page' | 'span';

export interface Widget {
  id: number;
  obj: WidgetType;
  page?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  parentid?: number;
  groupid?: number;
  bg_color?: string;
  bg_opa?: number;
  border_width?: number;
  border_color?: string;
  border_opa?: number;
  radius?: number;
  hidden?: boolean;
  opacity?: number;
  text?: string;
  text_color?: string;
  text_font?: number;
  align?: string;
  justify?:string;
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
  fontOverrideFile?: string;
  fontName?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  widgets: Widget[];
}
