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
  name?: string;
  description?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  parentid?: number;
  groupid?: number;
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
  text?: string;
  text_color?: string;
  text_font?: number;
  text_opa?: number;
  text_letter_space?: number;
  text_line_space?: number;
  text_decor?: number;
  align?: string;
  justify?:string;
  shadow_color?: string;
  shadow_opa?: number;
  shadow_width?: number;
  shadow_ofs_x?: number;
  shadow_ofs_y?: number;
  shadow_spread?: number;
  outline_color?: string;
  outline_opa?: number;
  outline_width?: number;
  outline_pad?: number;
  pad_top?: number;
  pad_right?: number;
  pad_bottom?: number;
  pad_left?: number;
  image_opa?: number;
  image_recolor?: string;
  image_recolor_opa?: number;
  haBinding?: HaBinding;
  [key: string]: any;
}

/**
 * How a widget is wired to Home Assistant. Stored only in the .hasp.json design file.
 * Display and action are independent: a widget can show one entity's state while its
 * action (if any) targets a different entity, or is a local openHASP page-navigation
 * command that doesn't involve Home Assistant at all.
 */
export interface HaBinding {
  displayEntityId?: string;
  displayProperty?: 'val' | 'text';
  stateTemplate?: 'auto' | string;
  displayTemplate?: string;
  actionEntityId?: string;
  action?: HaAction;
}

export type HaAction =
  | { kind: 'none' }
  | { kind: 'service'; trigger: string; service: string; dataLines?: string[] }
  | { kind: 'page'; trigger: string; target: 'next' | 'prev' | 'back' | number };

export interface HaEntity {
  entityId: string;
  domain: string;
  state: string;
  friendlyName?: string;
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

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  widgets: Widget[];
}
