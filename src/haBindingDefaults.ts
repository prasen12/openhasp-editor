/**
 * Display-side defaults for Home Assistant entity bindings, used by haConfigGenerator.ts.
 *
 * Action-side resolution (which HA service or openHASP page command a widget's event
 * triggers) is resolved once, in the webview UI, and stored concretely in HaBinding.action —
 * see webview/config/haBindingDefaults.ts for that catalog. The server only needs to fill
 * in the display state template, since that's the one field that still supports an 'auto'
 * sentinel re-derived at generation time (so changing "displayed as" val/text stays in sync).
 */

const TOGGLE_WIDGETS = new Set(['btn', 'button', 'switch', 'checkbox']);
const RANGE_WIDGETS = new Set(['slider', 'arc']);
const OPTION_WIDGETS = new Set(['dropdown', 'roller']);
const DISPLAY_WIDGETS = new Set(['label', 'led', 'bar', 'gauge', 'linemeter']);

function widgetKind(widgetType: string): 'toggle' | 'range' | 'option' | 'display' | undefined {
  if (TOGGLE_WIDGETS.has(widgetType)) return 'toggle';
  if (RANGE_WIDGETS.has(widgetType)) return 'range';
  if (OPTION_WIDGETS.has(widgetType)) return 'option';
  if (DISPLAY_WIDGETS.has(widgetType)) return 'display';
  return undefined;
}

/**
 * The action's target entities as a list. A binding holds a plain string for a single target
 * and an array for several; a comma-separated string is split, so a hand-written multi-target
 * binding generates the same config the editor's multi-select produces.
 * Mirrors actionEntityList in webview/config/haBindingDefaults.ts.
 */
export function actionEntityList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const ids = Array.isArray(value) ? value : value.split(',');
  return ids.map(id => id.trim()).filter(id => id.length > 0);
}

/** Which widget property a displayed value defaults to: 'val' (numeric/state-ish) or 'text'. */
export function defaultDisplayProperty(widgetType: string, entityId: string): 'val' | 'text' {
  const domain = entityId.split('.')[0];
  const kind = widgetKind(widgetType);
  if (kind === 'option') return 'text';
  if (kind === 'display') return widgetType === 'label' ? 'text' : 'val';
  // Any on/off-ish entity drives a toggle widget's checked flag; anything else has to be text.
  if (kind === 'toggle') return domain in ON_STATE_BY_DOMAIN ? 'val' : 'text';
  return 'val';
}

export function resolveDisplayProperty(widgetType: string, entityId: string, override?: 'val' | 'text'): 'val' | 'text' {
  return override ?? defaultDisplayProperty(widgetType, entityId);
}

/**
 * Domains whose state is a word rather than a number, with the word that means "on".
 * A `val` binding to one of these has to be compared, not converted: `states("light.x") | float(0)`
 * is 0 for "on" just as much as for "off", so the widget would read off however the entity is set.
 */
const ON_STATE_BY_DOMAIN: Record<string, string> = {
  light: 'on', switch: 'on', input_boolean: 'on', fan: 'on', binary_sensor: 'on',
  automation: 'on', script: 'on', remote: 'on', siren: 'on', humidifier: 'on',
  schedule: 'on', input_button: 'on',
  lock: 'unlocked', cover: 'open', person: 'home', device_tracker: 'home',
};

/** What `val` means "on" for this widget: a checked flag, an LED brightness, or a full meter. */
function onValue(widgetType: string): number {
  if (widgetType === 'led') return 255;
  return widgetKind(widgetType) === 'toggle' ? 1 : 100;
}

/** Auto-derived Jinja expression (no braces, no property-key wrapper) for showing entityId's state. */
export function getAutoStateTemplate(widgetType: string, entityId: string, property: 'val' | 'text'): string {
  const domain = entityId.split('.')[0];

  if (property === 'text') return `states("${entityId}")`;

  // A numeric reading the entity actually publishes always wins over an on/off reading.
  if (widgetKind(widgetType) === 'range') {
    if (domain === 'light') return `((state_attr("${entityId}", "brightness") | default(0)) * 100 // 255)`;
    if (domain === 'fan') return `state_attr("${entityId}", "percentage") | default(0) | int`;
    if (domain === 'cover') return `state_attr("${entityId}", "current_position") | default(0) | int`;
    if (domain === 'number' || domain === 'input_number') return `states("${entityId}") | float(0)`;
  }

  const onState = ON_STATE_BY_DOMAIN[domain];
  if (onState) return `${onValue(widgetType)} if is_state("${entityId}", "${onState}") else 0`;

  // Generic numeric fallback — e.g. a sensor reading shown as a bar/gauge/led value.
  return `states("${entityId}") | float(0)`;
}
