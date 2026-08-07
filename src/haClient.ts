import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { HaEntity, HaService, HaServiceField } from './types/models';
import { log } from './outputChannel';

const TOKEN_SECRET_KEY = 'openhasp.haToken';

/** Logs to the shared "openHASP" Output channel, tagged as Home Assistant. Never pass the access token itself. */
export function logHa(message: string): void {
  log(`[HA] ${message}`);
}

export interface HaConfig {
  url: string;
  token: string;
}

export function getHaUrl(): string {
  return vscode.workspace.getConfiguration('openhasp.homeAssistant').get<string>('url', '').trim();
}

export async function getHaConfig(context: vscode.ExtensionContext): Promise<HaConfig | undefined> {
  const url = getHaUrl();
  const token = await context.secrets.get(TOKEN_SECRET_KEY);
  if (!url || !token) {
    logHa(`getHaConfig: not connected (url ${url ? 'set' : 'MISSING'}, token ${token ? 'set' : 'MISSING'}).`);
    return undefined;
  }
  return { url: url.replace(/\/+$/, ''), token };
}

/** Precise reason the current connection is unusable, or undefined if it looks configured. */
export async function getHaConnectionIssue(context: vscode.ExtensionContext): Promise<string | undefined> {
  const url = getHaUrl();
  const token = await context.secrets.get(TOKEN_SECRET_KEY);
  if (!url && !token) return 'Home Assistant is not configured. Run "openHASP: Connect to Home Assistant".';
  if (!url) return 'Home Assistant URL is not set (openhasp.homeAssistant.url). Run "openHASP: Connect to Home Assistant".';
  if (!token) return 'Home Assistant access token was not found. Run "openHASP: Connect to Home Assistant" to re-enter it.';
  return undefined;
}

export async function storeHaToken(context: vscode.ExtensionContext, token: string): Promise<void> {
  await context.secrets.store(TOKEN_SECRET_KEY, token);
  logHa('Stored Home Assistant access token in SecretStorage.');
}

export async function clearHaToken(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(TOKEN_SECRET_KEY);
  logHa('Cleared Home Assistant access token from SecretStorage.');
}

interface RawResponse {
  statusCode: number;
  body: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: string;
  timeoutMs?: number;
}

