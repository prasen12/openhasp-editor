import React, { useEffect, useId, useState } from 'react';
import { Widget, HaBinding, HaAction, HaEntity } from '../../types';
import { useEditorStore } from '../../store/useEditorStore';
import { vscode } from '../../utils/vscodeApi';
import { HaTemplateEditor } from './HaTemplateEditor';
import { HaServiceEditor } from './HaServiceEditor';
import {
  isHaBindable, supportsAction, actionDomains, defaultDisplayProperty, describeAutoDisplay, describeAction,
  ActionOption, actionOptionsForDomain, actionEntityList, packActionEntities, commonActionDomain, firstCuratedAction, PAGE_COMMANDS,
} from '../../config/haBindingDefaults';

interface TemplateEditorState {
  title: string;
  value: string;
  apply: (value: string) => void;
}

const editTemplateButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start', marginTop: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
  background: 'var(--vscode-input-background)', color: 'var(--vscode-foreground)',
  border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
};

/** Which <select> value represents the currently-stored action, so the dropdown stays in sync. */
function actionSelectValue(action: HaAction | undefined, options: ActionOption[]): string {
  if (!action || action.kind === 'none') return 'none';
  if (action.kind === 'page') {
    return typeof action.target === 'number' ? 'page:goto' : `page:${action.target}`;
  }
  const match = options.find(o => o.service === action.service && o.trigger === action.trigger);
  if (match) return `svc:${match.id}`;
  return 'custom';
}

const sectionStyle: React.CSSProperties = { marginBottom: '16px' };
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
  opacity: 0.5, marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--vscode-panel-border)',
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' };
const labelStyle: React.CSSProperties = { fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle: React.CSSProperties = {
  background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)', borderRadius: '2px', padding: '3px 6px',
  fontSize: '12px', width: '100%', boxSizing: 'border-box',
};

const STATE_BADGE_COLORS: Record<string, string> = {
  on: '#4caf50', off: '#888888', unavailable: '#f48771', unknown: '#888888',
};

const MAX_VISIBLE_RESULTS = 100;

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '2px', zIndex: 10,
  maxHeight: '220px', overflowY: 'auto',
  background: 'var(--vscode-dropdown-background, var(--vscode-input-background))',
  border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

interface EntityOptionListProps {
  matches: HaEntity[];
  emptyHint: string;
  /** Entity ids already chosen — ticked in the list (multi-select only). */
  chosen?: Set<string>;
  onPick: (entityId: string) => void;
}

