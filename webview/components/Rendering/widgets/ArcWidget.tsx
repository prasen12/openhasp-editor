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
  widget.radius = widget.radius ?? 40; // Set default radius if not provided
  const radius = widget.radius;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference; // 270 degree arc
  const filledLength = (percentage / 100) * arcLength;

  return (
    <div className="widget-arc" style={containerStyle}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Background arc */}
        <circle
          cx="100"
          cy="50"
          r={radius}
          fill="none"
          stroke={widget.line_color || widget.bg_color || '#2196F3'}
          strokeWidth={lineWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={-circumference / 8}
          transform="rotate(135 50 50)"
        />

        {/* Value arc */}
        <circle
          cx="100"
          cy="50"
          r={radius}
          fill="#e1400f"
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
