import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Widget } from '../../types';
import { getWidgetAbsoluteRect, isDescendant } from '../../utils/widgetHierarchy';
import { IconPicker } from '../IconPicker/IconPicker';
import { IconEntry } from '../../config/iconData';
import { WIDGET_PROPS, PropSection } from '../../config/widgetProperties';
import { isOverlayPage } from '../../utils/pageLabel';
import { HaBindingSection } from './HaBindingSection';
import { HaTemplateEditor } from './HaTemplateEditor';

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  opacity: 0.7,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--vscode-input-background)',
  color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  padding: '3px 6px',
  fontSize: '12px',
  width: '100%',
  boxSizing: 'border-box'
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  opacity: 0.5,
  marginBottom: '8px',
  paddingBottom: '4px',
  borderBottom: '1px solid var(--vscode-panel-border)',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  marginBottom: '8px',
};

/** Index matches openHASP's text_decor codes: 0=none, 1=underline, 2=line-through, 3=both. */
const TEXT_DECOR_OPTIONS = ['none', 'underline', 'line-through', 'both'];

/** Matches openHASP's bg_grad_dir codes: 0=none, 1=horizontal, 2=vertical. */
const BG_GRAD_DIR_OPTIONS = ['none', 'horizontal', 'vertical'];

/** openHASP's border_side is a bitmask: 1=bottom, 2=top, 4=left, 8=right, 15=full (default), 0=none. */
const BORDER_SIDE_VALUES: Record<string, number> = {
  full: 15, none: 0, top: 2, bottom: 1, left: 4, right: 8, 'top+bottom': 3, 'left+right': 12,
};
const BORDER_SIDE_OPTIONS = Object.keys(BORDER_SIDE_VALUES);
function borderSideLabel(value: number | undefined): string {
  const entry = Object.entries(BORDER_SIDE_VALUES).find(([, v]) => v === (value ?? 15));
  return entry ? entry[0] : 'full';
}

const templateToggleStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--vscode-foreground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  padding: '0 4px',
  fontSize: '10px',
  lineHeight: '15px',
  cursor: 'pointer',
  opacity: 0.5,
  flexShrink: 0,
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
};

/** Read-only, word-wrapped view of a bound property's Jinja template (click to edit). */
const templateReadoutStyle: React.CSSProperties = {
  cursor: 'pointer',
  background: 'var(--vscode-input-background)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  padding: '4px 6px',
  fontSize: '11px',
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: '88px',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const templateActionButtonStyle: React.CSSProperties = {
  background: 'var(--vscode-input-background)',
  color: 'var(--vscode-foreground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  padding: '2px 8px',
  fontSize: '11px',
  cursor: 'pointer',
};

/** Shared template-mode block: a wrapped read-only view plus Edit / revert-to-value actions. */
const TemplateValueView: React.FC<{
  label: string;
  template: string;
  onEdit: () => void;
  onClear: () => void;
}> = ({ label, template, onEdit, onClear }) => (
  <div style={{ ...fieldStyle, marginBottom: '8px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: '10px', opacity: 0.55, fontFamily: 'var(--vscode-editor-font-family, monospace)' }}>
        ƒx template
      </span>
    </div>
    <div style={templateReadoutStyle} title="Click to edit this template" onClick={onEdit}>
      {template}
    </div>
    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
      <button type="button" style={templateActionButtonStyle} onClick={onEdit}>Edit template…</button>
      <button type="button" style={templateActionButtonStyle} onClick={onClear}>Use value</button>
    </div>
  </div>
);

interface FieldProps {
  label: string;
  type?: 'text' | 'number' | 'color' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (val: any) => void;
  options?: string[];
  min?: number;
  max?: number;
  /** openHASP property name — enables the "set with a template" affordance when set. */
  propKey?: string;
  /** Current Jinja template for this property (from haBinding.propertyTemplates), if any. */
  template?: string;
  onOpenTemplate?: () => void;
  onClearTemplate?: () => void;
}

const Field: React.FC<FieldProps> = ({
  label, type = 'text', value, onChange, options, min, max,
  propKey, template, onOpenTemplate, onClearTemplate,
}) => {
  const templatable = !!propKey && !!onOpenTemplate;
  const hasTemplate = templatable && template !== undefined && template !== '';

  // Small "{ }" button that switches this property over to a Jinja template.
  const toggle = templatable && !hasTemplate ? (
    <button
      type="button"
      title={`Set ${propKey} with a Jinja template`}
      onMouseDown={e => e.preventDefault()}
      onClick={onOpenTemplate}
      style={templateToggleStyle}
    >
      {'{ }'}
    </button>
  ) : null;

  const labelRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
      <span style={labelStyle}>{label}</span>
      {toggle}
    </div>
  );

  // Template mode replaces whatever control this field would normally render.
  if (hasTemplate) {
    return (
      <TemplateValueView
        label={label}
        template={template!}
        onEdit={onOpenTemplate!}
        onClear={onClearTemplate!}
      />
    );
  }

  if (type === 'checkbox') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          style={{ margin: 0 }}
        />
        <span style={{ fontSize: '12px', flex: 1 }}>{label}</span>
        {toggle}
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div style={{ ...fieldStyle, marginBottom: '8px' }}>
        {labelRow}
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div style={{ ...fieldStyle, marginBottom: '8px' }}>
        {labelRow}
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
        />
      </div>
    );
  }

  return (
    <div style={fieldStyle}>
      {labelRow}
      <input
        type={type}
        value={value ?? (type === 'number' ? 0 : '')}
        min={min}
        max={max}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        style={type === 'color' ? { ...inputStyle, padding: '1px 2px', height: '26px' } : inputStyle}
      />
    </div>
  );
};

