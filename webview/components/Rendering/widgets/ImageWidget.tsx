import React from 'react';
import { Widget } from '../../../types';
import { useEditorStore } from '../../../store/useEditorStore';
import './Widgets.css';

interface ImageWidgetProps {
  widget: Widget;
}

export const ImageWidget: React.FC<ImageWidgetProps> = ({ widget }) => {
  const imageUris = useEditorStore(state => state.imageUris);
  const src: string | undefined = widget.src;
  const uri = src ? imageUris[src] : undefined;
  const radius = widget.radius ? `${widget.radius}px` : '0';

  if (!uri) {
    return (
      <div className="widget-image-placeholder" style={{ width: '100%', height: '100%', borderRadius: radius }}>
        <div>🖼</div>
        <div className="widget-image-src">{src || 'No image source'}</div>
      </div>
    );
  }

  const recolorOpa = widget.image_recolor_opa ?? 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        className="widget-image"
        src={uri}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          objectFit: 'fill',
          opacity: (widget.image_opa ?? 255) / 255,
        }}
      />
      {widget.image_recolor && recolorOpa > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            backgroundColor: widget.image_recolor,
            opacity: recolorOpa / 255,
            mixBlendMode: 'color',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
