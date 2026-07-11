import React from 'react';
import { Widget } from '../../../types';
import { colorWithOpacity } from '../../../utils/color';
import './Widgets.css';

interface BarWidgetProps {
  widget: Widget;
}

export const BarWidget: React.FC<BarWidgetProps> = ({ widget }) => {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  const val = widget.val ?? 50;
  const percentage = ((val - min) / (max - min)) * 100;

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: widget.radius || 0,
    overflow: 'hidden',
    position: 'relative'
  };

  const barStyle: React.CSSProperties = {
    width: `${percentage}%`,
    height: '100%',
    backgroundColor: colorWithOpacity(widget.bg_color, widget.bg_opa, '#4CAF50'),
    transition: 'width 0.3s'
  };

  return (
    <div className="widget-bar" style={containerStyle}>
      <div style={barStyle} />
    </div>
  );
};
