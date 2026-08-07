import React from 'react';
import { Widget } from '../../../types';
import { decodeUnicodeEscapes, translateLVGLToMDI } from '../../../utils/widgetHierarchy';
import { getTextStyleExtras, getBackgroundStyle } from '../../../utils/styleProps';
// @ts-ignore: CSS module declaration is not available in this workspace
import './Widgets.css';

interface ButtonWidgetProps {
  widget: Widget;
}

export const ButtonWidget: React.FC<ButtonWidgetProps> = ({ widget }) => {
  // openHASP draws a toggled button as checked, and that state lives in `val` — which is also
  // what an entity binding drives (1 if the entity is on). Reflect it, or a bound button would
  // look identical whatever the entity does.
  const isOn = widget.val === 1 || widget.val === true;

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    ...getBackgroundStyle(widget, '#2196F3'),
    color: widget.text_color || '#FFFFFF',
    borderRadius: widget.radius ? `${widget.radius}px` : '0',
    display: 'flex',
    alignItems: widget.align || 'center',
    justifyContent: widget.justify || 'center',
    fontSize: `${widget.text_font ?? 14}px`,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: "'openHASP Icons', sans-serif",
    ...getTextStyleExtras(widget),
    // Checked look: keep the designed colors, just brighten and ring them.
    ...(isOn ? { filter: 'brightness(1.25)', boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.85)' } : {}),
  };

  return (
    <div className="widget-button" style={style}>
      {translateLVGLToMDI(decodeUnicodeEscapes((widget.text ?? '') === '' ? 'Button' : widget.text))}
    </div>
  );
};
