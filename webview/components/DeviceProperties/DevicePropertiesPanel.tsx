import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { DeviceProperties } from '../../types';
import './DevicePropertiesPanel.css';

export const DevicePropertiesPanel: React.FC = () => {
  const { deviceProperties, setDeviceProperties, setCanvasSize } = useEditorStore();
  const [expanded, setExpanded] = useState(false);

  if (!deviceProperties) return null;

  const update = (patch: Partial<DeviceProperties>) => {
    const updated = { ...deviceProperties, ...patch };
    setDeviceProperties(updated);
    if (patch.width !== undefined || patch.height !== undefined) {
      setCanvasSize(updated.width, updated.height);
    }
  };

  return (
    <div className="device-props-panel">
      <div className="device-props-header" onClick={() => setExpanded(e => !e)}>
        <span className="device-props-title">Device Properties</span>
        <span className="device-props-chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="device-props-body">
          <label className="device-props-field">
            <span>Device Name</span>
            <input
              type="text"
              value={deviceProperties.deviceName}
              onChange={e => update({ deviceName: e.target.value })}
            />
          </label>

          <div className="device-props-row">
            <label className="device-props-field">
              <span>Width</span>
              <input
                type="number"
                min={1}
                value={deviceProperties.width}
                onChange={e => update({ width: parseInt(e.target.value, 10) || deviceProperties.width })}
              />
            </label>
            <label className="device-props-field">
              <span>Height</span>
              <input
                type="number"
                min={1}
                value={deviceProperties.height}
                onChange={e => update({ height: parseInt(e.target.value, 10) || deviceProperties.height })}
              />
            </label>
          </div>

          <label className="device-props-field">
            <span>Font Override File</span>
            <input
              type="text"
              value={deviceProperties.fontOverrideFile ?? ''}
              placeholder="/path/to/font.woff2"
              onChange={e => update({ fontOverrideFile: e.target.value })}
            />
          </label>

          <label className="device-props-field">
            <span>Font Name</span>
            <input
              type="text"
              value={deviceProperties.fontName ?? ''}
              placeholder="e.g. HaspFont"
              onChange={e => update({ fontName: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
};
