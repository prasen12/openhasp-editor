import { vscode } from './vscodeApi';

export interface HaRenderResult {
  ok: boolean;
  rendered?: string;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Ask Home Assistant to render one Jinja template, as a promise. The extension wraps a bare
 * expression in {{ }} and leaves a template that already has delimiters untouched, so callers
 * pass exactly what the user typed.
 */
export function renderHaTemplate(template: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HaRenderResult> {
  const requestId = `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise(resolve => {
    let timer: ReturnType<typeof setTimeout>;

    const finish = (result: HaRenderResult) => {
      clearTimeout(timer);
      window.removeEventListener('message', handle);
      resolve(result);
    };

    const handle = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.type !== 'haTemplateResult' || msg.requestId !== requestId) return;
      finish({ ok: msg.ok, rendered: msg.rendered, error: msg.error });
    };

    window.addEventListener('message', handle);
    timer = setTimeout(() => finish({ ok: false, error: 'Home Assistant did not respond in time.' }), timeoutMs);
    vscode.validateHaTemplate(requestId, template);
  });
}