/** The scrollable result list shared by the single- and multi-select pickers. */
const EntityOptionList: React.FC<EntityOptionListProps> = ({ matches, emptyHint, chosen, onPick }) => {
  const visible = matches.slice(0, MAX_VISIBLE_RESULTS);
  return (
    <div style={dropdownStyle}>
      {visible.length === 0 && (
        <div style={{ padding: '6px 8px', fontSize: '11px', opacity: 0.6 }}>{emptyHint}</div>
      )}
      {visible.map(e => (
        <div
          key={e.entityId}
          onMouseDown={ev => ev.preventDefault()}
          onClick={() => onPick(e.entityId)}
          onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--vscode-list-hoverBackground)')}
          onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
          title={e.entityId}
          style={{
            display: 'flex', gap: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {chosen && <span style={{ width: '10px', flexShrink: 0, opacity: 0.8 }}>{chosen.has(e.entityId) ? '✓' : ''}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.friendlyName ?? e.entityId}</span>
        </div>
      ))}
      {matches.length > visible.length && (
        <div style={{ padding: '4px 8px', fontSize: '10px', opacity: 0.5, borderTop: '1px solid var(--vscode-panel-border)' }}>
          Showing {visible.length} of {matches.length} — keep typing to narrow it down
        </div>
      )}
    </div>
  );
};

/** Entities whose id or friendly name contains the query; everything when the query is empty. */
function matchEntities(entities: HaEntity[], query: string): HaEntity[] {
  const q = query.trim().toLowerCase();
  if (!q) return entities;
  return entities.filter(e => e.entityId.toLowerCase().includes(q) || e.friendlyName?.toLowerCase().includes(q));
}

interface EntityPickerProps {
  entities: HaEntity[];
  value?: string;
  placeholder: string;
  onSelect: (entityId: string) => void;
  onClear: () => void;
  emptyHint: string;
}

/** A searchable, scrollable entity combobox — a plain-object dropdown, not a native <datalist> (which can't scroll and silently caps results). */
const EntityPicker: React.FC<EntityPickerProps> = ({ entities, value, placeholder, onSelect, onClear, emptyHint }) => {
  const [query, setQuery] = useState(() => {
    const match = value ? entities.find(e => e.entityId === value) : undefined;
    return match?.friendlyName ?? value ?? '';
  });
  const [open, setOpen] = useState(false);

  // Entities usually arrive asynchronously after the widget is already bound — once they load,
  // swap the raw entity_id shown in the box for its friendly name. Skip while the user is
  // actively searching so this doesn't clobber their typing.
  useEffect(() => {
    if (open) return;
    const match = value ? entities.find(e => e.entityId === value) : undefined;
    setQuery(match?.friendlyName ?? value ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, entities]);

  const matches = matchEntities(entities, query);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          style={{ ...inputStyle, flex: 1 }}
        />
        {value && (
          <button
            onClick={() => { setQuery(''); onClear(); }}
            title="Clear"
            style={{
              background: 'var(--vscode-input-background)', color: 'var(--vscode-foreground)',
              border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
              padding: '0 8px', cursor: 'pointer', fontSize: '12px',
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <EntityOptionList
          matches={matches}
          emptyHint={emptyHint}
          onPick={entityId => {
            const picked = entities.find(e => e.entityId === entityId);
            onSelect(entityId);
            setQuery(picked?.friendlyName ?? entityId);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface MultiEntityPickerProps {
  entities: HaEntity[];
  selected: string[];
  placeholder: string;
  onChange: (entityIds: string[]) => void;
  emptyHint: string;
}

/**
 * Multi-select variant of EntityPicker: chosen entities appear as removable chips (each with
 * its state dot) and the search box stays open so several can be picked in a row. Clicking an
 * already-chosen entity in the list removes it again.
 */
const MultiEntityPicker: React.FC<MultiEntityPickerProps> = ({ entities, selected, placeholder, onChange, emptyHint }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const chosen = new Set(selected);

  const toggle = (entityId: string) => {
    onChange(chosen.has(entityId) ? selected.filter(id => id !== entityId) : [...selected, entityId]);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative' }}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
          {selected.map(id => {
            const entity = entities.find(e => e.entityId === id);
            return (
              <span
                key={id}
                title={entity ? `${id} — ${entity.state}` : id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%',
                  background: 'var(--vscode-badge-background, var(--vscode-input-background))',
                  color: 'var(--vscode-badge-foreground, var(--vscode-foreground))',
                  border: '1px solid var(--vscode-input-border)', borderRadius: '10px',
                  padding: '1px 4px 1px 6px', fontSize: '11px',
                }}
              >
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: entity ? (STATE_BADGE_COLORS[entity.state] ?? '#2196F3') : '#555555',
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entity?.friendlyName ?? id}
                </span>
                <span
                  onClick={() => onChange(selected.filter(other => other !== id))}
                  title={`Remove ${id}`}
                  style={{ cursor: 'pointer', opacity: 0.7, padding: '0 2px' }}
                >
                  ×
                </span>
              </span>
            );
          })}
        </div>
      )}
      <input
        type="text"
        value={query}
        placeholder={selected.length ? 'Add another entity…' : placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        style={inputStyle}
      />
      {open && (
        <EntityOptionList
          matches={matchEntities(entities, query)}
          emptyHint={emptyHint}
          chosen={chosen}
          onPick={toggle}
        />
      )}
    </div>
  );
};

interface HaBindingSectionProps {
  widget: Widget;
  onUpdate: (binding: HaBinding | undefined) => void;
}

function normalize(binding: HaBinding): HaBinding | undefined {
  const hasAction = binding.action !== undefined && binding.action.kind !== 'none';
  const hasPropertyTemplates = !!binding.propertyTemplates && Object.keys(binding.propertyTemplates).length > 0;
  const hasActionEntity = actionEntityList(binding.actionEntityId).length > 0;
  return binding.displayEntityId || binding.displayTemplate || hasActionEntity || hasAction || hasPropertyTemplates
    ? binding
    : undefined;
}

/** Common openHASP widget properties, offered as a datalist when naming a property template. */
const COMMON_PROPERTIES = [
  'text', 'value_str', 'val', 'min', 'max', 'hidden', 'options',
  'bg_color', 'text_color', 'border_color', 'line_color', 'src', 'value_font',
];

interface PropertyTemplatesEditorProps {
  entries: Record<string, string>;
  commonProperties: string[];
  onEdit: (property: string, template: string) => void;
  onRemove: (property: string) => void;
}

/** Lists the widget's per-property Jinja templates and lets the user add, edit or remove them. */
const PropertyTemplatesEditor: React.FC<PropertyTemplatesEditorProps> = ({ entries, commonProperties, onEdit, onRemove }) => {
  const [newProp, setNewProp] = useState('');
  const listId = useId();
  const rows = Object.entries(entries);
  const trimmed = newProp.trim();
  const canAdd = trimmed.length > 0 && !(trimmed in entries);

  const removeButtonStyle: React.CSSProperties = {
    background: 'var(--vscode-input-background)', color: 'var(--vscode-foreground)',
    border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
    padding: '0 7px', cursor: 'pointer', fontSize: '12px', lineHeight: '20px',
  };

  const add = () => {
    if (!canAdd) return;
    onEdit(trimmed, '');
    setNewProp('');
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <span style={labelStyle}>Property templates (any property)</span>
      {rows.length === 0 && (
        <p style={{ fontSize: '11px', opacity: 0.6, margin: '4px 0' }}>
          None yet — drive any property (text, val, hidden, bg_color…) with a Jinja template.
        </p>
      )}
      {rows.map(([prop, tpl]) => (
        <div key={prop} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
          <code style={{ fontSize: '11px', minWidth: '64px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prop}>
            {prop}
          </code>
          <span
            style={{ flex: 1, fontSize: '11px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
            title={tpl}
          >
            {tpl.trim() || '(empty)'}
          </span>
          <button style={{ ...editTemplateButtonStyle, marginTop: 0 }} onClick={() => onEdit(prop, tpl)}>Edit</button>
          <button style={removeButtonStyle} title={`Remove ${prop}`} onClick={() => onRemove(prop)}>×</button>
        </div>
      ))}

      <datalist id={listId}>
        {commonProperties.map(p => <option key={p} value={p} />)}
      </datalist>
      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
        <input
          list={listId}
          value={newProp}
          placeholder="property name…"
          onChange={e => setNewProp(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          disabled={!canAdd}
          onClick={add}
          style={{ ...editTemplateButtonStyle, marginTop: 0, opacity: canAdd ? 1 : 0.5, cursor: canAdd ? 'pointer' : 'not-allowed' }}
        >
          Add &amp; edit…
        </button>
      </div>
    </div>
  );
};

export const HaBindingSection: React.FC<HaBindingSectionProps> = ({ widget, onUpdate }) => {
  const { haEntities, haEntitiesError, haEntitiesLoading, setHaEntitiesLoading } = useEditorStore();
  const [advanced, setAdvanced] = useState(false);
  const [displayMode, setDisplayMode] = useState<'entity' | 'template'>(
    widget.haBinding?.displayTemplate ? 'template' : 'entity',
  );
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState | null>(null);
  const [serviceEditorOpen, setServiceEditorOpen] = useState(false);
  const bindable = isHaBindable(widget.obj);
  const actionable = supportsAction(widget.obj);

  // Selecting a different widget re-derives which display mode its binding is in.
  useEffect(() => {
    setDisplayMode(widget.haBinding?.displayTemplate ? 'template' : 'entity');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id]);

  // Fetch the entity list once on first use so the picker (and template autocomplete) isn't empty.
  useEffect(() => {
    if (haEntities.length === 0 && !haEntitiesLoading && !haEntitiesError) {
      setHaEntitiesLoading(true);
      vscode.requestHaEntities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const binding = widget.haBinding;
  const action = binding?.action;
  const displayEntity = binding?.displayEntityId ? haEntities.find(e => e.entityId === binding.displayEntityId) : undefined;
  const actionEntityDomains = actionDomains(widget.obj);
  const actionEntities = haEntities.filter(e => actionEntityDomains.includes(e.domain));
  const actionEntityIds = actionEntityList(binding?.actionEntityId);
  // Curated actions are per-domain, so they only apply while every target shares one domain.
  const actionDomain = commonActionDomain(actionEntityIds);
  const curatedActionOptions = actionOptionsForDomain(actionDomain, widget);
  const friendlyNameOf = (entityId: string) => haEntities.find(e => e.entityId === entityId)?.friendlyName;
  const propertyTemplates = binding?.propertyTemplates ?? {};

  const applyPatch = (patch: Partial<HaBinding>) => {
    onUpdate(normalize({ ...(binding ?? {}), ...patch }));
  };

  const setPropertyTemplate = (property: string, template: string) => {
    const next = { ...propertyTemplates, [property]: template };
    applyPatch({ propertyTemplates: next });
  };

  const removePropertyTemplate = (property: string) => {
    const next = { ...propertyTemplates };
    delete next[property];
    applyPatch({ propertyTemplates: Object.keys(next).length ? next : undefined });
  };

  const handleRefresh = () => {
    setHaEntitiesLoading(true);
    vscode.requestHaEntities();
  };

  const handleActionSelect = (value: string) => {
    if (value === 'none') { applyPatch({ action: { kind: 'none' } }); return; }

    if (value === 'custom') {
      applyPatch({
        action: {
          kind: 'service',
          trigger: action && action.kind === 'service' ? action.trigger : 'up',
          service: action && action.kind === 'service' ? action.service : '',
          dataLines: action && action.kind === 'service' ? action.dataLines : [],
        },
      });
      return;
    }

    if (value.startsWith('page:')) {
      const cmd = PAGE_COMMANDS.find(c => c.id === value.slice(5));
      if (cmd) applyPatch({ action: { kind: 'page', trigger: 'up', target: cmd.target === 'goto' ? 1 : cmd.target } });
      return;
    }

    if (value.startsWith('svc:') && actionEntityIds.length > 0) {
      const opt = curatedActionOptions.find(o => o.id === value.slice(4));
      if (opt) applyPatch({ action: { kind: 'service', trigger: opt.trigger, service: opt.service, dataLines: opt.dataLines } });
    }
  };

  const stateBadge = (entity: HaEntity | undefined) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
      <span
        style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          background: entity ? (STATE_BADGE_COLORS[entity.state] ?? '#2196F3') : '#555555',
        }}
      />
      <span style={{ fontSize: '11px', opacity: 0.8 }}>
        {entity ? entity.state : 'state unknown — refresh to check'}
      </span>
    </div>
  );

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ ...sectionTitleStyle, marginBottom: 0, border: 'none', paddingBottom: 0 }}>Home Assistant</div>
        <span
          onClick={handleRefresh}
          title="Refresh entity list from Home Assistant"
          style={{ cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
        >
          {haEntitiesLoading ? '…' : '⟳'}
        </span>
      </div>
      <div style={{ borderBottom: '1px solid var(--vscode-panel-border)', marginBottom: '8px' }} />

      {haEntitiesError && (
        <p style={{ fontSize: '11px', color: 'var(--vscode-errorForeground, #f48771)', margin: '0 0 8px' }}>
          {haEntitiesError}
        </p>
      )}

      {bindable && (<>
      {/* Display source: bind to a single entity, or supply a free-form Jinja template. */}
      <div style={fieldStyle}>
        <span style={labelStyle}>Display source</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['entity', 'template'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                if (mode === displayMode) return;
                setDisplayMode(mode);
                // Switching source clears the other side so only one display path is stored.
                if (mode === 'entity') {
                  applyPatch({ displayTemplate: undefined });
                } else {
                  applyPatch({ displayEntityId: undefined, stateTemplate: undefined });
                }
              }}
              style={{
                flex: 1, padding: '3px 0', fontSize: '11px', cursor: 'pointer', borderRadius: '2px',
                border: '1px solid var(--vscode-input-border)',
                background: displayMode === mode
                  ? 'var(--vscode-button-background, var(--vscode-list-activeSelectionBackground))'
                  : 'var(--vscode-input-background)',
                color: displayMode === mode
                  ? 'var(--vscode-button-foreground, var(--vscode-foreground))'
                  : 'var(--vscode-foreground)',
              }}
            >
              {mode === 'entity' ? 'Entity' : 'Template'}
            </button>
          ))}
        </div>
      </div>

      {displayMode === 'entity' && (
        <div style={fieldStyle}>
          <span style={labelStyle}>Display (any entity)</span>
          <EntityPicker
            key={`display-${widget.id}`}
            entities={haEntities}
            value={binding?.displayEntityId}
            placeholder="Search all entities…"
            onSelect={entityId => applyPatch({ displayEntityId: entityId, stateTemplate: 'auto' })}
            onClear={() => applyPatch({ displayEntityId: undefined, displayProperty: undefined, stateTemplate: undefined })}
            emptyHint={haEntities.length === 0 ? 'No entities loaded — try refreshing (⟳ above)' : 'No matching entities'}
          />
        </div>
      )}

      {displayMode === 'template' && (
        <>
          <div style={fieldStyle}>
            <span style={labelStyle}>Display template (Jinja, no braces)</span>
            <textarea
              value={binding?.displayTemplate ?? ''}
              placeholder={'states("sensor.a") | float + states("sensor.b") | float'}
              onChange={e => applyPatch({ displayTemplate: e.target.value ? e.target.value : undefined })}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
            />
            <button
              style={editTemplateButtonStyle}
              onClick={() => setTemplateEditor({
                title: 'Display Template',
                value: binding?.displayTemplate ?? '',
                apply: v => applyPatch({ displayTemplate: v || undefined }),
              })}
            >
              Edit &amp; validate…
            </button>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Displayed as</span>
            <select
              value={binding?.displayProperty ?? defaultDisplayProperty(widget.obj, '')}
              onChange={e => applyPatch({ displayProperty: e.target.value as 'val' | 'text' })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="val">Value (val)</option>
              <option value="text">Text</option>
            </select>
          </div>
          <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px' }}>
            Wrapped as <code>&#123;&#123; … &#125;&#125;</code> in the generated Home Assistant config.
          </p>
        </>
      )}

      {displayMode === 'entity' && binding?.displayEntityId && (
        <>
          {stateBadge(displayEntity)}
          {!advanced && (
            <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px' }}>
              {describeAutoDisplay(binding.displayEntityId, displayEntity?.friendlyName)}
            </p>
          )}
          {advanced && (
            <>
              <div style={fieldStyle}>
                <span style={labelStyle}>Displayed as</span>
                <select
                  value={binding.displayProperty ?? defaultDisplayProperty(widget.obj, binding.displayEntityId)}
                  onChange={e => applyPatch({ displayProperty: e.target.value as 'val' | 'text' })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="val">Value (val)</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>State template override (Jinja, no braces)</span>
                <input
                  type="text"
                  placeholder="auto"
                  value={binding.stateTemplate && binding.stateTemplate !== 'auto' ? binding.stateTemplate : ''}
                  onChange={e => applyPatch({ stateTemplate: e.target.value.trim() ? e.target.value : 'auto' })}
                  style={inputStyle}
                />
                <button
                  style={editTemplateButtonStyle}
                  onClick={() => setTemplateEditor({
                    title: 'State Template Override',
                    value: binding.stateTemplate && binding.stateTemplate !== 'auto' ? binding.stateTemplate : '',
                    apply: v => applyPatch({ stateTemplate: v.trim() ? v : 'auto' }),
                  })}
                >
                  Edit &amp; validate…
                </button>
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px' }}>
            <input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} style={{ margin: 0 }} />
            <span style={{ fontSize: '12px' }}>Advanced display override</span>
          </div>
        </>
      )}
      </>)}

      {/* Property templates: drive any widget property with a Jinja template. Available for every
          widget type, not just display-bindable ones. */}
      <PropertyTemplatesEditor
        entries={propertyTemplates}
        commonProperties={COMMON_PROPERTIES}
        onEdit={(property, template) => setTemplateEditor({
          title: `Property Template — ${property}`,
          value: template,
          apply: v => (v.trim() ? setPropertyTemplate(property, v) : removePropertyTemplate(property)),
        })}
        onRemove={removePropertyTemplate}
      />

      {/* Action: only for widgets that fire an interactive openHASP event. The entity picker
          is optional — openHASP page navigation doesn't need one. */}
      {actionable && (
        <>
          <div style={{ ...fieldStyle, marginTop: '12px' }}>
            <span style={labelStyle}>Action entities (only needed for a Home Assistant service call)</span>
            <MultiEntityPicker
              key={`action-${widget.id}`}
              entities={actionEntities}
              selected={actionEntityIds}
              placeholder={`Search ${actionEntityDomains.join(', ')}…`}
              onChange={next => applyPatch({
                actionEntityId: packActionEntities(next),
                // Seed a curated action with the first target; later picks leave the choice alone.
                action: next.length === 0 && action?.kind === 'service'
                  ? { kind: 'none' }
                  : actionEntityIds.length === 0 && next.length === 1
                    ? firstCuratedAction(commonActionDomain(next), widget)
                    : action,
              })}
              emptyHint={
                haEntities.length === 0
                  ? 'No entities loaded — try refreshing (⟳ above)'
                  : `No matching ${actionEntityDomains.join('/')} entities`
              }
            />
          </div>

          {actionEntityIds.length > 1 && !actionDomain && (
            <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px' }}>
              Targets span several domains — pick the service yourself with “Custom…”.
            </p>
          )}

          <div style={fieldStyle}>
            <span style={labelStyle}>Action</span>
            <select
              value={actionSelectValue(action, curatedActionOptions)}
              onChange={e => handleActionSelect(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="none">— None —</option>
              {curatedActionOptions.length > 0 && (
                <optgroup label="Home Assistant">
                  {curatedActionOptions.map(opt => (
                    <option key={opt.id} value={`svc:${opt.id}`}>{opt.label}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="openHASP">
                {PAGE_COMMANDS.map(cmd => (
                  <option key={cmd.id} value={`page:${cmd.id}`}>{cmd.label}</option>
                ))}
              </optgroup>
              <option value="custom">Custom…</option>
            </select>
          </div>

          {action?.kind === 'page' && typeof action.target === 'number' && (
            <div style={fieldStyle}>
              <span style={labelStyle}>Page number</span>
              <input
                type="number"
                min={0}
                value={action.target}
                onChange={e => applyPatch({ action: { kind: 'page', trigger: action.trigger, target: Number(e.target.value) } })}
                style={inputStyle}
              />
            </div>
          )}

          {action && action.kind !== 'none' && (
            <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px' }}>
              {describeAction(action, actionEntityIds, friendlyNameOf)}
            </p>
          )}

          {action?.kind === 'service' && (
            <button
              style={{ ...editTemplateButtonStyle, marginTop: 0, marginBottom: '8px' }}
              onClick={() => setServiceEditorOpen(true)}
            >
              Edit &amp; validate service call…
            </button>
          )}

          {action?.kind === 'service' && actionSelectValue(action, curatedActionOptions) === 'custom' && (
            <>
              <div style={fieldStyle}>
                <span style={labelStyle}>openHASP event (trigger)</span>
                <input
                  type="text"
                  value={action.trigger}
                  placeholder="up, down, release, changed, long…"
                  onChange={e => applyPatch({ action: { ...action, trigger: e.target.value } })}
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>HA service</span>
                <input
                  type="text"
                  value={action.service}
                  placeholder="light.turn_on"
                  onChange={e => applyPatch({ action: { ...action, service: e.target.value } })}
                  style={inputStyle}
                />
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Data (optional YAML line, e.g. brightness_pct: "&#123;&#123; val &#125;&#125;")</span>
                {(action.dataLines?.length ?? 0) > 1 ? (
                  // Multi-line data can't round-trip through a single input — edit it in the modal instead.
                  <p style={{ fontSize: '11px', opacity: 0.7, margin: '2px 0' }}>
                    {action.dataLines!.length} data lines — use “Edit &amp; validate service call…” above.
                  </p>
                ) : (
                  <input
                    type="text"
                    value={action.dataLines?.[0]?.trim() ?? ''}
                    placeholder='brightness_pct: "{{ val }}"'
                    onChange={e => {
                      const line = e.target.value.trim();
                      applyPatch({ action: { ...action, dataLines: line ? [`            ${line}`] : [] } });
                    }}
                    style={inputStyle}
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {binding && (
        <button
          onClick={() => onUpdate(undefined)}
          style={{
            marginTop: '4px', width: '100%', padding: '4px 0',
            background: 'var(--vscode-input-background)', color: 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
            fontSize: '11px', cursor: 'pointer',
          }}
        >
          Clear Home Assistant binding
        </button>
      )}

      {serviceEditorOpen && action?.kind === 'service' && (
        <HaServiceEditor
          initialService={action.service}
          initialDataLines={action.dataLines ?? []}
          entityIds={actionEntityIds}
          trigger={action.trigger}
          onSave={(service, dataLines) => applyPatch({
            action: { kind: 'service', trigger: action.trigger, service, dataLines: dataLines.length ? dataLines : undefined },
          })}
          onClose={() => setServiceEditorOpen(false)}
        />
      )}

      {templateEditor && (
        <HaTemplateEditor
          title={templateEditor.title}
          initialValue={templateEditor.value}
          onSave={templateEditor.apply}
          onClose={() => setTemplateEditor(null)}
        />
      )}
    </div>
  );
};