/** Low-level HTTP call. Resolves for any HTTP status (the caller inspects statusCode); rejects only on network/timeout errors. */
function httpRequest(config: HaConfig, path: string, options: RequestOptions = {}): Promise<RawResponse> {
  const { method = 'GET', body, timeoutMs = 8000 } = options;
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(path, config.url);
    } catch {
      logHa(`Invalid Home Assistant URL: ${config.url}`);
      reject(new Error(`Invalid Home Assistant URL: ${config.url}`));
      return;
    }

    logHa(`${method} ${target.toString()}`);

    const client = target.protocol === 'http:' ? http : https;
    const req = client.request(
      target,
      {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body).toString() } : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          logHa(`${res.statusCode} ← ${path} (${text.length} bytes)`);
          resolve({ statusCode: res.statusCode ?? 0, body: text });
        });
      }
    );

    req.on('timeout', () => {
      logHa(`Timed out after ${timeoutMs}ms: ${path}`);
      req.destroy(new Error('Connection to Home Assistant timed out.'));
    });
    req.on('error', (err) => {
      logHa(`Request error for ${path}: ${err.message}`);
      reject(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

async function requestJson(config: HaConfig, path: string, timeoutMs = 8000): Promise<any> {
  const { statusCode, body } = await httpRequest(config, path, { timeoutMs });
  if (statusCode === 401 || statusCode === 403) {
    throw new Error('Home Assistant rejected the access token (unauthorized).');
  }
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Home Assistant returned HTTP ${statusCode}`);
  }
  try {
    return body ? JSON.parse(body) : undefined;
  } catch {
    throw new Error('Home Assistant returned a non-JSON response.');
  }
}

export type TemplateResult = { ok: true; rendered: string } | { ok: false; error: string };

/**
 * POST /api/template — asks Home Assistant to render a Jinja template so the editor can
 * validate an expression before it's saved. On success returns the rendered text; on a
 * template error HA replies 400 with a JSON `{ message }` describing what went wrong.
 */
export async function renderTemplate(config: HaConfig, template: string): Promise<TemplateResult> {
  logHa('Rendering a template for validation.');
  const { statusCode, body } = await httpRequest(config, '/api/template', {
    method: 'POST',
    body: JSON.stringify({ template }),
  });

  if (statusCode === 200) return { ok: true, rendered: body };
  if (statusCode === 401 || statusCode === 403) {
    return { ok: false, error: 'Home Assistant rejected the access token (unauthorized).' };
  }

  let error = `Home Assistant returned HTTP ${statusCode}`;
  try {
    const parsed = JSON.parse(body);
    if (parsed?.message) error = parsed.message;
  } catch {
    if (body.trim()) error = body.trim();
  }
  return { ok: false, error };
}

/** GET /api/ — used purely to verify the URL + token are valid. */
export async function testConnection(config: HaConfig): Promise<void> {
  logHa(`Testing connection to ${config.url}…`);
  try {
    await requestJson(config, '/api/');
    logHa('Connection test succeeded.');
  } catch (err) {
    logHa(`Connection test failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/** GET /api/states — flattened into the picker-friendly shape used by the webview. */
export async function fetchEntities(config: HaConfig): Promise<HaEntity[]> {
  const states = await requestJson(config, '/api/states');
  if (!Array.isArray(states)) {
    logHa('fetchEntities: /api/states did not return an array — returning an empty list.');
    return [];
  }

  const entities = states
    .map((s: any): HaEntity | undefined => {
      const entityId: string | undefined = s?.entity_id;
      if (!entityId || typeof entityId !== 'string') return undefined;
      return {
        entityId,
        domain: entityId.split('.')[0],
        state: s.state ?? 'unknown',
        friendlyName: s.attributes?.friendly_name,
      };
    })
    .filter((e: HaEntity | undefined): e is HaEntity => e !== undefined)
    .sort((a, b) => a.entityId.localeCompare(b.entityId));

  logHa(`fetchEntities: parsed ${entities.length} entities.`);
  return entities;
}

/**
 * Collect a service's parameter names. Home Assistant nests optional parameters inside
 * collapsible groups (`fields: { advanced_fields: { collapsed: true, fields: {…} } }`),
 * so groups are flattened rather than reported as a field of their own.
 */
function collectServiceFields(fields: any): HaServiceField[] {
  if (!fields || typeof fields !== 'object') return [];
  const out: HaServiceField[] = [];
  for (const [name, def] of Object.entries<any>(fields)) {
    if (def && typeof def === 'object' && def.fields) {
      out.push(...collectServiceFields(def.fields));
      continue;
    }
    out.push({
      name,
      required: def?.required === true,
      description: typeof def?.description === 'string' ? def.description : undefined,
      example: def?.example !== undefined ? String(def.example) : undefined,
    });
  }
  return out;
}

/** GET /api/services — the service registry, flattened to one entry per `domain.service`. */
export async function fetchServices(config: HaConfig): Promise<HaService[]> {
  const domains = await requestJson(config, '/api/services');
  if (!Array.isArray(domains)) {
    logHa('fetchServices: /api/services did not return an array — returning an empty list.');
    return [];
  }

  const services: HaService[] = [];
  for (const entry of domains) {
    const domain: string | undefined = entry?.domain;
    if (!domain || typeof domain !== 'string' || !entry.services || typeof entry.services !== 'object') continue;
    for (const [name, def] of Object.entries<any>(entry.services)) {
      services.push({
        service: `${domain}.${name}`,
        domain,
        name: typeof def?.name === 'string' ? def.name : undefined,
        description: typeof def?.description === 'string' ? def.description : undefined,
        fields: collectServiceFields(def?.fields),
        hasTarget: !!def?.target,
      });
    }
  }

  services.sort((a, b) => a.service.localeCompare(b.service));
  logHa(`fetchServices: parsed ${services.length} services.`);
  return services;
}
