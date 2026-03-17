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
  const criticalValue = widget.critical_value ?? 80;
  const labelCount = Math.max(2, widget.label_count ?? 6);
  const lineCount = Math.max(2, widget.line_count ?? 21);
  const sweepAngle = widget.angle ?? 270;
  const needleColor = widget.bg_color10 ?? '#ffffff';
  const needleLengthPct = widget.needle_length ?? 0;

  const cx = 50;
  const cy = 50;
  const outerRadius = 44;
  const tickOuterRadius = outerRadius - 1;
  const majorTickLen = 5;
  const minorTickLen = 3;
  const labelRadius = tickOuterRadius - majorTickLen - 4;
  const needleRadius = needleLengthPct > 0
    ? (needleLengthPct / 100) * outerRadius
    : outerRadius * 0.72;

  // SVG angle 0° = right (3 o'clock), clockwise.
  // The gap is centered at SVG 90° (6 o'clock / bottom).
  // startAngle is where min value sits (lower-left for 270°).
  const startAngle = 90 + (360 - sweepAngle) / 2;

  const valueToAngle = (v: number) => {
    const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
    return startAngle + t * sweepAngle;
  };

  const polarToCartesian = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  // Determine tick spacing: ticks at each step from 0 to lineCount-1
  // Major ticks aligned with labels
  const majorStep = (lineCount - 1) / (labelCount - 1);

  const ticks = Array.from({ length: lineCount }, (_, i) => {
    const t = i / (lineCount - 1);
    const angle = startAngle + t * sweepAngle;
    const tickValue = min + t * (max - min);
    const isMajor = Math.abs(Math.round(i / majorStep) * majorStep - i) < 0.01;
    const isCritical = tickValue >= criticalValue;
    const len = isMajor ? majorTickLen : minorTickLen;
    const outerPt = polarToCartesian(angle, tickOuterRadius);
    const innerPt = polarToCartesian(angle, tickOuterRadius - len);
    return (
      <line
        key={i}
        x1={outerPt.x} y1={outerPt.y}
        x2={innerPt.x} y2={innerPt.y}
        stroke={isCritical ? '#ff4444' : '#aaaaaa'}
        strokeWidth={isMajor ? 0.9 : 0.5}
        strokeLinecap="round"
      />
    );
  });

  const labels = Array.from({ length: labelCount }, (_, i) => {
    const t = i / (labelCount - 1);
    const angle = startAngle + t * sweepAngle;
    const value = Math.round(min + t * (max - min));
    const pt = polarToCartesian(angle, labelRadius);
    return (
      <text
        key={i}
        x={pt.x} y={pt.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="5"
        fill="#cccccc"
      >
        {value}
      </text>
    );
  });

  const needleAngle = valueToAngle(val);
  const needleEnd = polarToCartesian(needleAngle, needleRadius);
  // Small tail in opposite direction
  const tailEnd = polarToCartesian(needleAngle + 180, outerRadius * 0.15);

  return (
    <div className="widget-gauge" style={{ width: '100%', height: '100%' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={outerRadius} fill="#3a3a3a" />
        {/* Rim */}
        <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke="#555555" strokeWidth="1" />

        {/* Tick marks */}
        {ticks}

        {/* Labels */}
        {labels}

        {/* Needle */}
        <line
          x1={tailEnd.x} y1={tailEnd.y}
          x2={needleEnd.x} y2={needleEnd.y}
          stroke={needleColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Center pivot */}
        <circle cx={cx} cy={cy} r={2.5} fill="#888888" />
        <circle cx={cx} cy={cy} r={1.2} fill="#cccccc" />
      </svg>
    </div>
  );
};
