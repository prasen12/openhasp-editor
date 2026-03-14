import * as vscode from 'vscode';
import { JsonlParser } from './jsonl/parser';
import { JsonlSerializer } from './jsonl/serializer';
import { Page, ToWebviewMessage, ToExtensionMessage } from './types/models';
import * as path from 'path';

export class OpenHASPEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'openhasp.pageEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Check for user-specified icon font
    const editorConfig = vscode.workspace.getConfiguration('openhasp.editor');
    const iconFontPath = editorConfig.get<string>('iconFont', '').trim();

    const resourceRoots = [
      vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      vscode.Uri.joinPath(this.context.extensionUri, 'webview')
    ];
    if (iconFontPath) {
      // Allow the webview to load the font from its containing directory
      resourceRoots.push(vscode.Uri.file(path.dirname(iconFontPath)));
    }

    // Setup webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: resourceRoots
    };

    // Set HTML content
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, iconFontPath);

    // Parse the document
    const pages = JsonlParser.parse(document.getText());

    // Function to update webview
    const updateWebview = () => {
      const pages = JsonlParser.parse(document.getText());
      const message: ToWebviewMessage = {
        type: 'documentChanged',
        pages: pages
      };
      webviewPanel.webview.postMessage(message);
    };

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage(async (message: ToExtensionMessage) => {
      switch (message.type) {
        case 'ready': {
          // Send initial data when webview is ready
          const config = vscode.workspace.getConfiguration('openhasp.editor');
          const initMessage: ToWebviewMessage = {
            type: 'init',
            pages: JsonlParser.parse(document.getText()),
            fileName: path.basename(document.uri.fsPath),
            canvasWidth: config.get<number>('canvasWidth', 720),
            canvasHeight: config.get<number>('canvasHeight', 480)
          };
          webviewPanel.webview.postMessage(initMessage);
          break;
        }

        case 'update':
          await this.updateDocument(document, message.pages);
          break;

        case 'mqtt-upload':
          await this.handleMqttUpload(message.config, message.pages, message.device);
          break;

        case 'export':
          await this.handleExport(message);
          break;
      }
    });

    // Sync document changes to webview
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
        updateWebview();
      }
    });

    // Cleanup on dispose
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private async updateDocument(document: vscode.TextDocument, pages: Page[]): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const jsonlContent = JsonlSerializer.serialize(pages);

    // Replace entire document
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      jsonlContent
    );

    await vscode.workspace.applyEdit(edit);
  }

  private async handleMqttUpload(config: any, pages: Page[], device: string): Promise<void> {
    // This will be implemented when we add MQTT support
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
        'All Files': ['*']
      },
      defaultUri: vscode.Uri.file(`pages.${format}`)
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview, iconFontPath: string = ''): string {
    // Get the local path to main script
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    );

    // Use a nonce to only allow specific scripts to run
    const nonce = getNonce();
    const isDev = this.context.extensionMode === vscode.ExtensionMode.Development;

    const csp = isDev
      ? `default-src 'none'; connect-src ${webview.cspSource} ws://localhost:8097; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' http://localhost:8097; font-src ${webview.cspSource} data:;`
      : `default-src 'none'; connect-src ${webview.cspSource}; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} data:;`;

    // Build @font-face for user-specified icon font (loaded via vscode-resource URI)
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
