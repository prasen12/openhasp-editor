import React, { useEffect, useMemo, useRef, useState } from 'react';
import { vscode } from '../../utils/vscodeApi';
import { renderHaTemplate } from '../../utils/haTemplateValidation';
import { useEditorStore } from '../../store/useEditorStore';
import { HaService } from '../../types';

interface HaServiceEditorProps {
  /** The stored service, e.g. "light.turn_on". */
  initialService: string;
  /** The stored service-data YAML lines, indented as they appear in the generated config. */
  initialDataLines: string[];
  /** Entities the call targets — used to sanity-check the service's domain. */
  entityIds: string[];
  /** openHASP event that fires the call, shown for context. */
  trigger?: string;
  /** Called with the validated service and its re-indented data lines. */
  onSave: (service: string, dataLines: string[]) => void;
  onClose: () => void;
}

interface Issue {
  level: 'error' | 'warning';
  message: string;
}

interface ValidationReport {
  issues: Issue[];
  /** Rendered value of each templated data field, for the preview. */
  rendered: Array<{ key: string; value: string }>;
}

/** Indentation the generated config expects for lines under `data:`. */
const DATA_INDENT = ' '.repeat(12);

/**
 * Variables the openHASP integration supplies at runtime (the event payload). Home Assistant's
 * template API knows nothing about them, so validation defines samples first — otherwise every
 * `{{ val }}` would fail as an undefined variable.
 */
const EVENT_VAR_PRELUDE = "{% set val = 50 %}{% set text = 'sample' %}{% set event = 'up' %}";

/** Domains whose services legitimately act on entities of any other domain. */
const CROSS_DOMAIN_SERVICES = new Set(['homeassistant', 'script', 'scene', 'automation', 'notify', 'mqtt', 'persistent_notification']);

const SERVICE_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

// ---------------------------------------------------------------------------
// Data-block text <-> stored lines
// ---------------------------------------------------------------------------

/** Strip the stored config indentation so the user edits plain YAML, keeping nesting intact. */
function dataLinesToText(lines: string[]): string {
  const content = lines.filter(l => l.trim().length > 0);
  if (content.length === 0) return '';
  const base = Math.min(...content.map(l => l.length - l.trimStart().length));
  return lines.map(l => (l.trim() ? l.slice(base) : '')).join('\n').trim();
}

/** Re-apply the config indentation, preserving each line's relative nesting. */
function textToDataLines(text: string): string[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const base = Math.min(...lines.map(l => l.length - l.trimStart().length));
  return lines.map(l => `${DATA_INDENT}${' '.repeat(l.length - l.trimStart().length - base)}${l.trim()}`);
}

interface DataEntry {
  key: string;
  value: string;
  /** True for a nested/continuation line, which carries no top-level key of its own. */
  nested: boolean;
  line: string;
}

/** Split the data block into top-level `key: value` pairs; deeper-indented lines belong to the key above. */
function parseDataEntries(text: string): DataEntry[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const base = Math.min(...lines.map(l => l.length - l.trimStart().length));

  return lines.map(line => {
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    const colon = trimmed.indexOf(':');
    if (indent > base || colon < 0) return { key: '', value: trimmed, nested: true, line: trimmed };
    return { key: trimmed.slice(0, colon).trim(), value: trimmed.slice(colon + 1).trim(), nested: false, line: trimmed };
  });
}

