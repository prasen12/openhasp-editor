import React, { useEffect, useRef, useState } from 'react';
import { vscode } from '../../utils/vscodeApi';
import { useEditorStore } from '../../store/useEditorStore';
import { HaEntity } from '../../types';

interface HaTemplateEditorProps {
  title: string;
  /** The stored expression, without surrounding {{ }} braces. */
  initialValue: string;
  /** Called with the trimmed, server-validated expression (no braces). */
  onSave: (value: string) => void;
  onClose: () => void;
}

interface ValidationResult {
  ok: boolean;
  rendered?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Autocomplete vocabulary
// ---------------------------------------------------------------------------

interface FunctionDef {
  label: string;
  detail: string;
  /** Insert as `name("")` with the caret placed between the quotes. */
  entity?: boolean;
  /** Insert as `name()` with the caret placed between the parens. */
  parens?: boolean;
}

const HA_FUNCTIONS: FunctionDef[] = [
  { label: 'states', detail: 'state of an entity', entity: true },
  { label: 'is_state', detail: 'compare an entity state', entity: true },
  { label: 'state_attr', detail: 'an entity attribute', entity: true },
  { label: 'is_state_attr', detail: 'compare an attribute', entity: true },
  { label: 'has_value', detail: 'entity has a usable value', entity: true },
  { label: 'now', detail: 'current local time', parens: true },
  { label: 'utcnow', detail: 'current UTC time', parens: true },
  { label: 'today_at', detail: 'today at HH:MM', parens: true },
  { label: 'as_timestamp', detail: 'to a unix timestamp', parens: true },
  { label: 'as_datetime', detail: 'to a datetime', parens: true },
  { label: 'as_local', detail: 'to local time', parens: true },
  { label: 'float', detail: 'to a float', parens: true },
  { label: 'int', detail: 'to an integer', parens: true },
  { label: 'min', detail: 'minimum of a list', parens: true },
  { label: 'max', detail: 'maximum of a list', parens: true },
];

const JINJA_FILTERS = [
  'float', 'int', 'round', 'default', 'abs', 'upper', 'lower', 'title', 'capitalize',
  'replace', 'trim', 'string', 'timestamp_custom', 'timestamp_local', 'as_datetime',
  'as_local', 'multiply', 'is_number',
];

/** Keywords offered inside a `{% … %}` statement block. */
const JINJA_STATEMENTS = [
  'if', 'elif', 'else', 'endif', 'for', 'endfor', 'in', 'set', 'macro', 'endmacro',
];

interface Suggestion {
  label: string;
  detail?: string;
  /** Text that replaces the current token. */
  apply: string;
  /** Caret placement relative to the end of the inserted text (e.g. -2 to sit inside `("")`). */
  cursorOffset?: number;
}

type SuggestKind = 'entity' | 'filter' | 'function' | 'statement';

interface TokenContext {
  kind: SuggestKind;
  token: string;
  /** Index in the value where the token to replace begins. */
  start: number;
}

/** Work out what the caret is currently sitting on: an entity string, a filter after `|`, or a bare identifier. */
function analyzeToken(value: string, cursor: number): TokenContext | null {
  const before = value.slice(0, cursor);

  // Inside an unterminated quote → suggest entity IDs.
  const quote = before.match(/["']([^"']*)$/);
  if (quote) {
    return { kind: 'entity', token: quote[1], start: cursor - quote[1].length };
  }

  // Directly after `{%` (start of a statement block) → suggest statement keywords.
  const statement = before.match(/\{%[-+]?\s*([A-Za-z_]*)$/);
  if (statement) {
    return { kind: 'statement', token: statement[1], start: cursor - statement[1].length };
  }

  // Right after a pipe → suggest Jinja filters.
  const filter = before.match(/\|\s*([A-Za-z0-9_]*)$/);
  if (filter) {
    return { kind: 'filter', token: filter[1], start: cursor - filter[1].length };
  }

  // A bare identifier → suggest template functions.
  const word = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
  if (word) {
    return { kind: 'function', token: word[1], start: cursor - word[1].length };
  }

  return null;
}

const MAX_SUGGESTIONS = 50;

function buildSuggestions(ctx: TokenContext, entities: HaEntity[]): Suggestion[] {
  const t = ctx.token.toLowerCase();

  if (ctx.kind === 'entity') {
    return entities
      .filter(e => e.entityId.toLowerCase().includes(t) || e.friendlyName?.toLowerCase().includes(t))
      .slice(0, MAX_SUGGESTIONS)
      .map(e => ({ label: e.entityId, detail: e.friendlyName, apply: e.entityId }));
  }

  if (ctx.kind === 'filter') {
    return JINJA_FILTERS
      .filter(f => f.startsWith(t))
      .map(f => ({ label: f, detail: 'filter', apply: f }));
  }

  if (ctx.kind === 'statement') {
    return JINJA_STATEMENTS
      .filter(s => s.startsWith(t))
      .map(s => ({ label: s, detail: 'statement', apply: s }));
  }

  return HA_FUNCTIONS
    .filter(f => f.label.startsWith(t))
    .map(f => ({
      label: f.label,
      detail: f.detail,
      apply: f.entity ? `${f.label}("")` : f.parens ? `${f.label}()` : f.label,
      cursorOffset: f.entity ? -2 : f.parens ? -1 : 0,
    }));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialogStyle: React.CSSProperties = {
  width: 'min(560px, 92vw)', maxHeight: '88vh', overflowY: 'auto',
  background: 'var(--vscode-editor-background)', color: 'var(--vscode-foreground)',
  border: '1px solid var(--vscode-panel-border)', borderRadius: '4px',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)', padding: '16px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: '4px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: '90px', resize: 'vertical',
  background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)', borderRadius: '2px', padding: '6px',
  fontSize: '12px', fontFamily: 'var(--vscode-editor-font-family, monospace)',
};

const buttonStyle: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '2px',
  border: '1px solid var(--vscode-button-border, transparent)',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--vscode-button-secondaryBackground, var(--vscode-input-background))',
  color: 'var(--vscode-button-secondaryForeground, var(--vscode-foreground))',
};

/**
 * Modal for editing a Home Assistant Jinja expression. The expression is stored without
 * braces (the config generator wraps it in {{ }}); this dialog wraps it the same way when
 * asking Home Assistant to render it. Saving always validates against the server first —
 * a template that Home Assistant can't render is never written back.
 *
 * As you type it offers autocomplete: entity IDs inside quotes, template functions on a bare
 * word, and Jinja filters right after a `|`.
 */
export const HaTemplateEditor: React.FC<HaTemplateEditorProps> = ({ title, initialValue, onSave, onClose }) => {
  const { haEntities } = useEditorStore();
  const [value, setValue] = useState(initialValue);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const pendingId = useRef<string | null>(null);
  const intentRef = useRef<'validate' | 'save'>('validate');
  const validatedTextRef = useRef('');
  // Latest onSave/onClose without re-registering the message listener each render.
  const onSaveRef = useRef(onSave);
  const onCloseRef = useRef(onClose);
  onSaveRef.current = onSave;
  onCloseRef.current = onClose;

  useEffect(() => {
    const handle = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.type !== 'haTemplateResult' || msg.requestId !== pendingId.current) return;
      pendingId.current = null;
      setValidating(false);
      setResult({ ok: msg.ok, rendered: msg.rendered, error: msg.error });
      if (msg.ok && intentRef.current === 'save') {
        onSaveRef.current(validatedTextRef.current);
        onCloseRef.current();
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, []);

  /** Recompute the suggestion list for the caret's current position within `text`. */
  const refreshSuggestions = (text: string, cursor: number) => {
    const ctx = analyzeToken(text, cursor);
    const list = ctx ? buildSuggestions(ctx, haEntities) : [];
    setSuggestions(list);
    setActiveIndex(0);
    setSuggestOpen(list.length > 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    setResult(null);
    refreshSuggestions(next, e.target.selectionStart ?? next.length);
  };

  const applySuggestion = (s: Suggestion) => {
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? value.length;
    const ctx = analyzeToken(value, cursor);
    if (!ctx) return;

    const next = value.slice(0, ctx.start) + s.apply + value.slice(cursor);
    const nextCursor = ctx.start + s.apply.length + (s.cursorOffset ?? 0);
    setValue(next);
    setSuggestOpen(false);

    // Restore focus and place the caret, then re-open suggestions if we landed inside quotes.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = nextCursor;
      refreshSuggestions(next, nextCursor);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setSuggestOpen(false);
        return;
      }
    }
    // Ctrl/Cmd+Space forces the suggestion list open at the caret.
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      const ta = textareaRef.current;
      refreshSuggestions(value, ta?.selectionStart ?? value.length);
    }
  };

