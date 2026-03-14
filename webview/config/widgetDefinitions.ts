import { WidgetType, Widget } from '../types';

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  category: 'Containers' | 'Controls' | 'Visualization' | 'Selectors' | 'Graphics';
  icon: string;
  defaultProps: Partial<Widget>;
  description: string;
}

export const widgetDefinitions: Record<string, WidgetDefinition> = {
  // Containers
  obj: {
    type: 'obj',
    name: 'Container',
    category: 'Containers',
    icon: '□',
    description: 'Generic container object',
    defaultProps: {
      obj: 'obj',
      x: 10,
      y: 10,
      w: 100,
      h: 100,
      bg_color: '#cccccc',
      radius: 5
    }
  },

  tabview: {
    type: 'tabview',
    name: 'Tab View',
    category: 'Containers',
    icon: '⊟',
    description: 'Tabbed container for organizing content',
    defaultProps: {
      obj: 'tabview',
      x: 10,
      y: 10,
      w: 220,
      h: 200
    }
  },

  // Controls
  btn: {
    type: 'btn',
    name: 'Button',
    category: 'Controls',
    icon: '▭',
    description: 'Clickable button',
    defaultProps: {
      obj: 'btn',
      x: 10,
      y: 10,
      w: 100,
      h: 40,
      text: 'Button',
      bg_color: '#2196F3',
      text_color: '#FFFFFF',
      radius: 5
    }
  },

  switch: {
    type: 'switch',
    name: 'Switch',
    category: 'Controls',
    icon: '⊚',
    description: 'Toggle switch (on/off)',
    defaultProps: {
      obj: 'switch',
      x: 10,
      y: 10,
      w: 60,
      h: 30,
      radius: 15,
      bg_color: '#cccccc'
    }
  },

  slider: {
    type: 'slider',
    name: 'Slider',
    category: 'Controls',
    icon: '▬',
    description: 'Horizontal or vertical slider',
    defaultProps: {
      obj: 'slider',
      x: 10,
      y: 10,
      w: 200,
      h: 20,
      min: 0,
      max: 100,
      val: 50,
      bg_color: '#2196F3'
    }
  },

  checkbox: {
    type: 'checkbox',
    name: 'Checkbox',
    category: 'Controls',
    icon: '☑',
    description: 'Checkbox for selection',
    defaultProps: {
      obj: 'checkbox',
      x: 10,
      y: 10,
      w: 30,
      h: 30,
      bg_color: '#2196F3'
    }
  },

  dropdown: {
    type: 'dropdown',
    name: 'Dropdown',
    category: 'Selectors',
    icon: '▼',
    description: 'Dropdown menu',
    defaultProps: {
      obj: 'dropdown',
      x: 10,
      y: 10,
      w: 150,
      h: 30,
      options: 'Option 1\nOption 2\nOption 3'
    }
  },

  // Visualization
  label: {
    type: 'label',
    name: 'Label',
    category: 'Visualization',
    icon: 'T',
    description: 'Text label',
    defaultProps: {
      obj: 'label',
      x: 10,
      y: 10,
      w: 100,
      h: 30,
      text: 'Label',
      align: 'left',
      text_color: '#000000'
    }
  },

  gauge: {
    type: 'gauge',
    name: 'Gauge',
    category: 'Visualization',
    icon: '◔',
    description: 'Circular gauge meter',
    defaultProps: {
      obj: 'gauge',
      x: 10,
      y: 10,
      w: 150,
      h: 150,
      min: 0,
      max: 100,
      val: 50,
      critical_value: 80,
      label_count: 11,
      line_count: 21
    }
  },

  bar: {
    type: 'bar',
    name: 'Progress Bar',
    category: 'Visualization',
    icon: '▬',
    description: 'Progress bar',
    defaultProps: {
      obj: 'bar',
      x: 10,
      y: 10,
      w: 200,
      h: 20,
      min: 0,
      max: 100,
      val: 50,
      bg_color: '#4CAF50'
    }
  },

  arc: {
    type: 'arc',
    name: 'Arc',
    category: 'Visualization',
    icon: '◜',
    description: 'Circular arc/ring',
    defaultProps: {
      obj: 'arc',
      x: 10,
      y: 10,
      w: 150,
      h: 150,
      min: 0,
      max: 100,
      val: 50,
      start_angle: 135,
      end_angle: 45,
      line_width: 20,
      bg_color: '#2196F3'
    }
  },

  led: {
    type: 'led',
    name: 'LED',
    category: 'Visualization',
    icon: '●',
    description: 'LED indicator',
    defaultProps: {
      obj: 'led',
      x: 10,
      y: 10,
      w: 30,
      h: 30,
      bg_color: '#FF5722'
    }
  },

  spinner: {
    type: 'spinner',
    name: 'Spinner',
    category: 'Visualization',
    icon: '⟳',
    description: 'Loading spinner',
    defaultProps: {
      obj: 'spinner',
      x: 10,
      y: 10,
      w: 50,
      h: 50,
      bg_color: '#2196F3'
    }
  },

  // Graphics
  line: {
    type: 'line',
    name: 'Line',
    category: 'Graphics',
    icon: '/',
    description: 'Line or polyline',
    defaultProps: {
      obj: 'line',
      x: 10,
      y: 10,
      w: 100,
      h: 2,
      bg_color: '#000000'
    }
  },

  image: {
    type: 'image',
    name: 'Image',
    category: 'Graphics',
    icon: '🖼',
    description: 'Display image',
    defaultProps: {
      obj: 'image',
      x: 10,
      y: 10,
      w: 100,
      h: 100,
      src: 'L:/image.png'
    }
  },

  qrcode: {
    type: 'qrcode',
    name: 'QR Code',
    category: 'Graphics',
    icon: '▦',
    description: 'QR code generator',
    defaultProps: {
      obj: 'qrcode',
      x: 10,
      y: 10,
      w: 100,
      h: 100,
      text: 'https://openhasp.com'
    }
  }
};

export const widgetCategories = [
  {
    name: 'Containers',
    widgets: ['obj', 'tabview']
  },
  {
    name: 'Controls',
    widgets: ['btn', 'switch', 'slider', 'checkbox']
  },
  {
    name: 'Visualization',
    widgets: ['label', 'gauge', 'bar', 'arc', 'led', 'spinner']
  },
  {
    name: 'Selectors',
    widgets: ['dropdown']
  },
  {
    name: 'Graphics',
    widgets: ['line', 'image', 'qrcode']
  }
];

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return widgetDefinitions[type];
}

export function getNextWidgetId(widgets: Widget[]): number {
  if (widgets.length === 0) return 1;
  return Math.max(...widgets.map(w => w.id)) + 1;
}
