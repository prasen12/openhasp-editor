import React from 'react';
import { Widget } from '../../../types';
import { colorWithOpacity } from '../../../utils/color';
import './Widgets.css';

interface SwitchWidgetProps {
  widget: Widget;
}

export const SwitchWidget: React.FC<SwitchWidgetProps> = ({ widget }) => {
  const isOn = widget.val === 1 || widget.val === true;

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: isOn ? colorWithOpacity(widget.bg_color, widget.bg_opa, '#4CAF50') : '#cccccc',
    borderRadius: widget.radius || 15,
    position: 'relative',
    transition: 'background-color 0.2s'
  };

  const knobStyle: React.CSSProperties = {
    position: 'absolute',
    left: isOn ? 'calc(100% - 24px - 2px)' : '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    backgroundColor: 'white',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'left 0.2s'
  };

  return (
    <div className="widget-switch" style={style}>
      <div style={knobStyle} />
    </div>
  );
};
