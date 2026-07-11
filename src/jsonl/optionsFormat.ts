/**
 * `btnmatrix` and `msgbox` represent their `options` property as a JSON array of button
 * labels in the device JSONL format (btnmatrix additionally uses literal "\n" array
 * elements as row-break markers between rows of buttons). The editor represents both as
 * a single textarea string for editing, matching the convention already used for
 * `dropdown`/`roller` options: msgbox is one button per line; btnmatrix is one row per
 * line, with buttons within a row comma-separated.
 */

export function optionsArrayToText(options: unknown[], obj: string): string {
  if (obj === 'btnmatrix') {
    const rows: string[][] = [[]];
    for (const el of options) {
      if (el === '\n') rows.push([]);
      else rows[rows.length - 1].push(String(el));
    }
    return rows.map(row => row.join(',')).join('\n');
  }
  return options.map(String).join('\n');
}

export function optionsTextToArray(text: string, obj: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (obj === 'btnmatrix') {
    const result: string[] = [];
    lines.forEach((line, i) => {
      if (i > 0) result.push('\n');
      line.split(',').map(s => s.trim()).filter(Boolean).forEach(btn => result.push(btn));
    });
    return result;
  }
  return lines;
}
