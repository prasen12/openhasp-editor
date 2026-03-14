import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Widget } from '../../types';
import { getWidgetAbsoluteRect, isDescendant } from '../../utils/widgetHierarchy';
import { IconPicker } from '../IconPicker/IconPicker';
import { IconEntry } from '../../config/iconData';
import { WIDGET_PROPS } from '../../config/widgetProperties';

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

interface FieldProps {
  label: string;
  type?: 'text' | 'number' | 'color' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (val: any) => void;
  options?: string[];
  min?: number;
  max?: number;
}

const Field: React.FC<FieldProps> = ({ label, type = 'text', value, onChange, options, min, max }) => {
  if (type === 'checkbox') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          style={{ margin: 0 }}
        />
        <span style={{ fontSize: '12px' }}>{label}</span>
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div style={{ ...fieldStyle, marginBottom: '8px' }}>
        <span style={labelStyle}>{label}</span>
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
        <span style={labelStyle}>{label}</span>
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
      <span style={labelStyle}>{label}</span>
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

export const PropertiesPanel: React.FC = () => {
  const { pages, currentPageId, updateWidget, canvasWidth, canvasHeight } = useEditorStore();
  const { selectedWidgetIds } = useSelectionStore();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  const currentPage = pages.find(p => p.id === currentPageId);
  const selectedId = selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  const widget = selectedId !== null ? currentPage?.widgets.find(w => w.id === selectedId) : null;

  if (selectedWidgetIds.length > 1) {
    return (
      <div style={{ padding: '12px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          Properties
        </h3>
        <p style={{ fontSize: '12px', opacity: 0.6 }}>
          {selectedWidgetIds.length} widgets selected
        </p>
      </div>
    );
  }

  if (!widget) {
    return (
      <div style={{ padding: '12px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
          Properties
        </h3>
        <p style={{ fontSize: '12px', opacity: 0.6 }}>
          Select a widget to edit its properties
        </p>
      </div>
    );
  }

  const update = (key: keyof Widget, value: any) => {
    updateWidget(currentPageId, widget.id, { [key]: value });
  };

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
      <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>
        {widget.obj} #{widget.id}
      </h3>

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
              .map(w => (
                <option key={w.id} value={w.id}>#{w.id} ({w.obj})</option>
              ))
            }
          </select>
        </div>
        <div style={rowStyle}>
          <Field label="X" type="number" value={widget.x ?? 0} min={0} max={canvasWidth} onChange={v => update('x', v)} />
          <Field label="Y" type="number" value={widget.y ?? 0} min={0} max={canvasHeight} onChange={v => update('y', v)} />
        </div>
        <div style={rowStyle}>
          <Field label="W" type="number" value={widget.w ?? 100} min={1} max={canvasWidth} onChange={v => update('w', v)} />
          <Field label="H" type="number" value={widget.h ?? 30} min={1} max={canvasHeight} onChange={v => update('h', v)} />
        </div>
        <Field label="Hidden" type="checkbox" value={widget.hidden ?? false} onChange={v => update('hidden', v)} />
      </div>

      {/* Appearance */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Appearance</div>
        <div style={rowStyle}>
          <Field label="BG Color" type="color" value={widget.bg_color ?? '#000000'} onChange={v => update('bg_color', v)} />
          <Field label="BG Opacity" type="number" value={widget.bg_opa ?? 255} min={0} max={255} onChange={v => update('bg_opa', v)} />
        </div>
        <div style={rowStyle}>
          <Field label="Border W" type="number" value={widget.border_width ?? 0} min={0} max={20} onChange={v => update('border_width', v)} />
          <Field label="Border Color" type="color" value={widget.border_color ?? '#000000'} onChange={v => update('border_color', v)} />
        </div>
        <div style={rowStyle}>
          <Field label="Radius" type="number" value={widget.radius ?? 0} min={0} max={100} onChange={v => update('radius', v)} />
          <Field label="Opacity" type="number" value={widget.opacity ?? 255} min={0} max={255} onChange={v => update('opacity', v)} />
        </div>
      </div>

      {/* Text */}
      {hasText && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Text</div>
          {/* Text input with icon picker button */}
          <div style={{ ...fieldStyle, marginBottom: '8px' }}>
            <span style={labelStyle}>Text</span>
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
            <Field label="Text Color" type="color" value={widget.text_color ?? '#000000'} onChange={v => update('text_color', v)} />
            <Field label="Font Size" type="number" value={widget.text_font ?? 14} min={8} max={48} onChange={v => update('text_font', v)} />
          </div>
          <Field
            label="Justify"
            type="select"
            value={widget.justify ?? 'center'}
            options={['left', 'center', 'right', 'auto']}
            onChange={v => update('justify', v)}
          />
           <Field
            label="Align"
            type="select"
            value={widget.align ?? 'center'}
            options={['start', 'center', 'end', 'auto']}
            onChange={v => update('align', v)}
          />
        </div>
      )}

      {/* Image source (for widgets not covered by widgetSections) */}
      {hasImage && widgetSections.length === 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Image</div>
          <Field label="Source" type="text" value={widget.src ?? ''} onChange={v => update('src', v)} />
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
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