/** Property keys already covered by a dedicated field elsewhere in this panel. */
const KNOWN_KEYS = new Set([
  'id', 'obj', 'page', 'x', 'y', 'w', 'h', 'parentid', 'groupid', 'name', 'description', 'hidden',
  'bg_color', 'bg_opa', 'bg_grad_color', 'bg_grad_dir', 'bg_grad_stop', 'bg_main_stop',
  'border_width', 'border_color', 'border_opa', 'border_side', 'radius', 'opacity',
  'text', 'text_color', 'text_font', 'text_opa', 'text_letter_space', 'text_line_space', 'text_decor',
  'align', 'justify', 'src',
  'shadow_color', 'shadow_opa', 'shadow_width', 'shadow_ofs_x', 'shadow_ofs_y', 'shadow_spread',
  'outline_color', 'outline_opa', 'outline_width', 'outline_pad',
  'pad_top', 'pad_right', 'pad_bottom', 'pad_left',
  'image_opa', 'image_recolor', 'image_recolor_opa',
]);

interface CustomPropertiesEditorProps {
  widget: Widget;
  widgetSections: PropSection[];
  onUpdate: (key: string, value: any) => void;
}

/**
 * Escape hatch for the long tail of openHASP styling properties that don't have a dedicated
 * field: gradients' stop/main positions, part/state-suffixed variants (bg_color10, text_color01,
 * scale_end_color, ...), value/line/scale properties, etc. There are too many combinations
 * (property × part × state) to give each a bespoke UI control, so this lets any property be
 * added/edited/removed directly by name — it passes straight through to the JSONL output.
 */
