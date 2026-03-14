import * as vscode from 'vscode';
import { OpenHASPEditorProvider } from './editorProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('openHASP Page Editor extension is now active');

  // Register the custom editor provider
  const editorProvider = new OpenHASPEditorProvider(context);
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

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.openEditor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        await vscode.commands.executeCommand('vscode.openWith', document.uri, OpenHASPEditorProvider.viewType);
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
    vscode.commands.registerCommand('openhasp.importTemplate', async () => {
      vscode.window.showInformationMessage('Template import will be implemented in a future update');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('openhasp.saveAsTemplate', async () => {
      vscode.window.showInformationMessage('Save as template will be implemented in a future update');
    })
  );
}

export function deactivate() {
  console.log('openHASP Page Editor extension is now deactivated');
}
