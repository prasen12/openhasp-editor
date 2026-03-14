import React from 'react';
import { Widget } from '../../../types';
import './Widgets.css';

interface GenericWidgetProps {
  widget: Widget;
}

export const GenericWidget: React.FC<GenericWidgetProps> = ({ widget }) => {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: widget.bg_color || '#f0f0f0',
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
        {widget.id && <div style={{ fontSize: '9px', opacity: 0.6 }}>ID: {widget.id}</div>}
      </div>
    </div>
  );
};
