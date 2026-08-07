import { HaAction } from '../types';

/**
 * Default mappings between openHASP widget types and Home Assistant entity domains,
 * plus the curated action catalog shown in the properties panel. Mirrors the display-side
 * logic in src/haBindingDefaults.ts (kept in sync manually — the webview and extension
 * host compile as separate bundles). Action resolution lives only here: the chosen action
 * is stored concretely in HaBinding.action and haConfigGenerator.ts just transcribes it.
 */

type WidgetKind = 'toggle' | 'range' | 'option' | 'display';

const TOGGLE_WIDGETS = new Set(['btn', 'button', 'switch', 'checkbox']);
const RANGE_WIDGETS = new Set(['slider', 'arc']);
const OPTION_WIDGETS = new Set(['dropdown', 'roller']);
const DISPLAY_WIDGETS = new Set(['label', 'led', 'bar', 'gauge', 'linemeter']);

const TOGGLE_DOMAINS = ['light', 'switch', 'input_boolean', 'fan'];
const TRIGGER_DOMAINS = ['scene', 'script'];
const RANGE_DOMAINS = ['light', 'fan', 'cover', 'number', 'input_number'];
const OPTION_DOMAINS = ['select', 'input_select'];

function widgetKind(widgetType: string): WidgetKind | undefined {
  if (TOGGLE_WIDGETS.has(widgetType)) return 'toggle';
  if (RANGE_WIDGETS.has(widgetType)) return 'range';
  if (OPTION_WIDGETS.has(widgetType)) return 'option';
  if (DISPLAY_WIDGETS.has(widgetType)) return 'display';
  return undefined;
}

/** Whether this widget type can show an HA entity's state at all. */
export function isHaBindable(widgetType: string): boolean {
  return widgetKind(widgetType) !== undefined;
}

/** Whether this widget type supports an action (an openHASP event doing something). */
export function supportsAction(widgetType: string): boolean {
  const kind = widgetKind(widgetType);
  return kind === 'toggle' || kind === 'range' || kind === 'option';
}

/** Entity domains that make sense for this widget type's ACTION entity picker, most-relevant first. */
export function actionDomains(widgetType: string): string[] {
  const kind = widgetKind(widgetType);
  if (kind === 'toggle') {
    return widgetType === 'btn' || widgetType === 'button'
      ? [...TOGGLE_DOMAINS, ...TRIGGER_DOMAINS]
      : TOGGLE_DOMAINS;
  }
  if (kind === 'range') return RANGE_DOMAINS;
  if (kind === 'option') return OPTION_DOMAINS;
  return [];
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

export interface ActionOption {
  id: string;
  label: string;
  trigger: string;
  service: string;
  dataLines?: string[];
}

/** Curated, per-domain HA service actions — what shows in the Action dropdown once an entity is picked. */
const DOMAIN_ACTIONS: Record<string, ActionOption[]> = {
  light: [
    { id: 'toggle', label: 'Toggle', trigger: 'up', service: 'light.toggle' },
    { id: 'turn_on', label: 'Turn on', trigger: 'up', service: 'light.turn_on' },
    { id: 'turn_off', label: 'Turn off', trigger: 'up', service: 'light.turn_off' },
    { id: 'set_brightness', label: 'Set brightness (drag)', trigger: 'changed', service: 'light.turn_on', dataLines: ['            brightness_pct: "{{ val }}"'] },
  ],
  switch: [
    { id: 'toggle', label: 'Toggle', trigger: 'up', service: 'switch.toggle' },
    { id: 'turn_on', label: 'Turn on', trigger: 'up', service: 'switch.turn_on' },
    { id: 'turn_off', label: 'Turn off', trigger: 'up', service: 'switch.turn_off' },
  ],
  input_boolean: [
    { id: 'toggle', label: 'Toggle', trigger: 'up', service: 'input_boolean.toggle' },
    { id: 'turn_on', label: 'Turn on', trigger: 'up', service: 'input_boolean.turn_on' },
    { id: 'turn_off', label: 'Turn off', trigger: 'up', service: 'input_boolean.turn_off' },
  ],
  fan: [
    { id: 'toggle', label: 'Toggle', trigger: 'up', service: 'fan.toggle' },
    { id: 'turn_on', label: 'Turn on', trigger: 'up', service: 'fan.turn_on' },
    { id: 'turn_off', label: 'Turn off', trigger: 'up', service: 'fan.turn_off' },
    { id: 'set_speed', label: 'Set speed (drag)', trigger: 'changed', service: 'fan.set_percentage', dataLines: ['            percentage: "{{ val }}"'] },
  ],
  cover: [
    { id: 'open', label: 'Open', trigger: 'up', service: 'cover.open_cover' },
    { id: 'close', label: 'Close', trigger: 'up', service: 'cover.close_cover' },
    { id: 'stop', label: 'Stop', trigger: 'up', service: 'cover.stop_cover' },
    { id: 'set_position', label: 'Set position (drag)', trigger: 'changed', service: 'cover.set_cover_position', dataLines: ['            position: "{{ val }}"'] },
  ],
  lock: [
    { id: 'lock', label: 'Lock', trigger: 'up', service: 'lock.lock' },
    { id: 'unlock', label: 'Unlock', trigger: 'up', service: 'lock.unlock' },
  ],
  scene: [{ id: 'activate', label: 'Activate scene', trigger: 'up', service: 'scene.turn_on' }],
  script: [{ id: 'run', label: 'Run script', trigger: 'up', service: 'script.turn_on' }],
  number: [{ id: 'set_value', label: 'Set value (drag)', trigger: 'changed', service: 'number.set_value', dataLines: ['            value: "{{ val }}"'] }],
  input_number: [{ id: 'set_value', label: 'Set value (drag)', trigger: 'changed', service: 'input_number.set_value', dataLines: ['            value: "{{ val }}"'] }],
  select: [{ id: 'select_option', label: 'Select option', trigger: 'changed', service: 'select.select_option', dataLines: ['            option: "{{ text }}"'] }],
  input_select: [{ id: 'select_option', label: 'Select option', trigger: 'changed', service: 'input_select.select_option', dataLines: ['            option: "{{ text }}"'] }],
};

/**
 * The action's target entities as a list. A binding holds a plain string for a single target
 * (the shape every design file used before multi-select) and an array for several; a
 * comma-separated string — the only way to name more than one target by hand before this —
 * is split so those bindings load as a proper multi-selection.
 */
export function actionEntityList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const ids = Array.isArray(value) ? value : value.split(',');
  return ids.map(id => id.trim()).filter(id => id.length > 0);
}

