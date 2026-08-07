import { DeviceProperties, Page, Widget } from './types/models';
import { actionEntityList, defaultDisplayProperty, getAutoStateTemplate, resolveDisplayProperty } from './haBindingDefaults';
import { hasJinjaDelimiters, stripWrappingQuotes, wrapTemplate } from './haTemplate';

/**
 * Emit a `"<property>": <value>` line (or block). The template is wrapped to a real Jinja
 * template first. Single-line templates are inlined as a single-quoted YAML scalar (any
 * embedded single quote is doubled); multi-line templates — e.g. a {% if %}…{% endif %}
 * block — use a literal block scalar so newlines and quotes survive untouched.
 */
function emitPropertyLines(property: string, rawTemplate: string): string[] {
  const wrapped = wrapTemplate(rawTemplate);
  if (!wrapped.includes('\n')) {
    return [`      "${property}": '${wrapped.replace(/'/g, "''")}'`];
  }
  const body = wrapped.split('\n').map(line => `        ${line}`);
  return [`      "${property}": |-`, ...body];
}

/**
 * The effective `property → raw Jinja template` map for a widget's Home Assistant binding,
 * before any {{ }} wrapping or YAML formatting. This is the single source of truth for "which
 * properties a widget drives from Home Assistant", shared by the config generator (which turns
 * it into YAML) and the live canvas preview (which renders each template to show real values).
 * Ordered so explicit propertyTemplates override the display value on a key collision.
 */
export function widgetPropertyTemplates(widget: Widget): Map<string, string> {
  const binding = widget.haBinding;
  const merged = new Map<string, string>();
  if (!binding) return merged;

  if (binding.displayTemplate) {
    // Free-form Jinja template as the display value — not tied to a single entity.
    const property = binding.displayProperty ?? defaultDisplayProperty(widget.obj, '');
    merged.set(property, binding.displayTemplate);
  } else if (binding.displayEntityId) {
    const property = resolveDisplayProperty(widget.obj, binding.displayEntityId, binding.displayProperty);
    const template = binding.stateTemplate && binding.stateTemplate !== 'auto'
      ? binding.stateTemplate
      : getAutoStateTemplate(widget.obj, binding.displayEntityId, property);
    merged.set(property, template);
  }

  // General per-property templates — any property can be driven by a template.
  for (const [prop, tpl] of Object.entries(binding.propertyTemplates ?? {})) {
    if (prop.trim() && tpl.trim()) merged.set(prop.trim(), tpl);
  }

  return merged;
}

/**
 * Lines under a widget's `properties:` block, or null to omit the block entirely.
 * A widget with no haBinding produces nothing (the caller skips it). A widget with a
 * binding but no display source and no property templates is a deliberate action-only binding.
 */
function buildPropertyLines(widget: Widget): string[] | null {
  const merged = widgetPropertyTemplates(widget);
  if (merged.size === 0) return null;

  const lines: string[] = [];
  for (const [prop, tpl] of merged) lines.push(...emitPropertyLines(prop, tpl));
  return lines;
}

/**
 * The `- service: …` line of an action. Home Assistant's script engine accepts a template here,
 * but a bare `{{ … }}` would parse as a YAML flow mapping — so a templated service is emitted as
 * a quoted scalar (single quotes doubled), or a literal block when it spans lines.
 */
function emitServiceLines(service: string): string[] {
  const value = stripWrappingQuotes(service);
  if (!hasJinjaDelimiters(value)) return [`        - service: ${value}`];
  if (!value.includes('\n')) return [`        - service: '${value.replace(/'/g, "''")}'`];
  return [`        - service: |-`, ...value.split('\n').map(line => `            ${line}`)];
}

/**
 * Full `event:` block lines (including the trigger key), or null if the widget has no action.
 * The action itself is already fully resolved (which service, or which openHASP page command)
 * by the properties panel — this just transcribes it into YAML, it doesn't re-derive anything.
 */
function buildEventBlockLines(widget: Widget, deviceSlug: string): string[] | null {
  const binding = widget.haBinding;
  if (!binding) return null;

  const action = binding.action;
  if (!action || action.kind === 'none') return null;

  if (action.kind === 'page') {
    const payload = typeof action.target === 'number' ? String(action.target) : action.target;
    return [
      `      "${action.trigger}":`,
      `        - service: mqtt.publish`,
      `          data:`,
      `            topic: hasp/${deviceSlug}/command/page`,
      `            payload: "${payload}"`,
    ];
  }

  const targets = actionEntityList(binding.actionEntityId);
  if (targets.length === 0) return null;
  return [
    `      "${action.trigger}":`,
    ...emitServiceLines(action.service),
    `          target:`,
    // One target stays an inline scalar; several become a YAML list.
    ...(targets.length === 1
      ? [`            entity_id: ${targets[0]}`]
      : [`            entity_id:`, ...targets.map(id => `              - ${id}`)]),
    ...(action.dataLines?.length ? [`          data:`, ...action.dataLines] : []),
  ];
}

export function generateHAConfig(deviceProperties: DeviceProperties, pages: Page[]): string {
  const { deviceName } = deviceProperties;
  const nodeName = deviceName.toLowerCase().replace(/\s+/g, '_');

  const lines: string[] = [
    `# Configuration for ${deviceName}`,
    `# Generated by openHASP Editor`,
    `#`,
    `# Include in configuration.yaml as:`,
    `#   openhasp:`,
    `#     ${nodeName}: !include openhasp/${nodeName}_config.yaml`,
    `#`,
    `# Only widgets with a Home Assistant binding are listed below.`,
    `objects:`,
  ];

  for (const page of pages) {
    const pageName = page.id === 0 ? 'Overlay (all pages)' : (page.name ?? page.comment ?? `Page ${page.id}`);

    const widgetLines: string[] = [];
    for (const widget of page.widgets) {
      if (!widget.haBinding) continue;

      const propertyLines = buildPropertyLines(widget);
      const eventBlock = buildEventBlockLines(widget, nodeName);
      if (!propertyLines && !eventBlock) continue;

      const addr = `p${page.id}b${widget.id}`;
      const widgetLabel = widget.name ?? widget.description ?? widget.obj;
      widgetLines.push(`  - obj: "${addr}"  # ${widgetLabel}`);

      if (propertyLines) {
        widgetLines.push(`    properties:`);
        widgetLines.push(...propertyLines);
      }

      if (eventBlock) {
        widgetLines.push(`    event:`);
        widgetLines.push(...eventBlock);
      }

      widgetLines.push('');
    }

    // Skip pages with no bound widgets — no empty section headers.
    if (widgetLines.length === 0) continue;

    lines.push(`  #####################################`);
    lines.push(`  # Page ${page.id} — ${pageName}`);
    lines.push(`  #####################################`);
    lines.push(...widgetLines);
  }

  return lines.join('\n') + '\n';
}
