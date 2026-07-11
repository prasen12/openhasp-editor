import { Page, Widget } from '../types/models';
import { optionsTextToArray } from './optionsFormat';

export class JsonlSerializer {
  static serialize(pages: Page[]): string {
    const lines: string[] = [];

    for (const page of pages.sort((a, b) => a.id - b.id)) {
      // Add page header with comment
      if (page.comment) {
        lines.push(JSON.stringify({ page: page.id, comment: page.comment }));
      } else {
        lines.push(JSON.stringify({ page: page.id }));
      }

      // Add widgets sorted by ID
      for (const widget of page.widgets.sort((a, b) => a.id - b.id)) {
        const { page: _page, description, name: _name, ...rest } = widget as any;
        const obj: any = { ...rest };

        // Map editor description to JSONL comment
        if (description) {
          obj.comment = description;
        }

        if ((obj.obj === 'btnmatrix' || obj.obj === 'msgbox') && typeof obj.options === 'string') {
          obj.options = optionsTextToArray(obj.options, obj.obj);
        }

        // Remove undefined, null, and empty string properties
        Object.keys(obj).forEach(key => {
          if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
            delete obj[key];
          }
        });

        lines.push(escapePUA(JSON.stringify(obj)));
      }

      // Add blank line between pages (except after last page)
      if (page !== pages[pages.length - 1]) {
        lines.push('');
      }
    }

    return lines.join('\n') + '\n';
  }

  static serializeWidget(widget: Widget): string {
    const { page: _page, description, name: _name, ...rest } = widget as any;
    const obj: any = { ...rest };

    // Map editor description to JSONL comment
    if (description) {
      obj.comment = description;
    }

    if ((obj.obj === 'btnmatrix' || obj.obj === 'msgbox') && typeof obj.options === 'string') {
      obj.options = optionsTextToArray(obj.options, obj.obj);
    }

    // Remove undefined, null, and empty string properties
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
        delete obj[key];
      }
    });

    return escapePUA(JSON.stringify(obj));
  }
}

/**
 * JSON.stringify outputs BMP PUA characters (U+E000–U+F8FF) as raw UTF-8 bytes.
 * openHASP tools expect them as \uXXXX escape sequences. This function converts
 * any raw PUA characters in a JSON string back to their \uXXXX form.
 */
function escapePUA(json: string): string {
  return json.replace(/[\uE000-\uF8FF]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}`
  );
}
