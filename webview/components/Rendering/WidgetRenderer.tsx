import React from 'react';
import { Widget } from '../../types';
import { LabelWidget } from './widgets/LabelWidget';
import { ButtonWidget } from './widgets/ButtonWidget';
import { SliderWidget } from './widgets/SliderWidget';
import { SwitchWidget } from './widgets/SwitchWidget';
import { GaugeWidget } from './widgets/GaugeWidget';
import { BarWidget } from './widgets/BarWidget';
import { ArcWidget } from './widgets/ArcWidget';
import { GenericWidget } from './widgets/GenericWidget';

interface WidgetRendererProps {
  widget: Widget;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  switch (widget.obj) {
    case 'label':
      return <LabelWidget widget={widget} />;
    case 'btn':
    case 'button':
      return <ButtonWidget widget={widget} />;
    case 'slider':
      return <SliderWidget widget={widget} />;
    case 'switch':
      return <SwitchWidget widget={widget} />;
    case 'gauge':
      return <GaugeWidget widget={widget} />;
    case 'bar':
      return <BarWidget widget={widget} />;
    case 'arc':
      return <ArcWidget widget={widget} />;
    default:
      return <GenericWidget widget={widget} />;
  }
};
