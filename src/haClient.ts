import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { HaEntity } from './types/models';
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

function requestJson(config: HaConfig, path: string, timeoutMs = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(path, config.url);
    } catch {
      logHa(`Invalid Home Assistant URL: ${config.url}`);
      reject(new Error(`Invalid Home Assistant URL: ${config.url}`));
      return;
    }

    logHa(`GET ${target.toString()}`);

    const client = target.protocol === 'http:' ? http : https;
    const req = client.request(
      target,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          logHa(`${res.statusCode} ← ${path} (${body.length} bytes)`);
          if (res.statusCode === 401 || res.statusCode === 403) {
            reject(new Error('Home Assistant rejected the access token (unauthorized).'));
            return;
          }
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Home Assistant returned HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : undefined);
          } catch {
            reject(new Error('Home Assistant returned a non-JSON response.'));
          }
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
    req.end();
  });
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
