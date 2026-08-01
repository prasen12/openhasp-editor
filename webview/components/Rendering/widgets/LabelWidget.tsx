import React from 'react';
import { Widget } from '../../../types';
import { decodeUnicodeEscapes, translateLVGLToMDI } from '../../../utils/widgetHierarchy';
import { getTextStyleExtras, getBackgroundStyle } from '../../../utils/styleProps';
import './Widgets.css';

interface LabelWidgetProps {
  widget: Widget;
}

export const LabelWidget: React.FC<LabelWidgetProps> = ({ widget }) => {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: widget.text_color || '#000000',
    fontSize: `${widget.text_font ?? 16}px`,
    textAlign: (widget.align as any) || 'left',
    display: 'flex',
    alignItems: widget.aign || 'center',
    justifyContent: widget.justify || 'center',
    padding: '2px 4px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    borderRadius: widget.radius ? `${widget.radius}px` : '0',
    fontFamily: "'openHASP Icons', sans-serif",
    ...getBackgroundStyle(widget, 'transparent'),
    ...getTextStyleExtras(widget),
  };

  return (
    <div className="widget-label" style={style}>
      {translateLVGLToMDI(decodeUnicodeEscapes((widget.text ?? '') === '' ? 'Label' : widget.text))}
    </div>
  );
};

