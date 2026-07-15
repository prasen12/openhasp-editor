import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('openHASP');

/** Logs a timestamped line to the shared "openHASP" Output channel. Never pass secrets/tokens/passwords. */
export function log(message: string): void {
  outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}