/** Drop the YAML quoting around a scalar so the template inside can be rendered on its own. */
function unquote(value: string): string {
  const m = value.match(/^(['"])([\s\S]*)\1$/);
  return m ? m[2] : value;
}

function hasJinja(value: string): boolean {
  return /\{\{|\{%|\{#/.test(value);
}

/** Services whose name is close enough to suggest as a fix for a typo. */
function nearestServices(service: string, catalog: HaService[]): string[] {
  const [domain, name] = service.split('.');
  const sameDomain = catalog.filter(s => s.domain === domain);
  if (sameDomain.length > 0) {
    const partial = name ? sameDomain.filter(s => s.service.includes(name) || name.includes(s.service.split('.')[1])) : [];
    return (partial.length > 0 ? partial : sameDomain).slice(0, 5).map(s => s.service);
  }
  return catalog.filter(s => s.service.includes(name ?? '')).slice(0, 5).map(s => s.service);
}

// ---------------------------------------------------------------------------
// Styles — matched to HaTemplateEditor so both modals read as one feature.
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 'min(560px, 92vw)', maxHeight: '88vh', overflowY: 'auto',
  background: 'var(--vscode-editor-background)', color: 'var(--vscode-foreground)',
  border: '1px solid var(--vscode-panel-border)', borderRadius: '4px',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)', padding: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)', borderRadius: '2px', padding: '6px',
  fontSize: '12px', fontFamily: 'var(--vscode-editor-font-family, monospace)',
};

const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: '72px', resize: 'vertical' };

const buttonStyle: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '2px',
  border: '1px solid var(--vscode-button-border, transparent)',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--vscode-button-secondaryBackground, var(--vscode-input-background))',
  color: 'var(--vscode-button-secondaryForeground, var(--vscode-foreground))',
};

const MAX_SERVICE_SUGGESTIONS = 60;

/**
 * Modal for editing a widget's Home Assistant service call — the service name plus the YAML
 * data sent with it. Mirrors HaTemplateEditor: you can validate on demand, and "Validate &
 * Save" refuses to write a call Home Assistant would reject.
 *
 * Validation checks the service exists in HA's service registry, that the data block parses as
 * `key: value` pairs, that the keys are parameters the service documents, and that every Jinja
 * value in the data actually renders on the server.
 */
export const HaServiceEditor: React.FC<HaServiceEditorProps> = ({
  initialService, initialDataLines, entityIds, trigger, onSave, onClose,
}) => {
  const { haServices, haServicesError, haServicesLoading, setHaServicesLoading } = useEditorStore();

  const [service, setService] = useState(() => unquote(initialService.trim()));
  const [dataText, setDataText] = useState(() => dataLinesToText(initialDataLines));
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const serviceInputRef = useRef<HTMLInputElement>(null);

  // The catalog is only needed here, so fetch it the first time this modal opens.
  useEffect(() => {
    if (haServices.length === 0 && !haServicesLoading && !haServicesError) {
      setHaServicesLoading(true);
      vscode.requestHaServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const known = useMemo(
    () => haServices.find(s => s.service === service.trim()),
    [haServices, service],
  );

  const suggestions = useMemo(() => {
    const q = service.trim().toLowerCase();
    const entityDomain = entityIds.length > 0 ? entityIds[0].split('.')[0] : undefined;
    const matches = q
      ? haServices.filter(s => s.service.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q))
      : haServices;
    // With nothing typed yet, lead with the target entity's own domain — that's almost always the wanted call.
    const ordered = q || !entityDomain
      ? matches
      : [...matches.filter(s => s.domain === entityDomain), ...matches.filter(s => s.domain !== entityDomain)];
    return ordered.slice(0, MAX_SERVICE_SUGGESTIONS);
  }, [haServices, service, entityIds]);

  // A templated service name matches nothing in the catalog, so the suggestion list only gets in the way.
  const isTemplate = hasJinja(service);
  const showSuggestions = suggestOpen && !isTemplate && suggestions.length > 0;

  const applySuggestion = (picked: HaService) => {
    setService(picked.service);
    setSuggestOpen(false);
    setReport(null);
    requestAnimationFrame(() => serviceInputRef.current?.focus());
  };

  const refreshServices = () => {
    setHaServicesLoading(true);
    vscode.requestHaServices();
  };

  /** Run every check; returns the report so the caller can decide whether saving may proceed. */
  const validate = async (): Promise<ValidationReport> => {
    const issues: Issue[] = [];
    const rendered: Array<{ key: string; value: string }> = [];
    // A service is never quoted in storage; drop quotes someone carried over from YAML.
    const name = unquote(service.trim());

    if (!name) {
      return { issues: [{ level: 'error', message: 'Service is required (e.g. light.turn_on).' }], rendered };
    }
    // Home Assistant's script engine allows a template as the service name. Render it to find out
    // which service this call resolves to — for the sample event values, at least.
    const templated = hasJinja(name);
    let resolved: string | undefined = name;

    if (templated) {
      const result = await renderHaTemplate(`${EVENT_VAR_PRELUDE}${name}`);
      if (!result.ok) {
        return { issues: [{ level: 'error', message: `Service template failed: ${result.error}` }], rendered };
      }
      resolved = (result.rendered ?? '').trim();
      rendered.push({ key: 'service', value: resolved || '(empty)' });
      if (!SERVICE_PATTERN.test(resolved)) {
        issues.push({
          level: 'warning',
          message: `The template rendered to "${resolved}", which is not a domain.service name. Other branches may still be fine — this run used sample event values.`,
        });
        resolved = undefined;
      }
    } else if (!SERVICE_PATTERN.test(name)) {
      return {
        issues: [{ level: 'error', message: `"${name}" is not a valid service name — it must be domain.service, lowercase, e.g. light.turn_on, or a Jinja template that produces one.` }],
        rendered,
      };
    }

    // Service registry: an unreachable Home Assistant means "unverified", not "invalid". A
    // template is only ever checked against the branch it happened to render, so it stays a warning.
    const catalogEntry = resolved ? haServices.find(s => s.service === resolved) : undefined;
    if (haServices.length === 0) {
      issues.push({
        level: 'warning',
        message: haServicesError
          ? `Service list unavailable (${haServicesError}) — the service name could not be verified.`
          : 'Service list not loaded yet — the service name could not be verified.',
      });
    } else if (resolved && !catalogEntry) {
      const near = nearestServices(resolved, haServices);
      const suffix = near.length ? ` Did you mean: ${near.join(', ')}?` : '';
      issues.push({
        level: templated ? 'warning' : 'error',
        message: templated
          ? `The template rendered to "${resolved}", which Home Assistant has no service for.${suffix}`
          : `Home Assistant has no service "${resolved}".${suffix}`,
      });
    }

    if (catalogEntry && !CROSS_DOMAIN_SERVICES.has(catalogEntry.domain)) {
      const mismatched = entityIds.filter(id => id.split('.')[0] !== catalogEntry.domain);
      if (mismatched.length > 0) {
        issues.push({
          level: 'warning',
          message: `${catalogEntry.service} is a ${catalogEntry.domain} service but ${mismatched.join(', ')} ${mismatched.length === 1 ? 'is' : 'are'} not — the call may be ignored for ${mismatched.length === 1 ? 'it' : 'them'}.`,
        });
      }
    }
    if (catalogEntry && !catalogEntry.hasTarget && entityIds.length > 0) {
      issues.push({
        level: 'warning',
        message: `${catalogEntry.service} does not take a target entity; the entity_id in the generated config will be ignored.`,
      });
    }

    // Data block: shape first, then the templates inside it.
    const entries = parseDataEntries(dataText);
    const seen = new Set<string>();
    for (const entry of entries) {
      if (entry.nested) {
        if (!entry.line.startsWith('-') && !entry.line.includes(':')) {
          issues.push({ level: 'error', message: `Data line "${entry.line}" is not a YAML key/value or list item.` });
        }
        continue;
      }
      if (!entry.key) {
        issues.push({ level: 'error', message: `Data line "${entry.line}" has no field name before the colon.` });
        continue;
      }
      if (seen.has(entry.key)) {
        issues.push({ level: 'error', message: `Data field "${entry.key}" is set more than once.` });
      }
      seen.add(entry.key);
      if (catalogEntry && catalogEntry.fields.length > 0 && !catalogEntry.fields.some(f => f.name === entry.key)) {
        issues.push({
          level: 'warning',
          message: `"${entry.key}" is not a documented field of ${catalogEntry.service}. Known fields: ${catalogEntry.fields.map(f => f.name).join(', ')}.`,
        });
      }
    }

    if (catalogEntry) {
      const missing = catalogEntry.fields.filter(f => f.required && !seen.has(f.name)).map(f => f.name);
      if (missing.length > 0) {
        issues.push({ level: 'warning', message: `${catalogEntry.service} requires ${missing.join(', ')} — not set in data.` });
      }
    }

    // Render each templated value on Home Assistant, with the openHASP event variables defined.
    for (const entry of entries) {
      const value = unquote(entry.value);
      if (!value || !hasJinja(value)) continue;
      const result = await renderHaTemplate(`${EVENT_VAR_PRELUDE}${value}`);
      const key = entry.nested ? entry.line : entry.key;
      if (result.ok) {
        rendered.push({ key, value: result.rendered === '' ? '(empty)' : (result.rendered ?? '') });
      } else {
        issues.push({ level: 'error', message: `Template for "${key}" failed: ${result.error}` });
      }
    }

    return { issues, rendered };
  };

  const run = async (intent: 'validate' | 'save') => {
    setValidating(true);
    setReport(null);
    try {
      const result = await validate();
      setReport(result);
      if (intent === 'save' && !result.issues.some(i => i.level === 'error')) {
        onSave(unquote(service.trim()), textToDataLines(dataText));
        onClose();
      }
    } finally {
      setValidating(false);
    }
  };

  const errorCount = report?.issues.filter(i => i.level === 'error').length ?? 0;
  const ok = report !== null && errorCount === 0;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>
            Service Call{trigger ? ` — on "${trigger}"` : ''}
          </h3>
          <span onClick={onClose} title="Close" style={{ cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}>×</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label style={labelStyle}>Home Assistant service</label>
          <span
            onClick={refreshServices}
            title="Reload the service list from Home Assistant"
            style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
          >
            {haServicesLoading ? '…' : '⟳'}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            ref={serviceInputRef}
            autoFocus
            type="text"
            value={service}
            placeholder="light.turn_on"
            spellCheck={false}
            onChange={e => { setService(e.target.value); setReport(null); setSuggestOpen(true); setActiveIndex(0); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={e => {
              if (!showSuggestions) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % suggestions.length); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length); }
              else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[activeIndex]); }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setSuggestOpen(false); }
            }}
            style={inputStyle}
          />
          {showSuggestions && (
            <div
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '2px', zIndex: 20,
                maxHeight: '200px', overflowY: 'auto',
                background: 'var(--vscode-dropdown-background, var(--vscode-input-background))',
                border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {suggestions.map((s, i) => (
                <div
                  key={s.service}
                  ref={el => { if (el && i === activeIndex) el.scrollIntoView({ block: 'nearest' }); }}
                  onMouseDown={ev => { ev.preventDefault(); applySuggestion(s); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  title={s.description}
                  style={{
                    display: 'flex', justifyContent: 'space-between', gap: '8px',
                    padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                    background: i === activeIndex ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                    color: i === activeIndex ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.service}
                  </span>
                  {s.name && <span style={{ opacity: 0.6, flexShrink: 0, whiteSpace: 'nowrap' }}>{s.name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {isTemplate ? (
          <p style={{ fontSize: '10px', opacity: 0.55, margin: '6px 0 0' }}>
            Templated service — validation renders it with sample event values and checks the service it
            resolves to. Other branches aren’t verified. It is quoted for you in the generated YAML.
          </p>
        ) : (
          <p style={{ fontSize: '10px', opacity: 0.55, margin: '6px 0 0' }}>
            A Jinja template that renders to a <code>domain.service</code> name works here too.
          </p>
        )}
        {known?.description && (
          <p style={{ fontSize: '11px', opacity: 0.7, margin: '6px 0 0' }}>{known.description}</p>
        )}
        {known && known.fields.length > 0 && (
          <p style={{ fontSize: '10px', opacity: 0.55, margin: '4px 0 0' }}>
            Fields: {known.fields.map(f => (f.required ? `${f.name}*` : f.name)).join(', ')}
          </p>
        )}
        {entityIds.length > 0 && (
          <p style={{ fontSize: '10px', opacity: 0.55, margin: '4px 0 0' }}>
            {entityIds.length === 1 ? 'Target' : `Targets (${entityIds.length})`}: <code>{entityIds.join(', ')}</code>
          </p>
        )}

        <div style={{ marginTop: '12px' }}>
          <label style={labelStyle}>Service data (YAML, one field per line)</label>
          <textarea
            value={dataText}
            onChange={e => { setDataText(e.target.value); setReport(null); }}
            placeholder={'brightness_pct: "{{ val }}"'}
            spellCheck={false}
            style={textareaStyle}
          />
          <p style={{ fontSize: '10px', opacity: 0.55, margin: '4px 0 0' }}>
            Values may use Jinja. openHASP supplies <code>val</code>, <code>text</code> and <code>event</code> at runtime;
            validation renders them with sample values.
          </p>
        </div>

        {report && (
          <div
            style={{
              marginTop: '10px', padding: '8px', borderRadius: '2px', fontSize: '12px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              border: `1px solid ${ok ? 'var(--vscode-testing-iconPassed, #4caf50)' : 'var(--vscode-inputValidation-errorBorder, #f48771)'}`,
              background: ok
                ? 'var(--vscode-inputValidation-infoBackground, transparent)'
                : 'var(--vscode-inputValidation-errorBackground, transparent)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              {ok ? '✓ Service call is valid' : `✕ ${errorCount} problem${errorCount === 1 ? '' : 's'} found`}
            </div>
            {report.issues.map((issue, i) => (
              <div key={i} style={{ marginBottom: '3px', opacity: issue.level === 'warning' ? 0.85 : 1 }}>
                {issue.level === 'error' ? '✕' : '⚠'} {issue.message}
              </div>
            ))}
            {report.rendered.length > 0 && (
              <div style={{ marginTop: '6px', fontFamily: 'var(--vscode-editor-font-family, monospace)', opacity: 0.9 }}>
                {report.rendered.map(r => (
                  <div key={r.key}>{r.key} → {r.value}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button style={secondaryButtonStyle} onClick={onClose} disabled={validating}>Cancel</button>
          <button style={secondaryButtonStyle} onClick={() => run('validate')} disabled={validating}>
            {validating ? 'Validating…' : 'Validate'}
          </button>
          <button style={primaryButtonStyle} onClick={() => run('save')} disabled={validating}>
            {validating ? 'Validating…' : 'Validate & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
