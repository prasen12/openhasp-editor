/**
 * Jinja template helpers shared by the config generator and the template-validation handler,
 * so "how a stored expression becomes a real template" is decided in exactly one place.
 *
 * Expressions may be stored either as a bare value (e.g. `states("sensor.x") | float`, which
 * we wrap in `{{ }}`) or as a full template the user wrote with their own delimiters — an
 * output block `{{ … }}`, a statement block `{% … %}`, or a comment `{# … #}`. Anything that
 * already contains a delimiter is treated as a complete template and used verbatim.
 */

/** True if the string already contains any Jinja delimiter ({{ }}, {% %}, or {# #}). */
export function hasJinjaDelimiters(s: string): boolean {
  return /\{\{|\{%|\{#/.test(s);
}

/** Remove one matching pair of surrounding quotes, e.g. a service pasted as `"{{ … }}"`. */
export function stripWrappingQuotes(s: string): string {
  const match = s.trim().match(/^(['"])([\s\S]*)\1$/);
  return match ? match[2] : s.trim();
}

/** A bare expression is wrapped in `{{ }}`; a string that already has delimiters is returned as-is. */
export function wrapTemplate(expr: string): string {
  const trimmed = expr.trim();
  if (!trimmed) return trimmed;
  return hasJinjaDelimiters(trimmed) ? trimmed : `{{ ${trimmed} }}`;
}
