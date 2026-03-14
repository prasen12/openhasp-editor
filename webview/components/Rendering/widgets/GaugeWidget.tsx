import React from 'react';
import { Widget } from '../../../types';
import './Widgets.css';

interface GaugeWidgetProps {
  widget: Widget;
}

export const GaugeWidget: React.FC<GaugeWidgetProps> = ({ widget }) => {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  const val = widget.val ?? 50;
  const percentage = ((val - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 270 - 135; // -135 to +135 degrees

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div className="widget-gauge" style={containerStyle}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Background arc */}
        <path
          d="M 15 85 A 40 40 0 1 1 85 85"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d="M 15 85 A 40 40 0 1 1 85 85"
          fill="none"
          stroke={widget.line_color || '#2196F3'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 188} 188`}
        />

        {/* Center value text */}
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
        >
          {Math.round(val)}
        </text>
      </svg>
    </div>
  );
};
