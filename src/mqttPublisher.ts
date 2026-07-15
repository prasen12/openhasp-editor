import * as mqtt from 'mqtt';
import * as vscode from 'vscode';
import { log } from './outputChannel';

function logMqtt(message: string): void {
  log(`[MQTT] ${message}`);
}

export interface MqttConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function getMqttConfig(): MqttConfig {
  const config = vscode.workspace.getConfiguration('openhasp.mqtt');
  return {
    host: config.get<string>('host', 'localhost'),
    port: config.get<number>('port', 1883),
    username: config.get<string>('username', '') || undefined,
    password: config.get<string>('password', '') || undefined,
  };
}

export async function publishToDevice(
  deviceName: string,
  jsonlContent: string,
  config: MqttConfig,
  progress: vscode.Progress<{ message?: string }>
): Promise<void> {
  const slug = deviceName.toLowerCase().replace(/\s+/g, '_');

  return new Promise((resolve, reject) => {
    const url = `mqtt://${config.host}:${config.port}`;
    const connectOpts: mqtt.IClientOptions = {
      connectTimeout: 5000,
      username: config.username,
      password: config.password,
    };

    logMqtt(`Connecting to ${url} (device slug "${slug}")…`);
    const client = mqtt.connect(url, connectOpts);

    let settled = false;
    function done(err?: Error) {
      if (settled) return;
      settled = true;
      client.end();
      if (err) logMqtt(`Publish failed: ${err.message}`);
      else logMqtt(`Publish to ${slug} complete.`);
      if (err) reject(err);
      else resolve();
    }

    client.on('error', (err) => {
      logMqtt(`Connection error: ${err.message}`);
      done(err);
    });

    client.on('connect', () => {
      logMqtt(`Connected to ${url}.`);
      (async () => {
        // 1. Clear the device display
        progress.report({ message: 'Clearing device display…' });
        await publish(client, `hasp/${slug}/command/clearpage`, 'all');

        // 2. Send each non-blank JSONL line
        const lines = jsonlContent.split('\n').filter(l => l.trim());
        logMqtt(`Sending ${lines.length} JSONL lines to hasp/${slug}/command/jsonl…`);
        progress.report({ message: `Sending ${lines.length} JSONL lines…` });
        for (const line of lines) {
          await publish(client, `hasp/${slug}/command/jsonl`, line);
        }

        done();
      })().catch(done);
    });
  });
}

function publish(client: mqtt.MqttClient, topic: string, payload: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, (err) => {
      if (err) logMqtt(`Failed to publish to ${topic}: ${err.message}`);
      if (err) reject(err);
      else resolve();
    });
  });
}
