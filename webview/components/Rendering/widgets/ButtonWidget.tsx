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
  };

  return (
    <div className="widget-button" style={style}>
      {translateLVGLToMDI(decodeUnicodeEscapes(widget.text || 'Button'))}
    </div>
  );
};