/** Store one target as a plain string and several as an array, so single-target files don't change shape. */
export function packActionEntities(ids: string[]): string | string[] | undefined {
  if (ids.length === 0) return undefined;
  return ids.length === 1 ? ids[0] : ids;
}

/** The domain shared by every selected entity, or undefined when the selection is mixed or empty. */
export function commonActionDomain(entityIds: string[]): string | undefined {
  if (entityIds.length === 0) return undefined;
  const [first, ...rest] = entityIds.map(id => id.split('.')[0]);
  return rest.every(d => d === first) ? first : undefined;
}

/** Curated action options for a domain. Empty if the domain has no catalog entry. */
export function actionOptionsForDomain(domain: string | undefined): ActionOption[] {
  return (domain && DOMAIN_ACTIONS[domain]) || [];
}

export interface PageCommand {
  id: string;
  label: string;
  target: 'next' | 'prev' | 'back' | 'goto';
}

/** Local openHASP page-navigation commands, sent to the device over MQTT — no HA entity involved. */
export const PAGE_COMMANDS: PageCommand[] = [
  { id: 'next', label: 'Go to next page', target: 'next' },
  { id: 'prev', label: 'Go to previous page', target: 'prev' },
  { id: 'back', label: 'Go back', target: 'back' },
  { id: 'goto', label: 'Go to page…', target: 'goto' },
];

/** The action to pre-select right after the first entity is picked — the first curated option, or none. */
export function firstCuratedAction(domain: string | undefined): HaAction {
  const options = actionOptionsForDomain(domain);
  if (options.length === 0) return { kind: 'none' };
  const opt = options[0];
  return { kind: 'service', trigger: opt.trigger, service: opt.service, dataLines: opt.dataLines };
}

function formatEntityLabel(entityId: string, friendlyName?: string): string {
  return friendlyName ? `${friendlyName} (${entityId})` : entityId;
}

/** Plain-English summary of what's displayed, for the properties panel. */
export function describeAutoDisplay(entityId: string, friendlyName?: string): string {
  return `Shows the current state of ${formatEntityLabel(entityId, friendlyName)}.`;
}

const TRIGGER_VERBS: Record<string, string> = {
  up: 'Pressing the widget',
  down: 'Pressing down on the widget',
  released: 'Releasing the widget',
  changed: 'Changing the widget',
};

const PAGE_TARGET_LABELS: Record<'next' | 'prev' | 'back', string> = {
  next: 'the next page',
  prev: 'the previous page',
  back: 'the previous page (back)',
};

/** Up to two target names, then "+N more" — keeps the summary readable for a large selection. */
function formatTargets(entityIds: string[], friendlyName: (entityId: string) => string | undefined): string {
  const labels = entityIds.slice(0, 2).map(id => formatEntityLabel(id, friendlyName(id)));
  const extra = entityIds.length - labels.length;
  return `${labels.join(' and ')}${extra > 0 ? ` +${extra} more` : ''}`;
}

/** Plain-English summary of the currently-configured action, built directly from the stored action — nothing re-derived. */
export function describeAction(
  action: HaAction | undefined,
  entityIds: string[] = [],
  friendlyName: (entityId: string) => string | undefined = () => undefined,
): string {
  if (!action || action.kind === 'none') return 'No action.';
  const verb = TRIGGER_VERBS[action.trigger] ?? `On "${action.trigger}"`;

  if (action.kind === 'page') {
    const targetLabel = typeof action.target === 'number' ? `page ${action.target}` : PAGE_TARGET_LABELS[action.target];
    return `${verb} navigates to ${targetLabel}.`;
  }

  if (!action.service) return `${verb} — no service set yet.`;
  return `${verb} calls ${action.service}${entityIds.length ? ` on ${formatTargets(entityIds, friendlyName)}` : ''}.`;
}
