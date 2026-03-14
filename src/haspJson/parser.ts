import { Page, DeviceProperties, HaspDocument } from '../types/models';

export const DEFAULT_DEVICE_PROPERTIES: DeviceProperties = {
  width: 320,
  height: 240,
  deviceName: 'My Device',
};

export class HaspJsonParser {
  static parse(text: string): { pages: Page[]; deviceProperties: DeviceProperties } {
    try {
      const doc = JSON.parse(text) as Partial<HaspDocument>;

      const deviceProperties: DeviceProperties = {
        ...DEFAULT_DEVICE_PROPERTIES,
        ...(doc.deviceProperties ?? {}),
      };

      const pages: Page[] = Array.isArray(doc.layout) ? doc.layout : [];

      return { pages, deviceProperties };
    } catch (e) {
      console.error('HaspJsonParser: failed to parse document', e);
      return { pages: [], deviceProperties: { ...DEFAULT_DEVICE_PROPERTIES } };
    }
  }

  static isHaspDocument(text: string): boolean {
    try {
      const doc = JSON.parse(text);
      return (
        typeof doc === 'object' &&
        doc !== null &&
        'deviceProperties' in doc &&
        typeof doc.deviceProperties === 'object'
      );
    } catch {
      return false;
    }
  }
}
