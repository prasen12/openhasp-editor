import { Page, Widget } from '../types/models';

export class JsonlParser {
  static parse(content: string): Page[] {
    const lines = content.split('\n').filter(line => line.trim());
    const pages = new Map<number, Page>();
    let currentPageId = 1;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);

        // Extract page number if specified
        if (obj.page !== undefined) {
          currentPageId = obj.page;
        }

        // Ensure page exists
        if (!pages.has(currentPageId)) {
          pages.set(currentPageId, {
            id: currentPageId,
            widgets: [],
            comment: obj.comment
          });
        }

        // Update page comment if this is a page header
        if (obj.comment && Object.keys(obj).length <= 2) {
          const page = pages.get(currentPageId)!;
          page.comment = obj.comment;
          continue;
        }

        // Add widget if it has an id and obj type
        if (obj.id !== undefined && obj.obj !== undefined) {
          const { comment, ...rest } = obj;
          const widget: Widget = {
            ...rest,
            page: currentPageId,
            ...(comment !== undefined ? { description: comment } : {})
          };
          pages.get(currentPageId)!.widgets.push(widget);

          // Log non-ASCII characters in text so the correct icon font can be identified.
          // Visible in: VS Code Output panel → "Extension Host"
          // if (typeof obj.text === 'string') {
          //   const nonAscii = [...obj.text].filter((c: string) => c.charCodeAt(0) > 0x7F);
          //   if (nonAscii.length > 0) {
          //     const points = nonAscii.map((c: string) =>
          //       `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
          //     );
          //     console.log(`[openHASP parser] widget #${obj.id} text codepoints: ${points.join(', ')}`);
          //   }
          // }
        }
      } catch (error) {
        console.error(`Failed to parse JSONL line: ${line}`, error);
      }
    }

    return Array.from(pages.values()).sort((a, b) => a.id - b.id);
  }

  static validate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (let i = 0; i < lines.length; i++) {
      try {
        const obj = JSON.parse(lines[i]);

        // Check for required fields in widgets
        if (obj.id !== undefined) {
          if (!obj.obj) {
            errors.push(`Line ${i + 1}: Widget has id but missing obj type`);
          }
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
