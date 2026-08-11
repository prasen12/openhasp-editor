import { WidgetType } from '../types';

export interface PropDef {
  key: string;
  label: string;
  type: 'number' | 'color' | 'boolean' | 'select' | 'text' | 'textarea';
  default?: any;
  options?: string[];
  min?: number;
  max?: number;
}

export interface PropSection {
  title: string;
  props: PropDef[];
}

/** Widget-specific property sections, keyed by widget type. */
export const WIDGET_PROPS: Partial<Record<WidgetType, PropSection[]>> = {

  // ── btn / button ──────────────────────────────────────────────────────────
  btn: [
    {
      title: 'Button',
      props: [
        { key: 'toggle', label: 'Toggle mode', type: 'boolean', default: false },
        { key: 'val', label: 'State (1 = pressed)', type: 'number', default: 0, min: 0, max: 1 },
      ],
    },
  ],
  button: [
    {
      title: 'Button',
      props: [
        { key: 'toggle', label: 'Toggle mode', type: 'boolean', default: false },
        { key: 'val', label: 'State (1 = pressed)', type: 'number', default: 0, min: 0, max: 1 },
      ],
    },
  ],

  // ── switch ────────────────────────────────────────────────────────────────
  switch: [
    {
      title: 'Switch',
      props: [
        { key: 'val', label: 'State (1 = on)', type: 'number', default: 0, min: 0, max: 1 },
        { key: 'bg_color10', label: 'Indicator Color', type: 'color', default: '#00e676' },
        { key: 'bg_color20', label: 'Knob Color', type: 'color', default: '#ffffff' },
        { key: 'radius20', label: 'Knob Radius', type: 'number', default: 14, min: 0, max: 100 },
      ],
    },
  ],

  // ── slider ────────────────────────────────────────────────────────────────
  slider: [
    {
      title: 'Slider',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 50 },
        { key: 'min', label: 'Min', type: 'number', default: 0 },
        { key: 'max', label: 'Max', type: 'number', default: 100 },
        { key: 'bg_color10', label: 'Indicator Color', type: 'color', default: '#2196f3' },
        { key: 'bg_color20', label: 'Knob Color', type: 'color', default: '#2196f3' },
        { key: 'radius20', label: 'Knob Radius', type: 'number', default: 10, min: 0, max: 100 },
      ],
    },
  ],

  // ── checkbox ──────────────────────────────────────────────────────────────
  checkbox: [
    {
      title: 'Checkbox',
      props: [
        { key: 'val', label: 'Checked (1 = checked)', type: 'number', default: 0, min: 0, max: 1 },
        { key: 'bg_color10', label: 'Checked Color', type: 'color', default: '#2196f3' },
      ],
    },
  ],

  // ── label ─────────────────────────────────────────────────────────────────
  label: [
    {
      title: 'Label',
      props: [
        {
          key: 'mode',
          label: 'Long Mode',
          type: 'select',
          default: 'wrap',
          options: ['wrap', 'dots', 'scroll', 'scroll_circular', 'crop'],
        },
        { key: 'color_recolor', label: 'Color Recolor', type: 'boolean', default: false },
      ],
    },
  ],

  // ── bar ───────────────────────────────────────────────────────────────────
  bar: [
    {
      title: 'Bar',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 50 },
        { key: 'min', label: 'Min', type: 'number', default: 0 },
        { key: 'max', label: 'Max', type: 'number', default: 100 },
        { key: 'start_value', label: 'Start Value', type: 'number', default: 0 },
        { key: 'bg_color10', label: 'Indicator Color', type: 'color', default: '#4caf50' },
      ],
    },
  ],

  // ── arc ───────────────────────────────────────────────────────────────────
  arc: [
    {
      title: 'Arc',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 50 },
        { key: 'min', label: 'Min', type: 'number', default: 0 },
        { key: 'max', label: 'Max', type: 'number', default: 100 },
        { key: 'start_angle', label: 'Start Angle', type: 'number', default: 135, min: 0, max: 360 },
        { key: 'end_angle', label: 'End Angle', type: 'number', default: 45, min: 0, max: 360 },
        { key: 'rotation', label: 'Rotation', type: 'number', default: 0, min: 0, max: 360 },
        {
          key: 'mode',
          label: 'Mode',
          type: 'select',
          default: 'normal',
          options: ['normal', 'reverse', 'symmetrical'],
        },
        { key: 'adjustable', label: 'Adjustable', type: 'boolean', default: false },
        { key: 'line_color', label: 'Track Color', type: 'color', default: '#3a3a3a' },
        { key: 'line_color10', label: 'Indicator Color', type: 'color', default: '#2196f3' },
        { key: 'bg_color20', label: 'Knob Color', type: 'color', default: '#ffffff' },
        { key: 'line_width', label: 'Track Width', type: 'number', default: 20, min: 1, max: 200 },
        { key: 'line_width10', label: 'Indicator Width', type: 'number', default: 20, min: 1, max: 200 },
      ],
    },
  ],

  // ── gauge ─────────────────────────────────────────────────────────────────
  gauge: [
    {
      title: 'Gauge',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 50 },
        { key: 'min', label: 'Min', type: 'number', default: 0 },
        { key: 'max', label: 'Max', type: 'number', default: 100 },
        { key: 'critical_value', label: 'Critical Value', type: 'number', default: 80 },
        { key: 'label_count', label: 'Label Count', type: 'number', default: 6, min: 0, max: 100 },
        { key: 'line_count', label: 'Line Count', type: 'number', default: 21, min: 0, max: 200 },
        { key: 'angle', label: 'Angle (deg)', type: 'number', default: 270, min: 0, max: 360 },
        { key: 'needle_length', label: 'Needle Length', type: 'number', default: 0, min: 0, max: 100 },
        { key: 'bg_color10', label: 'Needle Color', type: 'color', default: '#ff0000' },
      ],
    },
  ],

  // ── linemeter ─────────────────────────────────────────────────────────────
  linemeter: [
    {
      title: 'Line Meter',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 50 },
        { key: 'min', label: 'Min', type: 'number', default: 0 },
        { key: 'max', label: 'Max', type: 'number', default: 100 },
        { key: 'angle', label: 'Angle (deg)', type: 'number', default: 240, min: 0, max: 360 },
        { key: 'line_count', label: 'Line Count', type: 'number', default: 31, min: 2, max: 200 },
        { key: 'line_width', label: 'Line Width', type: 'number', default: 3, min: 1, max: 20 },
        { key: 'scale_end_line_width', label: 'End Line Width', type: 'number', default: 4, min: 1, max: 20 },
        { key: 'scale_end_color', label: 'Scale End Color', type: 'color', default: '#ff0000' },
        { key: 'mirror', label: 'Mirror', type: 'boolean', default: false },
      ],
    },
  ],

  // ── led ───────────────────────────────────────────────────────────────────
  led: [
    {
      title: 'LED',
      props: [
        { key: 'val', label: 'Brightness (0–255)', type: 'number', default: 255, min: 0, max: 255 },
      ],
    },
  ],

  // ── spinner ───────────────────────────────────────────────────────────────
  spinner: [
    {
      title: 'Spinner',
      props: [
        { key: 'speed', label: 'Speed (ms)', type: 'number', default: 1000, min: 100 },
        { key: 'angle', label: 'Arc Angle (deg)', type: 'number', default: 60, min: 0, max: 360 },
        { key: 'bg_color10', label: 'Indicator Color', type: 'color', default: '#2196f3' },
      ],
    },
  ],

  // ── dropdown ──────────────────────────────────────────────────────────────
  dropdown: [
    {
      title: 'Dropdown',
      props: [
        { key: 'val', label: 'Selected Index', type: 'number', default: 0, min: 0 },
        {
          key: 'direction',
          label: 'Direction',
          type: 'select',
          default: 'down',
          options: ['down', 'up', 'left', 'right'],
        },
        { key: 'options', label: 'Options (one per line)', type: 'textarea', default: 'Option 1\nOption 2\nOption 3' },
      ],
    },
  ],

  // ── roller ────────────────────────────────────────────────────────────────
  roller: [
    {
      title: 'Roller',
      props: [
        { key: 'val', label: 'Selected Index', type: 'number', default: 0, min: 0 },
        { key: 'rows', label: 'Visible Rows', type: 'number', default: 3, min: 1 },
        { key: 'options', label: 'Options (one per line)', type: 'textarea', default: 'Option 1\nOption 2\nOption 3' },
      ],
    },
  ],

  // ── tabview ───────────────────────────────────────────────────────────────
  tabview: [
    {
      title: 'Tab View',
      props: [
        { key: 'val', label: 'Active Tab Index', type: 'number', default: 0, min: 0 },
        {
          key: 'btn_pos',
          label: 'Tab Button Position',
          type: 'select',
          default: 'top',
          options: ['none', 'top', 'bottom', 'left', 'right'],
        },
      ],
    },
  ],

  // ── tab ───────────────────────────────────────────────────────────────────
  tab: [
    {
      title: 'Tab',
      props: [
        { key: 'text', label: 'Tab Label', type: 'text', default: 'Tab' },
      ],
    },
  ],

  // ── btnmatrix ─────────────────────────────────────────────────────────────
  btnmatrix: [
    {
      title: 'Button Matrix',
      props: [
        { key: 'options', label: 'Buttons (one row per line, comma-separated)', type: 'textarea', default: 'Btn1,Btn2,Btn3' },
        { key: 'align', label: 'Text Align', type: 'select', default: 'center', options: ['left', 'center', 'right'] },
        { key: 'toggle', label: 'Toggle mode', type: 'boolean', default: false },
        { key: 'one_check', label: 'One Check (single-select)', type: 'boolean', default: false },
        { key: 'val', label: 'Active Button Index (-1 = none)', type: 'number', default: 0, min: -1 },
      ],
    },
  ],

  // ── msgbox ────────────────────────────────────────────────────────────────
  msgbox: [
    {
      title: 'Message Box',
      props: [
        { key: 'text', label: 'Message', type: 'textarea', default: 'Message text' },
        { key: 'options', label: 'Buttons (one per line)', type: 'textarea', default: 'OK' },
        { key: 'modal', label: 'Modal', type: 'boolean', default: false },
        { key: 'auto_close', label: 'Auto Close (ms, 0 = never)', type: 'number', default: 0, min: 0 },
      ],
    },
  ],

  // ── spinbox ───────────────────────────────────────────────────────────────
  spinbox: [
    {
      title: 'Spinbox',
      props: [
        { key: 'val', label: 'Value', type: 'number', default: 0 },
        { key: 'min', label: 'Min', type: 'number', default: -1000 },
        { key: 'max', label: 'Max', type: 'number', default: 1000 },
        { key: 'step', label: 'Step', type: 'number', default: 1, min: 1 },
        { key: 'digits', label: 'Digits', type: 'number', default: 5, min: 1, max: 10 },
      ],
    },
  ],

  // ── chart ─────────────────────────────────────────────────────────────────
  chart: [
    {
      title: 'Chart',
      props: [
        {
          key: 'type',
          label: 'Chart Type',
          type: 'select',
          default: 'line',
          options: ['line', 'bar', 'scatter', 'step_line'],
        },
        { key: 'series_count', label: 'Series Count', type: 'number', default: 1, min: 1 },
        { key: 'point_count', label: 'Points per Series', type: 'number', default: 10, min: 1 },
        { key: 'y_min', label: 'Y Min', type: 'number', default: 0 },
        { key: 'y_max', label: 'Y Max', type: 'number', default: 100 },
      ],
    },
  ],

  // ── cpicker ───────────────────────────────────────────────────────────────
  cpicker: [
    {
      title: 'Color Picker',
      props: [
        { key: 'val', label: 'Color', type: 'color', default: '#ff0000' },
        {
          key: 'color_mode',
          label: 'Mode',
          type: 'select',
          default: 'hue',
          options: ['hue', 'saturation', 'value'],
        },
      ],
    },
  ],

  // ── image / img ───────────────────────────────────────────────────────────
  image: [
    {
      title: 'Image',
      props: [
        { key: 'src', label: 'Source', type: 'text', default: 'L:/image.png' },
        { key: 'auto_size', label: 'Auto Size', type: 'boolean', default: true },
        { key: 'zoom', label: 'Zoom (256 = 100%)', type: 'number', default: 256, min: 1 },
        { key: 'angle', label: 'Angle (0.1° steps)', type: 'number', default: 0, min: 0, max: 3600 },
        { key: 'image_opa', label: 'Image Opacity', type: 'number', default: 255, min: 0, max: 255 },
        { key: 'image_recolor', label: 'Recolor Tint', type: 'color', default: '#ff0000' },
        { key: 'image_recolor_opa', label: 'Recolor Intensity', type: 'number', default: 0, min: 0, max: 255 },
      ],
    },
  ],
  img: [
    {
      title: 'Image',
      props: [
        { key: 'src', label: 'Source', type: 'text', default: 'L:/image.png' },
        { key: 'auto_size', label: 'Auto Size', type: 'boolean', default: true },
        { key: 'zoom', label: 'Zoom (256 = 100%)', type: 'number', default: 256, min: 1 },
        { key: 'angle', label: 'Angle (0.1° steps)', type: 'number', default: 0, min: 0, max: 3600 },
        { key: 'image_opa', label: 'Image Opacity', type: 'number', default: 255, min: 0, max: 255 },
        { key: 'image_recolor', label: 'Recolor Tint', type: 'color', default: '#ff0000' },
        { key: 'image_recolor_opa', label: 'Recolor Intensity', type: 'number', default: 0, min: 0, max: 255 },
      ],
    },
  ],

  // ── animimage ─────────────────────────────────────────────────────────────
  animimage: [
    {
      title: 'Animated Image',
      props: [
        { key: 'src', label: 'Base Path', type: 'text', default: 'L:/frame' },
        { key: 'count', label: 'Frame Count', type: 'number', default: 10, min: 1 },
        { key: 'speed', label: 'Speed (ms/frame)', type: 'number', default: 100, min: 1 },
        { key: 'auto_size', label: 'Auto Size', type: 'boolean', default: true },
      ],
    },
  ],

  // ── imgbtn ────────────────────────────────────────────────────────────────
  imgbtn: [
    {
      title: 'Image Button',
      props: [
        { key: 'src', label: 'Released Image', type: 'text', default: 'L:/btn_rel.png' },
        { key: 'src2', label: 'Pressed Image', type: 'text', default: '' },
        { key: 'toggle', label: 'Toggle mode', type: 'boolean', default: false },
      ],
    },
  ],

  // ── qrcode ────────────────────────────────────────────────────────────────
  qrcode: [
    {
      title: 'QR Code',
      props: [
        { key: 'text', label: 'Content', type: 'text', default: 'https://openhasp.com' },
      ],
    },
  ],

  // ── line ──────────────────────────────────────────────────────────────────
  line: [
    {
      title: 'Line',
      props: [
        { key: 'points', label: 'Points (x1,y1,x2,y2,...)', type: 'text', default: '0,0,100,0' },
        { key: 'y_invert', label: 'Invert Y axis', type: 'boolean', default: false },
      ],
    },
  ],

  // ── obj / container ───────────────────────────────────────────────────────
  obj: [
    {
      title: 'Container',
      props: [
        { key: 'click', label: 'Clickable', type: 'boolean', default: true },
      ],
    },
  ],

  // ── datetime ──────────────────────────────────────────────────────────────
  datetime: [
    {
      title: 'Date / Time',
      props: [
        { key: 'value', label: 'Value', type: 'text', default: '' },
        {
          key: 'mode',
          label: 'Mode',
          type: 'select',
          default: 'date',
          options: ['date', 'time', 'datetime'],
        },
      ],
    },
  ],
};
