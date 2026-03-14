import { Page, DeviceProperties, HaspDocument } from '../types/models';
import { JsonlSerializer } from '../jsonl/serializer';

export class HaspJsonSerializer {
  static serialize(pages: Page[], deviceProperties: DeviceProperties): string {
    const doc: HaspDocument = {
      deviceProperties,
      layout: pages,
    };
    return JSON.stringify(doc, null, 2) + '\n';
  }

  static toJsonl(pages: Page[]): string {
    return JsonlSerializer.serialize(pages);
  }
}