  /** Caret moved without editing (arrows / click) — resync the suggestions to the new position. */
  const handleCaretMove = (cursor: number | null | undefined) => {
    refreshSuggestions(value, cursor ?? value.length);
  };

  const run = (intent: 'validate' | 'save') => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResult({ ok: false, error: 'Template is empty.' });
      return;
    }
    const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingId.current = id;
    intentRef.current = intent;
    validatedTextRef.current = trimmed;
    setValidating(true);
    setResult(null);
    // Send the raw expression — the extension wraps a bare value in {{ }} and leaves a
    // template that already has {{ }}/{% %} delimiters untouched.
    vscode.validateHaTemplate(id, trimmed);
  };

  /** Insert a delimiter pair at the caret and drop the cursor between the braces. */
  const insertDelimiter = (open: string, close: string) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? start;
    const inner = value.slice(start, end);
    const next = `${value.slice(0, start)}${open}${inner}${close}${value.slice(end)}`;
    const caret = start + open.length + inner.length;
    setValue(next);
    setResult(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = caret;
      refreshSuggestions(next, caret);
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>{title}</h3>
          <span onClick={onClose} title="Close" style={{ cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}>×</span>
        </div>

        <label style={labelStyle}>Jinja template</label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <button
            type="button"
            style={{ ...secondaryButtonStyle, padding: '2px 8px', fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
            title="Insert an output block"
            onMouseDown={e => { e.preventDefault(); insertDelimiter('{{ ', ' }}'); }}
          >
            &#123;&#123; &#125;&#125;
          </button>
          <button
            type="button"
            style={{ ...secondaryButtonStyle, padding: '2px 8px', fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
            title="Insert a statement block (if / for / set)"
            onMouseDown={e => { e.preventDefault(); insertDelimiter('{% ', ' %}'); }}
          >
            &#123;% %&#125;
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={e => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                handleCaretMove(e.currentTarget.selectionStart);
              }
            }}
            onClick={e => handleCaretMove(e.currentTarget.selectionStart)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder={'states("sensor.temperature") | float'}
            spellCheck={false}
            style={textareaStyle}
          />

          {suggestOpen && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '2px', zIndex: 20,
                maxHeight: '200px', overflowY: 'auto',
                background: 'var(--vscode-dropdown-background, var(--vscode-input-background))',
                border: '1px solid var(--vscode-input-border)', borderRadius: '2px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {suggestions.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  ref={el => { if (el && i === activeIndex) el.scrollIntoView({ block: 'nearest' }); }}
                  onMouseDown={ev => { ev.preventDefault(); applySuggestion(s); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', gap: '8px',
                    padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                    background: i === activeIndex ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                    color: i === activeIndex ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                  {s.detail && (
                    <span style={{ opacity: 0.6, flexShrink: 0, whiteSpace: 'nowrap' }}>{s.detail}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <p style={{ fontSize: '10px', opacity: 0.55, margin: '4px 0 0' }}>
          A bare expression is wrapped in <code>&#123;&#123; &#125;&#125;</code>; use <code>&#123;% %&#125;</code> for
          <code> if</code>/<code>for</code>/<code>set</code> logic. Autocomplete: entities in quotes, functions on a word,
          filters after <code>|</code>. ⌃Space to trigger.
        </p>

        {result && (
          <div
            style={{
              marginTop: '10px', padding: '8px', borderRadius: '2px', fontSize: '12px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              border: `1px solid ${result.ok ? 'var(--vscode-testing-iconPassed, #4caf50)' : 'var(--vscode-inputValidation-errorBorder, #f48771)'}`,
              background: result.ok
                ? 'var(--vscode-inputValidation-infoBackground, transparent)'
                : 'var(--vscode-inputValidation-errorBackground, transparent)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              {result.ok ? '✓ Renders on Home Assistant' : '✕ Invalid template'}
            </div>
            <div style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', opacity: 0.9 }}>
              {result.ok ? (result.rendered === '' ? '(empty result)' : result.rendered) : result.error}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button style={secondaryButtonStyle} onClick={onClose} disabled={validating}>Cancel</button>
          <button style={secondaryButtonStyle} onClick={() => run('validate')} disabled={validating}>
            {validating && intentRef.current === 'validate' ? 'Validating…' : 'Validate'}
          </button>
          <button style={primaryButtonStyle} onClick={() => run('save')} disabled={validating}>
            {validating && intentRef.current === 'save' ? 'Validating…' : 'Validate & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
