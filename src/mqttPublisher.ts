import * as mqtt from 'mqtt';
import * as vscode from 'vscode';

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

    const client = mqtt.connect(url, connectOpts);

    let settled = false;
    function done(err?: Error) {
      if (settled) return;
      settled = true;
      client.end();
      if (err) reject(err);
      else resolve();
    }

    client.on('error', (err) => done(err));

    client.on('connect', () => {
      (async () => {
        // 1. Clear the device display
        progress.report({ message: 'Clearing device display…' });
        await publish(client, `hasp/${slug}/command/clearpage`, 'all');

        // 2. Send each non-blank JSONL line
        const lines = jsonlContent.split('\n').filter(l => l.trim());
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
    client.publish(topic, payload, (err) => (err ? reject(err) : resolve()));
  });
}
