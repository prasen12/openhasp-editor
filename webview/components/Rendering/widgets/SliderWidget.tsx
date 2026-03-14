import React from 'react';
import { Widget } from '../../../types';
import './Widgets.css';

interface SliderWidgetProps {
  widget: Widget;
}

export const SliderWidget: React.FC<SliderWidgetProps> = ({ widget }) => {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  const val = widget.val ?? 50;
  const percentage = ((val - min) / (max - min)) * 100;

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px'
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '6px',
    backgroundColor: '#cccccc',
    borderRadius: '3px',
    overflow: 'hidden'
  };

  const indicatorStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: widget.bg_color || '#2196F3',
    borderRadius: '3px'
  };

  const knobStyle: React.CSSProperties = {
    position: 'absolute',
    left: `calc(${percentage}% - 8px)`,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    backgroundColor: widget.bg_color || '#2196F3',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  };

  return (
    <div className="widget-slider" style={containerStyle}>
      <div style={trackStyle}>
        <div style={indicatorStyle} />
        <div style={knobStyle} />
      </div>
    </div>
  );
};
