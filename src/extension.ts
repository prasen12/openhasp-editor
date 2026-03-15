import * as vscode from 'vscode';
import * as path from 'path';
import { OpenHASPEditorProvider } from './editorProvider';
import { HaspFileTreeProvider } from './haspFileTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('openHASP Page Editor extension is now active');

  const editorProvider = new OpenHASPEditorProvider(context);

  // ── Activity Bar Tree View ─────────────────────────────────────────────────
  const treeProvider = new HaspFileTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('openhasp.filesView', treeProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.refreshFilesView', () => {
      treeProvider.refresh();
    })
  );

  // Watch for *.hasp.json file changes so the tree stays up to date
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.hasp.json');
  watcher.onDidCreate(() => treeProvider.refresh());
  watcher.onDidDelete(() => treeProvider.refresh());
  watcher.onDidChange(() => treeProvider.refresh());
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      OpenHASPEditorProvider.viewType,
      editorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
          enableFindWidget: false
        },
        supportsMultipleEditorsPerDocument: false
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.openEditor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await vscode.commands.executeCommand('vscode.openWith', editor.document.uri, OpenHASPEditorProvider.viewType);
      } else {
        vscode.window.showErrorMessage('No active editor');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.uploadToDevice', async () => {
      vscode.window.showInformationMessage('MQTT upload will be implemented in a future update');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.exportPages', async () => {
      vscode.window.showInformationMessage('Export will be handled by the editor');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.exportJsonl', async () => {
      // Find active custom editor document
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const input = activeTab?.input;
      if (input && typeof input === 'object' && 'uri' in input) {
        const uri = (input as { uri: vscode.Uri }).uri;
        const document = await vscode.workspace.openTextDocument(uri);
        await editorProvider.exportAsJsonl(document);
      } else {
        vscode.window.showErrorMessage('No active openHASP document found');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.importTemplate', async () => {
      vscode.window.showInformationMessage('Template import will be implemented in a future update');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.saveAsTemplate', async () => {
      vscode.window.showInformationMessage('Save as template will be implemented in a future update');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.newDesign', async () => {
      const description = await vscode.window.showInputBox({
        prompt: 'Design description (optional)',
        placeHolder: 'e.g. Main screen for thermostat',
      });
      if (description === undefined) return; // cancelled

      const deviceName = await vscode.window.showInputBox({
        prompt: 'Device name',
        placeHolder: 'e.g. My Device',
        value: 'My Device',
      });
      if (deviceName === undefined) return;

      const widthStr = await vscode.window.showInputBox({
        prompt: 'Display width (px)',
        value: '320',
        validateInput: v => (isNaN(Number(v)) || Number(v) < 1 ? 'Enter a positive number' : undefined),
      });
      if (widthStr === undefined) return;

      const heightStr = await vscode.window.showInputBox({
        prompt: 'Display height (px)',
        value: '240',
        validateInput: v => (isNaN(Number(v)) || Number(v) < 1 ? 'Enter a positive number' : undefined),
      });
      if (heightStr === undefined) return;

      const defaultFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      const saveUri = await vscode.window.showSaveDialog({
        filters: { 'openHASP Design': ['hasp.json'] },
        defaultUri: vscode.Uri.file(path.join(defaultFolder, 'design.hasp.json')),
      });
      if (!saveUri) return;

      const doc = {
        deviceProperties: {
          deviceName,
          description: description || undefined,
          width: Number(widthStr),
          height: Number(heightStr),
        },
        layout: [{ id: 1, comment: 'Page 1', widgets: [] }],
      };

      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(JSON.stringify(doc, null, 2) + '\n', 'utf8'));
      await vscode.commands.executeCommand('vscode.openWith', saveUri, OpenHASPEditorProvider.viewType);
    })
  );
}

export function deactivate() {
  console.log('openHASP Page Editor extension is now deactivated');
}
