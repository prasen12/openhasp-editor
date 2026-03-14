import React from 'react';
import { Widget } from '../../../types';
import './Widgets.css';

interface ArcWidgetProps {
  widget: Widget;
}

export const ArcWidget: React.FC<ArcWidgetProps> = ({ widget }) => {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  const val = widget.val ?? 50;
  const percentage = ((val - min) / (max - min)) * 100;
  const lineWidth = widget.line_width ?? 20;

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference; // 270 degree arc
  const filledLength = (percentage / 100) * arcLength;

  return (
    <div className="widget-arc" style={containerStyle}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Background arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={lineWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={-circumference / 8}
          transform="rotate(135 50 50)"
        />

        {/* Value arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={widget.line_color || widget.bg_color || '#2196F3'}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${circumference}`}
          strokeDashoffset={-circumference / 8}
          transform="rotate(135 50 50)"
        />
      </svg>
    </div>
  );
};
