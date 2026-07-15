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

const TOGGLE_DOMAINS = ['light', 'switch', 'input_boolean', 'fan'];

function widgetKind(widgetType: string): 'toggle' | 'range' | 'option' | 'display' | undefined {
  if (TOGGLE_WIDGETS.has(widgetType)) return 'toggle';
  if (RANGE_WIDGETS.has(widgetType)) return 'range';
  if (OPTION_WIDGETS.has(widgetType)) return 'option';
  if (DISPLAY_WIDGETS.has(widgetType)) return 'display';
  return undefined;
}

/** Which widget property a displayed value defaults to: 'val' (numeric/state-ish) or 'text'. */
export function defaultDisplayProperty(widgetType: string, entityId: string): 'val' | 'text' {
  const domain = entityId.split('.')[0];
  const kind = widgetKind(widgetType);
  if (kind === 'option') return 'text';
  if (kind === 'display') return widgetType === 'label' ? 'text' : 'val';
  if (kind === 'toggle') return TOGGLE_DOMAINS.includes(domain) ? 'val' : 'text';
  return 'val';
}

export function resolveDisplayProperty(widgetType: string, entityId: string, override?: 'val' | 'text'): 'val' | 'text' {
  return override ?? defaultDisplayProperty(widgetType, entityId);
}

/** Auto-derived Jinja expression (no braces, no property-key wrapper) for showing entityId's state. */
export function getAutoStateTemplate(widgetType: string, entityId: string, property: 'val' | 'text'): string {
  const domain = entityId.split('.')[0];

  if (property === 'text') return `states("${entityId}")`;

  if (widgetKind(widgetType) === 'toggle' && TOGGLE_DOMAINS.includes(domain)) {
    return `1 if is_state("${entityId}", "on") else 0`;
  }
  if (widgetKind(widgetType) === 'range') {
    if (domain === 'light') return `((state_attr("${entityId}", "brightness") | default(0)) * 100 // 255)`;
    if (domain === 'fan') return `state_attr("${entityId}", "percentage") | default(0) | int`;
    if (domain === 'cover') return `state_attr("${entityId}", "current_position") | default(0) | int`;
    if (domain === 'number' || domain === 'input_number') return `states("${entityId}") | float(0)`;
  }
  // Generic numeric fallback — e.g. a sensor reading shown as a bar/gauge/led value.
  return `states("${entityId}") | float(0)`;
}
