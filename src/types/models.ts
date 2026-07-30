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

  // Home Assistant binding (editor-only, not rendered by openHASP — see haBinding.ts)
  haBinding?: HaBinding;

  // Widget-specific properties (dynamic)
  [key: string]: any;
}

/**
 * How a widget is wired to Home Assistant. Stored only in the .hasp.json design file.
 * Display and action are independent: a widget can show one entity's state while its
 * action (if any) targets a different entity, or is a local openHASP page-navigation
 * command that doesn't involve Home Assistant at all.
 */
export interface HaBinding {
  /** Entity whose state is reflected on the widget (any domain). Omit for action-only bindings. */
  displayEntityId?: string;
  /** Which widget property the display value is written to. Defaults to a sensible choice per widget type. */
  displayProperty?: 'val' | 'text';
  /** 'auto' derives the state template from haBindingDefaults; a string is a raw Jinja override (no braces). */
  stateTemplate?: 'auto' | string;
  /** Free-form Jinja template used as the display value, independent of any single entity.
   *  When set, it takes precedence over displayEntityId/stateTemplate for the display property.
   *  May be a bare expression (wrapped in {{ }}) or a full template with its own {{ }}/{% %} blocks. */
  displayTemplate?: string;
  /** Arbitrary widget property → Jinja template. Lets any property (not just the display value)
   *  be driven by a template. Each value may be bare or a full {{ }}/{% %} template. */
  propertyTemplates?: Record<string, string>;
  /** Entity the action targets when action.kind is 'service'. Not used for 'page' actions. */
  actionEntityId?: string;
  action?: HaAction;
}

export type HaAction =
  | { kind: 'none' }
  /** Calls an HA service on actionEntityId when the openHASP event named `trigger` fires. */
  | { kind: 'service'; trigger: string; service: string; dataLines?: string[] }
  /** Local openHASP page navigation via MQTT — no Home Assistant entity involved. */
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
  | { type: 'navigateTo'; pageId: number; widgetId?: number }
  | { type: 'haEntities'; entities: HaEntity[] }
  | { type: 'haEntitiesError'; message: string }
  | { type: 'haTemplateResult'; requestId: string; ok: boolean; rendered?: string; error?: string }
  | { type: 'haWidgetValues'; requestId: string; values: Record<string, Record<string, string>>; error?: string };

/** A widget whose Home Assistant templates should be rendered for the live canvas preview. */
export interface HaWidgetEvalRequest {
  /** Stable key identifying the widget instance (e.g. "<pageId>:<widgetId>"). */
  key: string;
  obj: string;
  haBinding: HaBinding;
}

export type ToExtensionMessage =
  | { type: 'update'; pages: Page[]; deviceProperties?: DeviceProperties }
  | { type: 'export'; pages: Page[]; format: 'jsonl' | 'json' }
  | { type: 'ready' }
  | { type: 'haRequestEntities' }
  | { type: 'haValidateTemplate'; requestId: string; template: string }
  | { type: 'haEvaluateWidgets'; requestId: string; widgets: HaWidgetEvalRequest[] };
