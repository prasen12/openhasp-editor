import * as vscode from 'vscode';
import * as path from 'path';
import { HaspJsonParser } from './haspJson/parser';
import { Page, Widget } from './types/models';
import { OpenHASPEditorProvider } from './editorProvider';

// ─── Tree item types ─────────────────────────────────────────────────────────

export type ItemKind = 'file' | 'page' | 'widget';

export class HaspTreeItem extends vscode.TreeItem {
  readonly kind: ItemKind;
  readonly fileUri: vscode.Uri;
  // page / widget items carry their page's full widget list for child lookup
  readonly pageWidgets?: Widget[];
  readonly widgetId?: number;

  constructor(
    label: string,
    collapsible: vscode.TreeItemCollapsibleState,
    kind: ItemKind,
    fileUri: vscode.Uri,
    opts?: {
      description?: string;
      tooltip?: string;
      iconPath?: vscode.ThemeIcon;
      pageWidgets?: Widget[];
      widgetId?: number;
      contextValue?: string;
    }
  ) {
    super(label, collapsible);
    this.kind = kind;
    this.fileUri = fileUri;
    this.description = opts?.description;
    this.tooltip = opts?.tooltip;
    this.iconPath = opts?.iconPath;
    this.pageWidgets = opts?.pageWidgets;
    this.widgetId = opts?.widgetId;
    this.contextValue = opts?.contextValue ?? kind;

    // All items open the file when clicked
    this.command = {
      command: 'vscode.openWith',
      title: 'Open',
      arguments: [fileUri, OpenHASPEditorProvider.viewType],
    };
  }
}

// ─── Helper: build a label for a widget ──────────────────────────────────────

function widgetLabel(w: Widget): string {
  if (w.name) return `${w.obj} — ${w.name}`;
  return `${w.obj} #${w.id}`;
}

function pageLabel(p: Page): string {
  const title = p.name || p.comment;
  return title ? `Page ${p.id}: ${title}` : `Page ${p.id}`;
}

function widgetIcon(obj: string): vscode.ThemeIcon {
  switch (obj) {
    case 'btn':
    case 'button':
    case 'imgbtn':
      return new vscode.ThemeIcon('button');
    case 'label':
      return new vscode.ThemeIcon('symbol-string');
    case 'slider':
    case 'bar':
      return new vscode.ThemeIcon('grabber');
    case 'switch':
    case 'checkbox':
      return new vscode.ThemeIcon('check');
    case 'gauge':
    case 'arc':
    case 'linemeter':
      return new vscode.ThemeIcon('dial');
    case 'obj':
    case 'container':
    case 'cont':
    case 'window':
    case 'tabview':
    case 'tab':
      return new vscode.ThemeIcon('symbol-namespace');
    case 'image':
    case 'img':
    case 'animimage':
      return new vscode.ThemeIcon('file-media');
    default:
      return new vscode.ThemeIcon('symbol-variable');
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class HaspFileTreeProvider implements vscode.TreeDataProvider<HaspTreeItem> {
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<HaspTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HaspTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HaspTreeItem): Promise<HaspTreeItem[]> {
    // ── Root: list all *.hasp.json files in the workspace ──────────────────
    if (!element) {
      const files = await vscode.workspace.findFiles(
        '**/*.hasp.json',
        '{**/node_modules/**,**/dist/**}'
      );

      if (files.length === 0) {
        // Return a placeholder so the view isn't blank
        const placeholder = new HaspTreeItem(
          'No .hasp.json files found',
          vscode.TreeItemCollapsibleState.None,
          'file',
          vscode.Uri.file(''),
        );
        placeholder.command = undefined;
        placeholder.contextValue = 'placeholder';
        return [placeholder];
      }

      // Sort alphabetically by filename
      files.sort((a, b) => path.basename(a.fsPath).localeCompare(path.basename(b.fsPath)));

      return files.map(uri => {
        const item = new HaspTreeItem(
          path.basename(uri.fsPath),
          vscode.TreeItemCollapsibleState.Collapsed,
          'file',
          uri,
          {
            description: vscode.workspace.asRelativePath(path.dirname(uri.fsPath)),
            tooltip: uri.fsPath,
            iconPath: new vscode.ThemeIcon('file-code'),
          }
        );
        return item;
      });
    }

    // ── File node: parse and return pages ──────────────────────────────────
    if (element.kind === 'file') {
      try {
        const document = await vscode.workspace.openTextDocument(element.fileUri);
        const { pages, deviceProperties } = HaspJsonParser.parse(document.getText());

        if (pages.length === 0) {
          const empty = new HaspTreeItem(
            'No pages',
            vscode.TreeItemCollapsibleState.None,
            'page',
            element.fileUri,
          );
          empty.command = undefined;
          empty.contextValue = 'placeholder';
          return [empty];
        }

        return pages.map(page => {
          const hasChildren = page.widgets.length > 0;
          return new HaspTreeItem(
            pageLabel(page),
            hasChildren
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None,
            'page',
            element.fileUri,
            {
              description: `${page.widgets.length} widget${page.widgets.length !== 1 ? 's' : ''}`,
              tooltip: page.comment ?? page.name ?? `Page ${page.id}`,
              iconPath: new vscode.ThemeIcon('layers'),
              pageWidgets: page.widgets,
            }
          );
        });
      } catch (e) {
        const errItem = new HaspTreeItem(
          'Failed to parse file',
          vscode.TreeItemCollapsibleState.None,
          'file',
          element.fileUri,
        );
        errItem.command = undefined;
        errItem.iconPath = new vscode.ThemeIcon('error');
        return [errItem];
      }
    }

    // ── Page / widget node: return child widgets ───────────────────────────
    if ((element.kind === 'page' || element.kind === 'widget') && element.pageWidgets) {
      const parentId = element.kind === 'page' ? undefined : element.widgetId;
      const children = element.pageWidgets.filter(w =>
        element.kind === 'page' ? !w.parentid : w.parentid === parentId
      );

      return children.map(w => {
        const grandchildren = element.pageWidgets!.filter(c => c.parentid === w.id);
        return new HaspTreeItem(
          widgetLabel(w),
          grandchildren.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          'widget',
          element.fileUri,
          {
            description: w.description,
            tooltip: w.description ?? w.name ?? `${w.obj} #${w.id}`,
            iconPath: widgetIcon(w.obj),
            pageWidgets: element.pageWidgets,
            widgetId: w.id,
          }
        );
      });
    }

    return [];
  }
}
