import * as vscode from 'vscode';
import { JsonlParser } from './jsonl/parser';
import { JsonlSerializer } from './jsonl/serializer';
import { HaspJsonParser } from './haspJson/parser';
import { HaspJsonSerializer } from './haspJson/serializer';
import { Page, DeviceProperties, ToWebviewMessage, ToExtensionMessage } from './types/models';
import * as path from 'path';

function isHaspJsonFile(document: vscode.TextDocument): boolean {
  return document.uri.fsPath.endsWith('.hasp.json');
}

export class OpenHASPEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'openhasp.pageEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    const isHaspJson = isHaspJsonFile(document);

    // Determine font paths: from settings (icon font) and from document (font override)
    const editorConfig = vscode.workspace.getConfiguration('openhasp.editor');
    const iconFontPath = editorConfig.get<string>('iconFont', '').trim();

    // Parse document to get device properties (for font override path)
    let fontOverridePath = '';
    if (isHaspJson) {
      const parsed = HaspJsonParser.parse(document.getText());
      fontOverridePath = parsed.deviceProperties.fontOverrideFile?.trim() ?? '';
    }

    const resourceRoots = [
      vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      vscode.Uri.joinPath(this.context.extensionUri, 'webview'),
    ];
    if (iconFontPath) {
      resourceRoots.push(vscode.Uri.file(path.dirname(iconFontPath)));
    }
    if (fontOverridePath) {
      resourceRoots.push(vscode.Uri.file(path.dirname(fontOverridePath)));
    }

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: resourceRoots,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, iconFontPath);

    const getFontOverrideUri = (propsOrPath: DeviceProperties | string): string => {
      const filePath = typeof propsOrPath === 'string'
        ? propsOrPath
        : propsOrPath.fontOverrideFile?.trim() ?? '';
      if (!filePath) return '';
      try {
        return webviewPanel.webview.asWebviewUri(vscode.Uri.file(filePath)).toString();
      } catch {
        return '';
      }
    };

    const buildInitMessage = (text: string): ToWebviewMessage => {
      if (isHaspJson) {
        const { pages, deviceProperties } = HaspJsonParser.parse(text);
        const config = vscode.workspace.getConfiguration('openhasp.editor');
        return {
          type: 'init',
          pages,
          fileName: path.basename(document.uri.fsPath),
          canvasWidth: deviceProperties.width ?? config.get<number>('canvasWidth', 720),
          canvasHeight: deviceProperties.height ?? config.get<number>('canvasHeight', 480),
          deviceProperties,
          fontOverrideUri: getFontOverrideUri(deviceProperties),
        };
      } else {
        const config = vscode.workspace.getConfiguration('openhasp.editor');
        return {
          type: 'init',
          pages: JsonlParser.parse(text),
          fileName: path.basename(document.uri.fsPath),
          canvasWidth: config.get<number>('canvasWidth', 720),
          canvasHeight: config.get<number>('canvasHeight', 480),
        };
      }
    };

    const buildChangedMessage = (text: string): ToWebviewMessage => {
      if (isHaspJson) {
        const { pages, deviceProperties } = HaspJsonParser.parse(text);
        return {
          type: 'documentChanged',
          pages,
          deviceProperties,
          fontOverrideUri: getFontOverrideUri(deviceProperties),
        };
      } else {
        return { type: 'documentChanged', pages: JsonlParser.parse(text) };
      }
    };

    webviewPanel.webview.onDidReceiveMessage(async (message: ToExtensionMessage) => {
      switch (message.type) {
        case 'ready':
          webviewPanel.webview.postMessage(buildInitMessage(document.getText()));
          break;

        case 'update':
          await this.updateDocument(document, message.pages, message.deviceProperties, isHaspJson);
          break;

        case 'mqtt-upload':
          await this.handleMqttUpload(message.config, message.pages, message.device);
          break;

        case 'export':
          await this.handleExport(message);
          break;
      }
    });

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
        webviewPanel.webview.postMessage(buildChangedMessage(e.document.getText()));
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  public async exportAsJsonl(document: vscode.TextDocument): Promise<void> {
    let pages: Page[];
    if (isHaspJsonFile(document)) {
      ({ pages } = HaspJsonParser.parse(document.getText()));
    } else {
      pages = JsonlParser.parse(document.getText());
    }

    const defaultName = path.basename(document.uri.fsPath).replace(/\.hasp\.json$/, '') + '.jsonl';
    const uri = await vscode.window.showSaveDialog({
      filters: { 'JSONL Files': ['jsonl'] },
      defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), defaultName)),
    });

    if (uri) {
      const content = JsonlSerializer.serialize(pages);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Exported JSONL to ${uri.fsPath}`);
    }
  }

  private async updateDocument(
    document: vscode.TextDocument,
    pages: Page[],
    deviceProperties: DeviceProperties | undefined,
    isHaspJson: boolean
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    let content: string;

    if (isHaspJson && deviceProperties) {
      content = HaspJsonSerializer.serialize(pages, deviceProperties);
    } else {
      content = JsonlSerializer.serialize(pages);
    }

    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
    await vscode.workspace.applyEdit(edit);
  }

  private async handleMqttUpload(_config: any, _pages: Page[], device: string): Promise<void> {
    vscode.window.showInformationMessage(`MQTT upload not yet implemented. Would upload to ${device}`);
  }

  private async handleExport(message: { type: 'export'; pages: Page[]; format: 'jsonl' | 'json' }): Promise<void> {
    const { pages, format } = message;
    const content = format === 'jsonl'
      ? JsonlSerializer.serialize(pages)
      : JSON.stringify(pages, null, 2);

    const uri = await vscode.window.showSaveDialog({
      filters: {
        'JSONL Files': ['jsonl'],
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
      defaultUri: vscode.Uri.file(`pages.${format}`),
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview, iconFontPath: string = ''): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    );

    const nonce = getNonce();
    const isDev = this.context.extensionMode === vscode.ExtensionMode.Development;

    const csp = isDev
      ? `default-src 'none'; connect-src ${webview.cspSource} ws://localhost:8097; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' http://localhost:8097; font-src ${webview.cspSource} data:;`
      : `default-src 'none'; connect-src ${webview.cspSource}; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} data:;`;

    let iconFontFace = '';
    if (iconFontPath) {
      const fontUri = webview.asWebviewUri(vscode.Uri.file(iconFontPath));
      const ext = path.extname(iconFontPath).toLowerCase();
      const format = ext === '.woff2' ? 'woff2' : ext === '.woff' ? 'woff' : 'truetype';
      iconFontFace = `
    @font-face {
      font-family: 'openHASP Icons';
      src: url('${fontUri}') format('${format}');
      unicode-range: U+E000-U+F8FF, U+F0000-U+FFFFF;
    }
    body { font-family: 'openHASP Icons', var(--vscode-font-family); }`;
    }

    const reactDevTools = isDev
      ? `<script src="http://localhost:8097"></script>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>openHASP Page Editor</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    #root {
      width: 100vw;
      height: 100vh;
    }${iconFontFace}
  </style>
</head>
<body>
  ${reactDevTools}
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
