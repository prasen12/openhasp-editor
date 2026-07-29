import React, { useEffect, useState } from 'react';
import { Widget, HaBinding, HaAction, HaEntity } from '../../types';
import { useEditorStore } from '../../store/useEditorStore';
import { vscode } from '../../utils/vscodeApi';
import { HaTemplateEditor } from './HaTemplateEditor';
import {
  isHaBindable, supportsAction, actionDomains, defaultDisplayProperty, describeAutoDisplay, describeAction,
  actionOptionsForEntity, firstCuratedAction, PAGE_COMMANDS,
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
function actionSelectValue(action: HaAction | undefined, entityId?: string): string {
  if (!action || action.kind === 'none') return 'none';
  if (action.kind === 'page') {
    return typeof action.target === 'number' ? 'page:goto' : `page:${action.target}`;
  }
  if (entityId) {
    const match = actionOptionsForEntity(entityId).find(o => o.service === action.service && o.trigger === action.trigger);
    if (match) return `svc:${match.id}`;
  }
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

  const q = query.trim().toLowerCase();
  const matches = q
    ? entities.filter(e => e.entityId.toLowerCase().includes(q) || e.friendlyName?.toLowerCase().includes(q))
    : entities;
  const visible = matches.slice(0, MAX_VISIBLE_RESULTS);

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
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '2px', zIndex: 10,
            maxHeight: '220px', overflowY: 'auto',
            background: 'var(--vscode-dropdown-background, var(--vscode-input-background))',
            border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {visible.length === 0 && (
            <div style={{ padding: '6px 8px', fontSize: '11px', opacity: 0.6 }}>{emptyHint}</div>
          )}
          {visible.map(e => (
            <div
              key={e.entityId}
              onMouseDown={ev => ev.preventDefault()}
              onClick={() => { onSelect(e.entityId); setQuery(e.friendlyName ?? e.entityId); setOpen(false); }}
              onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--vscode-list-hoverBackground)')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
              title={e.entityId}
              style={{
                padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {e.friendlyName ?? e.entityId}
            </div>
          ))}
          {matches.length > visible.length && (
            <div style={{ padding: '4px 8px', fontSize: '10px', opacity: 0.5, borderTop: '1px solid var(--vscode-panel-border)' }}>
              Showing {visible.length} of {matches.length} — keep typing to narrow it down
            </div>
          )}
        </div>
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
  return binding.displayEntityId || binding.displayTemplate || binding.actionEntityId || hasAction
    ? binding
    : undefined;
}

export const HaBindingSection: React.FC<HaBindingSectionProps> = ({ widget, onUpdate }) => {
  const { haEntities, haEntitiesError, haEntitiesLoading, setHaEntitiesLoading } = useEditorStore();
  const [advanced, setAdvanced] = useState(false);
  const [displayMode, setDisplayMode] = useState<'entity' | 'template'>(
    widget.haBinding?.displayTemplate ? 'template' : 'entity',
  );
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState | null>(null);
  const bindable = isHaBindable(widget.obj);
  const actionable = supportsAction(widget.obj);

  // Selecting a different widget re-derives which display mode its binding is in.
  useEffect(() => {
    setDisplayMode(widget.haBinding?.displayTemplate ? 'template' : 'entity');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id]);

  // Fetch the entity list once on first use so the picker isn't empty the first time a widget is bound.
  useEffect(() => {
    if (bindable && haEntities.length === 0 && !haEntitiesLoading && !haEntitiesError) {
      setHaEntitiesLoading(true);
      vscode.requestHaEntities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindable]);

  if (!bindable) return null;

  const binding = widget.haBinding;
  const action = binding?.action;
  const displayEntity = binding?.displayEntityId ? haEntities.find(e => e.entityId === binding.displayEntityId) : undefined;
  const actionEntityDomains = actionDomains(widget.obj);
  const actionEntities = haEntities.filter(e => actionEntityDomains.includes(e.domain));
  const actionEntity = binding?.actionEntityId ? haEntities.find(e => e.entityId === binding.actionEntityId) : undefined;

  const applyPatch = (patch: Partial<HaBinding>) => {
    onUpdate(normalize({ ...(binding ?? {}), ...patch }));
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

    if (value.startsWith('svc:') && binding?.actionEntityId) {
      const opt = actionOptionsForEntity(binding.actionEntityId).find(o => o.id === value.slice(4));
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

      {/* Action: only for widgets that fire an interactive openHASP event. The entity picker
          is optional — openHASP page navigation doesn't need one. */}
      {actionable && (
        <>
          <div style={{ ...fieldStyle, marginTop: '12px' }}>
            <span style={labelStyle}>Action entity (only needed for a Home Assistant service call)</span>
            <EntityPicker
              key={`action-${widget.id}`}
              entities={actionEntities}
              value={binding?.actionEntityId}
              placeholder={`Search ${actionEntityDomains.join(', ')}…`}
              onSelect={entityId => applyPatch({ actionEntityId: entityId, action: firstCuratedAction(entityId) })}
              onClear={() => applyPatch({
                actionEntityId: undefined,
                action: action?.kind === 'service' ? { kind: 'none' } : action,
              })}
              emptyHint={
                haEntities.length === 0
                  ? 'No entities loaded — try refreshing (⟳ above)'
                  : `No matching ${actionEntityDomains.join('/')} entities`
              }
            />
          </div>

          {binding?.actionEntityId && stateBadge(actionEntity)}

          <div style={fieldStyle}>
            <span style={labelStyle}>Action</span>
            <select
              value={actionSelectValue(action, binding?.actionEntityId)}
              onChange={e => handleActionSelect(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="none">— None —</option>
              {binding?.actionEntityId && actionOptionsForEntity(binding.actionEntityId).length > 0 && (
                <optgroup label="Home Assistant">
                  {actionOptionsForEntity(binding.actionEntityId).map(opt => (
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
              {describeAction(action, binding?.actionEntityId, actionEntity?.friendlyName)}
            </p>
          )}

          {action?.kind === 'service' && actionSelectValue(action, binding?.actionEntityId) === 'custom' && (
            <>
              <div style={fieldStyle}>
                <span style={labelStyle}>openHASP event (trigger)</span>
                <input
                  type="text"
                  value={action.trigger}
                  placeholder="up, down, changed, released…"
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
