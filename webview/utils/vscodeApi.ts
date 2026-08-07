import { Page, DeviceProperties } from '../types';

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeApi;
  }
}

interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

class VSCodeAPIWrapper {
  private readonly vscodeApi: VSCodeApi | undefined;

  constructor() {
    if (typeof window.acquireVsCodeApi === 'function') {
      this.vscodeApi = window.acquireVsCodeApi();
    }
  }

  public postMessage(message: any): void {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.log('[Mock] postMessage:', message);
    }
  }

  public getState(): any {
    if (this.vscodeApi) {
      return this.vscodeApi.getState();
    }
    return null;
  }

  public setState(state: any): void {
    if (this.vscodeApi) {
      this.vscodeApi.setState(state);
    }
  }

  public updatePages(pages: Page[], deviceProperties?: DeviceProperties): void {
    this.postMessage({ type: 'update', pages, deviceProperties });
  }

  public exportPages(pages: Page[], format: 'jsonl' | 'json'): void {
    this.postMessage({ type: 'export', pages, format });
  }

  public ready(): void {
    this.postMessage({ type: 'ready' });
  }

  public requestHaEntities(): void {
    this.postMessage({ type: 'haRequestEntities' });
  }

  public requestHaServices(): void {
    this.postMessage({ type: 'haRequestServices' });
  }

  public validateHaTemplate(requestId: string, template: string): void {
    this.postMessage({ type: 'haValidateTemplate', requestId, template });
  }

  public evaluateHaWidgets(requestId: string, widgets: Array<{ key: string; obj: string; haBinding: unknown }>): void {
    this.postMessage({ type: 'haEvaluateWidgets', requestId, widgets });
  }
}

export const vscode = new VSCodeAPIWrapper();
