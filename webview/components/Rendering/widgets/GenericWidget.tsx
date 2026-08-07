import React from 'react';
import { Widget } from '../../../types';
import { getBackgroundStyle } from '../../../utils/styleProps';
import { decodeUnicodeEscapes, translateLVGLToMDI } from '../../../utils/widgetHierarchy';
import './Widgets.css';

interface GenericWidgetProps {
  widget: Widget;
}

export const GenericWidget: React.FC<GenericWidgetProps> = ({ widget }) => {
  // Widgets without a dedicated renderer (checkbox, led, roller…) still carry a text or val —
  // including whatever the live Home Assistant preview resolved — so show it rather than nothing.
  const text = typeof widget.text === 'string' && widget.text !== ''
    ? translateLVGLToMDI(decodeUnicodeEscapes(widget.text))
    : undefined;
  const value = text ?? (widget.val !== undefined && widget.val !== null ? String(widget.val) : undefined);

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    ...getBackgroundStyle(widget, '#f0f0f0'),
    border: `1px dashed #999`,
    borderRadius: widget.radius || 0,
    display: 'flex',
    alignItems: widget.align === 'center' ? 'center' : widget.align === 'right' ? 'flex-end' : 'flex-start',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#666',
    textAlign: 'center',
    padding: '4px'
  };

  return (
    <div className="widget-generic" style={style}>
      <div>
        <div>{widget.obj}</div>
        {value !== undefined && <div style={{ fontSize: '11px', color: '#222' }}>{value}</div>}
        {widget.id && <div style={{ fontSize: '9px', opacity: 0.6 }}>ID: {widget.id}</div>}
      </div>
    </div>
  );
};
