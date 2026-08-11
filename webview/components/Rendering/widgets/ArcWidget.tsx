import React from 'react';
import { Widget } from '../../../types';
import { colorWithOpacity } from '../../../utils/color';
import './Widgets.css';

interface ArcWidgetProps {
  widget: Widget;
}

const DEFAULT_TRACK = '#3a3a3a';
const DEFAULT_INDICATOR = '#2196f3';
const DEFAULT_KNOB = '#ffffff';

type ArcMode = 'normal' | 'symmetrical' | 'reverse';

/** openHASP accepts either the string `mode` or the numeric LVGL `type` (0/1/2). */
function arcMode(widget: Widget): ArcMode {
  const raw = widget.mode ?? widget.type;
  if (typeof raw === 'number') return raw === 1 ? 'symmetrical' : raw === 2 ? 'reverse' : 'normal';
  if (raw === 'symmetrical' || raw === 'reverse') return raw;
  return 'normal';
}

/** LVGL angles: 0° = 3 o'clock, growing clockwise — same convention as SVG's y-down coordinates. */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Path for a clockwise arc segment from `a0` to `a1` (degrees, a1 >= a0). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const sweep = a1 - a0;
  if (r <= 0 || sweep <= 0.01) return '';
  if (sweep >= 359.99) {
    // A single elliptical-arc command can't close a full circle; draw it as two halves.
    const start = polar(cx, cy, r, a0);
    const half = polar(cx, cy, r, a0 + 180);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${half.x} ${half.y} A ${r} ${r} 0 1 1 ${start.x} ${start.y}`;
  }
  const start = polar(cx, cy, r, a0);
  const end = polar(cx, cy, r, a1);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
}

export const ArcWidget: React.FC<ArcWidgetProps> = ({ widget }) => {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  // LVGL clamps an unset value to the range minimum rather than parking it mid-scale.
  const val = widget.val ?? min;
  const ratio = max === min ? 0 : Math.max(0, Math.min(1, (val - min) / (max - min)));

  // The wrapper already subtracts padding, so work in the content box's own pixels and let
  // the viewBox carry them through unchanged — line widths are device pixels, not percentages.
  const boxW = Math.max(1, (widget.w ?? 150) - (widget.pad_left ?? 0) - (widget.pad_right ?? 0));
  const boxH = Math.max(1, (widget.h ?? 150) - (widget.pad_top ?? 0) - (widget.pad_bottom ?? 0));

  // LVGL sizes the arc to the shorter side and anchors its circle at the top-left of the
  // content box (lv_arc design: centre = coords.x1 + r, coords.y1 + r), so a non-square arc
  // is not centred on the object.
  const radius = Math.min(boxW, boxH) / 2;
  const cx = radius;
  const cy = radius;

  const trackWidth = Math.min(widget.line_width ?? 20, radius * 2);
  const indicWidth = Math.min(widget.line_width10 ?? trackWidth, radius * 2);
  // Both parts share the object's outer radius and are drawn inwards from it.
  const trackRadius = radius - trackWidth / 2;
  const indicRadius = radius - indicWidth / 2;

  const rotation = widget.rotation ?? 0;
  const bgStart = (widget.start_angle ?? 135) + rotation;
  const rawEnd = (widget.end_angle ?? 45) + rotation;
  const bgEnd = rawEnd < bgStart ? rawEnd + 360 : rawEnd;
  const span = bgEnd - bgStart;

  // Indicator extent, mirroring lv_arc's value_update() for each arc type.
  const valueAngle = bgStart + ratio * span;
  const midAngle = bgStart + span / 2;
  const mode = arcMode(widget);
  let indicStart = bgStart;
  let indicEnd = valueAngle;
  if (mode === 'reverse') {
    indicStart = valueAngle;
    indicEnd = bgEnd;
  } else if (mode === 'symmetrical') {
    indicStart = ratio < 0.5 ? valueAngle : midAngle;
    indicEnd = ratio < 0.5 ? midAngle : valueAngle;
  }

  const trackColor = colorWithOpacity(widget.line_color, widget.line_opa, DEFAULT_TRACK);
  // bg_color10 is accepted as a fallback for designs authored before the indicator moved to
  // the line style properties that LVGL actually paints the arc with.
  const indicColor = colorWithOpacity(
    widget.line_color10 ?? widget.bg_color10,
    widget.line_opa10,
    DEFAULT_INDICATOR
  );
  // The knob is a small rect whose border draws inward; at openHASP's usual border_width20 the
  // border swallows the whole knob, so a bare border_color20 is what the device shows.
  const knobColor = widget.bg_color20
    ? colorWithOpacity(widget.bg_color20, widget.bg_opa20, DEFAULT_KNOB)
    : colorWithOpacity(widget.border_color20, widget.border_opa20, DEFAULT_KNOB);
  const trackCap = widget.line_rounded === false || widget.line_rounded === 0 ? 'butt' : 'round';
  const indicCap = widget.line_rounded10 === false || widget.line_rounded10 === 0 ? 'butt' : 'round';

  const knobAngle = mode === 'reverse' ? indicStart : indicEnd;
  const knob = polar(cx, cy, indicRadius, knobAngle);

  // LVGL leaves bg_opa transparent unless a style sets it, so an arc carrying only a bg_color
  // paints no background on the device — the object fill appears only once bg_opa is raised.
  const background: React.CSSProperties =
    (widget.bg_opa ?? 0) > 0
      ? { backgroundColor: colorWithOpacity(widget.bg_color, widget.bg_opa, '#000000'), borderRadius: widget.radius }
      : {};

  return (
    <div className="widget-arc" style={{ width: '100%', height: '100%', ...background }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${boxW} ${boxH}`} preserveAspectRatio="none">
        {span > 0 && (
          <path
            d={arcPath(cx, cy, trackRadius, bgStart, bgEnd)}
            fill="none"
            stroke={trackColor}
            strokeWidth={trackWidth}
            strokeLinecap={trackCap}
          />
        )}

        {indicEnd > indicStart && (
          <path
            d={arcPath(cx, cy, indicRadius, indicStart, indicEnd)}
            fill="none"
            stroke={indicColor}
            strokeWidth={indicWidth}
            strokeLinecap={indicCap}
          />
        )}

        {widget.adjustable && (
          <circle cx={knob.x} cy={knob.y} r={Math.max(2, indicWidth / 2)} fill={knobColor} />
        )}
      </svg>
    </div>
  );
};