const CustomPropertiesEditor: React.FC<CustomPropertiesEditorProps> = ({ widget, widgetSections, onUpdate }) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const coveredKeys = new Set([...KNOWN_KEYS, ...widgetSections.flatMap(s => s.props.map(p => p.key))]);
  const customEntries = Object.entries(widget).filter(
    ([k, v]) => !coveredKeys.has(k) && v !== undefined && v !== null && typeof v !== 'object'
  );

  const coerce = (raw: string): string | number => {
    const numeric = Number(raw);
    return raw.trim() !== '' && !Number.isNaN(numeric) ? numeric : raw;
  };

  const handleAdd = () => {
    const key = newKey.trim();
    if (!key) return;
    onUpdate(key, coerce(newValue));
    setNewKey('');
    setNewValue('');
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Advanced (Custom Properties)</div>
      <p style={{ fontSize: '11px', opacity: 0.6, margin: '0 0 8px' }}>
        Add any openHASP style property by name, including part/state-suffixed variants
        (e.g. bg_color10, text_color01, scale_end_color).
      </p>
      {customEntries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
          <input type="text" value={key} disabled style={{ ...inputStyle, flex: '0 0 40%', opacity: 0.7 }} />
          <input
            type="text"
            value={String(value)}
            onChange={e => onUpdate(key, coerce(e.target.value))}
            style={{ ...inputStyle, flex: 1 }}
          />
          <span
            onClick={() => onUpdate(key, undefined)}
            title="Remove property"
            style={{ cursor: 'pointer', opacity: 0.6, fontSize: '14px', padding: '0 4px' }}
          >
            ×
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          type="text"
          placeholder="property name"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          style={{ ...inputStyle, flex: '0 0 40%' }}
        />
        <input
          type="text"
          placeholder="value"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleAdd}
          title="Add property"
          style={{
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            borderRadius: '2px',
            padding: '0 10px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const { pages, currentPageId, updateWidget, updatePage, deleteWidget, deleteWidgets, canvasWidth, canvasHeight } = useEditorStore();
  const { selectedWidgetIds, clearSelection } = useSelectionStore();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [templateEditorKey, setTemplateEditorKey] = useState<string | null>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  const currentPage = pages.find(p => p.id === currentPageId);
  const selectedId = selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  const widget = selectedId !== null ? currentPage?.widgets.find(w => w.id === selectedId) : null;

  const deleteBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      title="Delete selected widget(s)"
      style={{
        marginTop: '8px',
        width: '100%',
        padding: '5px 0',
        background: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
        color: 'var(--vscode-errorForeground, #f48771)',
        border: '1px solid var(--vscode-inputValidation-errorBorder, #be1100)',
        borderRadius: '3px',
        fontSize: '12px',
        cursor: 'pointer',
      }}
    >
      🗑 {label}
    </button>
  );

  if (selectedWidgetIds.length > 1) {
    return (
      <div style={{ padding: '12px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          Properties
        </h3>
        <p style={{ fontSize: '12px', opacity: 0.6 }}>
          {selectedWidgetIds.length} widgets selected
        </p>
        {deleteBtn(`Delete ${selectedWidgetIds.length} widgets`, () => {
          deleteWidgets(currentPageId, selectedWidgetIds);
          clearSelection();
        })}
      </div>
    );
  }

  if (!widget) {
    // Show page-level properties when no widget is selected
    return (
      <div style={{ padding: '12px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          Properties
        </h3>
        {currentPage ? (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Page</div>
            {isOverlayPage(currentPage) && (
              <p style={{ fontSize: '11px', opacity: 0.7, margin: '0 0 10px' }}>
                Overlay page — its widgets are shown on top of every other page.
              </p>
            )}
            <Field
              label="Name"
              type="text"
              value={currentPage.name ?? ''}
              onChange={v => updatePage(currentPageId, { name: v || undefined })}
            />
            <div style={{ height: '8px' }} />
            <Field
              label="Comment / Description"
              type="textarea"
              value={currentPage.comment ?? ''}
              onChange={v => updatePage(currentPageId, { comment: v || undefined })}
            />
          </div>
        ) : (
          <p style={{ fontSize: '12px', opacity: 0.6 }}>Select a widget to edit its properties</p>
        )}
      </div>
    );
  }

  const update = (key: keyof Widget, value: any) => {
    updateWidget(currentPageId, widget.id, { [key]: value });
  };

  // --- Per-property Jinja templates (stored in haBinding.propertyTemplates) ---------------
  const propTemplates = widget.haBinding?.propertyTemplates ?? {};

  const setPropTemplate = (key: string, tpl: string) => {
    const nextTemplates = { ...propTemplates };
    if (tpl.trim()) nextTemplates[key] = tpl; else delete nextTemplates[key];

    const binding = widget.haBinding ?? {};
    const nextBinding = {
      ...binding,
      propertyTemplates: Object.keys(nextTemplates).length ? nextTemplates : undefined,
    };
    const hasAction = !!nextBinding.action && nextBinding.action.kind !== 'none';
    const keepBinding =
      nextBinding.displayEntityId || nextBinding.displayTemplate || nextBinding.actionEntityId ||
      hasAction || (nextBinding.propertyTemplates && Object.keys(nextBinding.propertyTemplates).length);
    update('haBinding', keepBinding ? nextBinding : undefined);
  };

  const templateProps = (key: string) => ({
    propKey: key,
    template: propTemplates[key],
    onOpenTemplate: () => setTemplateEditorKey(key),
    onClearTemplate: () => setPropTemplate(key, ''),
  });

  const updateParent = (newParentId: number | undefined) => {
    if (!currentPage) return;
    // Maintain absolute position when reparenting
    const absRect = getWidgetAbsoluteRect(widget.id, currentPage.widgets);
    if (!absRect) return;

    let newX: number, newY: number;
    if (newParentId !== undefined) {
      const parentRect = getWidgetAbsoluteRect(newParentId, currentPage.widgets);
      const parentWidget = currentPage.widgets.find(w => w.id === newParentId);
      if (!parentRect || !parentWidget) return;
      newX = Math.max(0, Math.min((parentWidget.w ?? 100) - (widget.w ?? 100), absRect.x - parentRect.x));
      newY = Math.max(0, Math.min((parentWidget.h ?? 30) - (widget.h ?? 30), absRect.y - parentRect.y));
    } else {
      newX = absRect.x;
      newY = absRect.y;
    }
    updateWidget(currentPageId, widget.id, { parentid: newParentId, x: newX, y: newY });
  };

  const hasText = ['btn', 'button', 'label', 'checkbox', 'textarea', 'qrcode'].includes(widget.obj);
  const hasImage = ['image', 'img', 'animimage', 'imgbtn'].includes(widget.obj);

  // Widget-specific property sections from config (overrides generic Value/Options)
  const widgetSections = WIDGET_PROPS[widget.obj] ?? [];

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          {widget.obj} #{widget.id}
        </h3>
        <button
          onClick={() => { deleteWidget(currentPageId, widget.id); clearSelection(); }}
          title="Delete widget (Delete)"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--vscode-errorForeground, #f48771)',
            cursor: 'pointer',
            fontSize: '15px',
            padding: '2px 4px',
            lineHeight: 1,
            borderRadius: '3px',
          }}
        >
          🗑
        </button>
      </div>

      {/* Identity */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Identity</div>
        <Field label="Name" type="text" value={widget.name ?? ''} onChange={v => update('name', v || undefined)} />
        <div style={{ height: '8px' }} />
        <Field label="Description" type="textarea" value={widget.description ?? ''} onChange={v => update('description', v || undefined)} />
      </div>

      <HaBindingSection widget={widget} onUpdate={binding => update('haBinding', binding)} />

      {/* Position & Size */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Layout</div>
        <div style={{ ...fieldStyle, marginBottom: '8px' }}>
          <span style={labelStyle}>Parent</span>
          <select
            value={widget.parentid ?? ''}
            onChange={e => updateParent(e.target.value === '' ? undefined : Number(e.target.value))}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">None (root)</option>
            {currentPage?.widgets
              .filter(w => w.id !== widget.id && !isDescendant(w.id, widget.id, currentPage.widgets))
              .map(w => {
                const desc = w.description?.trim() || w.name?.trim();
                return (
                  <option key={w.id} value={w.id}>
                    #{w.id} ({w.obj}){desc ? ` — ${desc}` : ''}
                  </option>
                );
              })
            }
          </select>
        </div>
        <div style={rowStyle}>
          <Field label="X" type="number" value={widget.x ?? 0} min={0} max={canvasWidth} onChange={v => update('x', v)} {...templateProps('x')} />
          <Field label="Y" type="number" value={widget.y ?? 0} min={0} max={canvasHeight} onChange={v => update('y', v)} {...templateProps('y')} />
        </div>
        <div style={rowStyle}>
          <Field label="W" type="number" value={widget.w ?? 100} min={1} max={canvasWidth} onChange={v => update('w', v)} {...templateProps('w')} />
          <Field label="H" type="number" value={widget.h ?? 30} min={1} max={canvasHeight} onChange={v => update('h', v)} {...templateProps('h')} />
        </div>
        <Field label="Hidden" type="checkbox" value={widget.hidden ?? false} onChange={v => update('hidden', v)} {...templateProps('hidden')} />
      </div>

      {/* Appearance */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Appearance</div>
        <div style={rowStyle}>
          <Field label="BG Color" type="color" value={widget.bg_color ?? '#000000'} onChange={v => update('bg_color', v)} {...templateProps('bg_color')} />
          <Field label="BG Opacity" type="number" value={widget.bg_opa ?? 255} min={0} max={255} onChange={v => update('bg_opa', v)} {...templateProps('bg_opa')} />
        </div>
        <div style={rowStyle}>
          <Field label="BG Gradient Color" type="color" value={widget.bg_grad_color ?? '#000000'} onChange={v => update('bg_grad_color', v)} {...templateProps('bg_grad_color')} />
          <Field
            label="BG Gradient Direction"
            type="select"
            value={BG_GRAD_DIR_OPTIONS[widget.bg_grad_dir ?? 0]}
            options={BG_GRAD_DIR_OPTIONS}
            onChange={v => update('bg_grad_dir', BG_GRAD_DIR_OPTIONS.indexOf(v))}
            {...templateProps('bg_grad_dir')}
          />
        </div>
        <div style={rowStyle}>
          <Field label="Border W" type="number" value={widget.border_width ?? 0} min={0} max={20} onChange={v => update('border_width', v)} {...templateProps('border_width')} />
          <Field label="Border Color" type="color" value={widget.border_color ?? '#000000'} onChange={v => update('border_color', v)} {...templateProps('border_color')} />
        </div>
        <div style={rowStyle}>
          <Field label="Border Opacity" type="number" value={widget.border_opa ?? 255} min={0} max={255} onChange={v => update('border_opa', v)} {...templateProps('border_opa')} />
          <Field
            label="Border Sides"
            type="select"
            value={borderSideLabel(widget.border_side)}
            options={BORDER_SIDE_OPTIONS}
            onChange={v => update('border_side', BORDER_SIDE_VALUES[v])}
            {...templateProps('border_side')}
          />
        </div>
        <div style={rowStyle}>
          <Field label="Radius" type="number" value={widget.radius ?? 0} min={0} max={100} onChange={v => update('radius', v)} {...templateProps('radius')} />
          <Field label="Opacity" type="number" value={widget.opacity ?? 255} min={0} max={255} onChange={v => update('opacity', v)} {...templateProps('opacity')} />
        </div>
      </div>

      {/* Shadow */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Shadow</div>
        <div style={rowStyle}>
          <Field label="Width (blur)" type="number" value={widget.shadow_width ?? 0} min={0} max={100} onChange={v => update('shadow_width', v)} {...templateProps('shadow_width')} />
          <Field label="Spread" type="number" value={widget.shadow_spread ?? 0} min={0} max={100} onChange={v => update('shadow_spread', v)} {...templateProps('shadow_spread')} />
        </div>
        <div style={rowStyle}>
          <Field label="Offset X" type="number" value={widget.shadow_ofs_x ?? 0} onChange={v => update('shadow_ofs_x', v)} {...templateProps('shadow_ofs_x')} />
          <Field label="Offset Y" type="number" value={widget.shadow_ofs_y ?? 0} onChange={v => update('shadow_ofs_y', v)} {...templateProps('shadow_ofs_y')} />
        </div>
        <div style={rowStyle}>
          <Field label="Color" type="color" value={widget.shadow_color ?? '#000000'} onChange={v => update('shadow_color', v)} {...templateProps('shadow_color')} />
          <Field label="Opacity" type="number" value={widget.shadow_opa ?? 255} min={0} max={255} onChange={v => update('shadow_opa', v)} {...templateProps('shadow_opa')} />
        </div>
      </div>

      {/* Outline */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Outline</div>
        <div style={rowStyle}>
          <Field label="Width" type="number" value={widget.outline_width ?? 0} min={0} max={20} onChange={v => update('outline_width', v)} {...templateProps('outline_width')} />
          <Field label="Padding (gap)" type="number" value={widget.outline_pad ?? 0} onChange={v => update('outline_pad', v)} {...templateProps('outline_pad')} />
        </div>
        <div style={rowStyle}>
          <Field label="Color" type="color" value={widget.outline_color ?? '#000000'} onChange={v => update('outline_color', v)} {...templateProps('outline_color')} />
          <Field label="Opacity" type="number" value={widget.outline_opa ?? 255} min={0} max={255} onChange={v => update('outline_opa', v)} {...templateProps('outline_opa')} />
        </div>
      </div>

      {/* Padding */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Padding</div>
        <div style={rowStyle}>
          <Field label="Top" type="number" value={widget.pad_top ?? 0} min={0} onChange={v => update('pad_top', v)} {...templateProps('pad_top')} />
          <Field label="Right" type="number" value={widget.pad_right ?? 0} min={0} onChange={v => update('pad_right', v)} {...templateProps('pad_right')} />
        </div>
        <div style={rowStyle}>
          <Field label="Bottom" type="number" value={widget.pad_bottom ?? 0} min={0} onChange={v => update('pad_bottom', v)} {...templateProps('pad_bottom')} />
          <Field label="Left" type="number" value={widget.pad_left ?? 0} min={0} onChange={v => update('pad_left', v)} {...templateProps('pad_left')} />
        </div>
      </div>

      {/* Text */}
      {hasText && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Text</div>
          {/* Text input with icon picker button */}
          {propTemplates.text !== undefined ? (
            <TemplateValueView
              label="Text"
              template={propTemplates.text}
              onEdit={() => setTemplateEditorKey('text')}
              onClear={() => setPropTemplate('text', '')}
            />
          ) : (
            <div style={{ ...fieldStyle, marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={labelStyle}>Text</span>
                <button
                  type="button"
                  title="Set text with a Jinja template"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setTemplateEditorKey('text')}
                  style={templateToggleStyle}
                >
                  {'{ }'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  value={widget.text ?? ''}
                  onChange={e => update('text', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  ref={iconBtnRef}
                  title="Insert icon"
                  onClick={() => setShowIconPicker(v => !v)}
                  style={{
                    background: showIconPicker ? 'var(--vscode-button-background)' : 'var(--vscode-input-background)',
                    color: showIconPicker ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '2px',
                    padding: '0 6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  ⊕
                </button>
              </div>
            </div>
          )}
          {showIconPicker && (
            <IconPicker
              anchorEl={iconBtnRef.current}
              onSelect={(icon: IconEntry) => {
                update('text', (widget.text ?? '') + icon.lvgl);
                setShowIconPicker(false);
              }}
              onClose={() => setShowIconPicker(false)}
            />
          )}
          <div style={{ height: '8px' }} />
          <div style={rowStyle}>
            <Field label="Text Color" type="color" value={widget.text_color ?? '#000000'} onChange={v => update('text_color', v)} {...templateProps('text_color')} />
            <Field label="Font Size" type="number" value={widget.text_font ?? 14} min={8} max={48} onChange={v => update('text_font', v)} {...templateProps('text_font')} />
          </div>
          <div style={rowStyle}>
            <Field label="Text Opacity" type="number" value={widget.text_opa ?? 255} min={0} max={255} onChange={v => update('text_opa', v)} {...templateProps('text_opa')} />
            <Field
              label="Decoration"
              type="select"
              value={TEXT_DECOR_OPTIONS[widget.text_decor ?? 0] ?? 'none'}
              options={TEXT_DECOR_OPTIONS}
              onChange={v => update('text_decor', TEXT_DECOR_OPTIONS.indexOf(v))}
              {...templateProps('text_decor')}
            />
          </div>
          <div style={rowStyle}>
            <Field label="Letter Spacing" type="number" value={widget.text_letter_space ?? 0} onChange={v => update('text_letter_space', v)} {...templateProps('text_letter_space')} />
            <Field label="Line Spacing" type="number" value={widget.text_line_space ?? 0} onChange={v => update('text_line_space', v)} {...templateProps('text_line_space')} />
          </div>
          <Field
            label="Justify"
            type="select"
            value={widget.justify ?? 'center'}
            options={['left', 'center', 'right', 'auto']}
            onChange={v => update('justify', v)}
            {...templateProps('justify')}
          />
           <Field
            label="Align"
            type="select"
            value={widget.align ?? 'center'}
            options={['start', 'center', 'end', 'auto']}
            onChange={v => update('align', v)}
            {...templateProps('align')}
          />
        </div>
      )}

      {/* Image source (for widgets not covered by widgetSections) */}
      {hasImage && widgetSections.length === 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Image</div>
          <Field label="Source" type="text" value={widget.src ?? ''} onChange={v => update('src', v)} {...templateProps('src')} />
        </div>
      )}

      {/* Widget-specific sections */}
      {widgetSections.map(section => (
        <div key={section.title} style={sectionStyle}>
          <div style={sectionTitleStyle}>{section.title}</div>
          {section.props.map(prop => (
            <div key={prop.key} style={{ marginBottom: '8px' }}>
              <Field
                label={prop.label}
                type={prop.type === 'boolean' ? 'checkbox' : prop.type as any}
                value={widget[prop.key] ?? prop.default}
                options={prop.options}
                min={prop.min}
                max={prop.max}
                onChange={v => update(prop.key as keyof Widget, v)}
                {...templateProps(prop.key)}
              />
            </div>
          ))}
        </div>
      ))}

      <CustomPropertiesEditor widget={widget} widgetSections={widgetSections} onUpdate={update} />

      {templateEditorKey && (
        <HaTemplateEditor
          title={`Property Template — ${templateEditorKey}`}
          initialValue={propTemplates[templateEditorKey] ?? ''}
          onSave={v => setPropTemplate(templateEditorKey, v)}
          onClose={() => setTemplateEditorKey(null)}
        />
      )}
    </div>
  );
};
