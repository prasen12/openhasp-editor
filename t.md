Let me read the key React files before explaining.

Read index.tsx
Read useSelectionStore.ts
Read useHistoryStore.ts
Read EditorLayout.tsx
Read WidgetRenderer.tsx
Here's a detailed walkthrough, building from first principles.

What React Is (the foundation)
React is a library for building UIs out of components — JavaScript functions that return HTML-like markup (called JSX). When data changes, React automatically re-renders only the parts of the screen that need updating.


// A component is just a function that returns markup
const Greeting: React.FC = () => {
  return <h1>Hello!</h1>;
};
React.FC just means "this is a React Function Component".

Entry Point: index.tsx

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
This is the bootstrap. The extension's HTML has <div id="root"></div>. React finds that div and mounts the entire app inside it. From this point, React owns that div — it manages all the DOM inside it.

JSX: HTML inside JavaScript
The <App />, <Canvas /> etc. you see are not real HTML tags — they're JSX, which Webpack/TypeScript compiles into regular function calls:


// What you write:
<Canvas />

// What it compiles to:
React.createElement(Canvas, null)
Components and Props
Props are how parent components pass data down to children. Think of them as function arguments.

In EditorLayout.tsx:


interface EditorLayoutProps {
  leftPanel: React.ReactNode;   // anything renderable
  canvas: React.ReactNode;
  rightPanel: React.ReactNode;
  topBar?: React.ReactNode;     // ? means optional
  bottomBar?: React.ReactNode;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({ leftPanel, canvas, rightPanel, ... }) => {
  return (
    <div className="editor-layout">
      <div className="editor-left-panel">{leftPanel}</div>
      <div className="editor-canvas-area">{canvas}</div>
      <div className="editor-right-panel">{rightPanel}</div>
    </div>
  );
};
EditorLayout doesn't know or care what goes in those panels — the caller (App.tsx) decides:


<EditorLayout
  leftPanel={<><PageManager /><WidgetPalette /></>}
  canvas={<Canvas />}
  rightPanel={<PropertiesPanel />}
/>
The <>...</> is a "fragment" — a way to group multiple elements without adding an extra div.

State: useState
State is data that, when changed, causes the component to re-render.

In App.tsx:


const [activeCanvasWidget, setActiveCanvasWidget] = useState<Widget | null>(null);
activeCanvasWidget — the current value (starts as null)
setActiveCanvasWidget — the only way to change it
<Widget | null> — TypeScript type: either a Widget object or null
Rule: You never modify state directly (activeCanvasWidget = something won't work). You always call the setter, which triggers a re-render with the new value.

This is used for the drag overlay — when you start dragging a widget, setActiveCanvasWidget(widget) is called, which causes the DragOverlay to re-render and show the preview.

Effects: useEffect
useEffect runs side-effects after a render. The second argument (the array) controls when it runs again.

In App.tsx:


// Runs once on mount (empty array = no dependencies)
useEffect(() => {
  vscode.ready();
  window.addEventListener('message', handleMessage);

  return () => {
    // Cleanup runs when component unmounts
    window.removeEventListener('message', handleMessage);
  };
}, [setPages, setFileName]);

// Runs whenever `pages` or `isDirty` changes
useEffect(() => {
  if (isDirty && pages.length > 0) {
    vscode.updatePages(pages);   // sync to extension/file
  }
}, [pages, isDirty]);

// Debounced history snapshot — waits 500ms after last change
useEffect(() => {
  const timer = setTimeout(() => {
    pushHistory(pages);
  }, 500);
  return () => clearTimeout(timer);  // cancel if pages changes again before 500ms
}, [pages, pushHistory]);
Zustand: Global State Stores
useState is local to a component. But multiple components need the same data (e.g., both Canvas and PropertiesPanel need to know which widget is selected). Passing props through many levels ("prop drilling") gets messy.

Zustand solves this with a global store — a shared object any component can read from or write to, and when it changes, only the components that use it re-render.

There are three stores:

useEditorStore.ts — the main data

pages: Page[]         ← all pages and their widgets
currentPageId: number ← which page tab you're on
isDirty: boolean      ← has unsaved changes?
fileName: string      ← the filename shown in the topbar
Any component can call:


const { pages, updateWidget } = useEditorStore();
// updateWidget will update the store → all components using it re-render
useSelectionStore.ts — selection

selectedWidgetIds: number[]  ← IDs of selected widgets
CanvasWidget uses this to show/hide the blue selection border. PropertiesPanel uses it to know which widget's properties to display. Neither knows about the other — they just both read from the same store.


// In CanvasWidget:
const selected = isSelected(widget.id);  // re-renders when selection changes

// In PropertiesPanel:
const { selectedWidgetIds } = useSelectionStore();
const widget = currentPage?.widgets.find(w => w.id === selectedWidgetIds[0]);
useHistoryStore.ts — undo/redo
Stores two stacks: past (previous states) and future (redo states).


past:   [ [state1], [state2], [state3] ]  ← oldest to newest
future: [ [state4] ]                       ← only exists after undo
When you undo: the last item from past becomes the current state, and the current state gets pushed to future. It stores deep clones (via JSON.parse(JSON.stringify(...))) so each snapshot is independent — changing the current state can't corrupt history.

Component Tree
Here's how the components nest:


App
├── DndContext          (drag-and-drop provider — wraps everything)
│   ├── EditorLayout    (pure layout — 3 columns + top/bottom bars)
│   │   ├── topBar:     page name + dirty indicator
│   │   ├── leftPanel:
│   │   │   ├── PageManager       (lists pages, add/switch)
│   │   │   └── WidgetPalette     (draggable widget types)
│   │   │       └── DraggableWidget × N
│   │   ├── canvas:
│   │   │   └── Canvas            (the 240×320 drop target)
│   │   │       ├── Grid          (SVG background grid)
│   │   │       └── CanvasWidget × N   (each placed widget)
│   │   │           └── WidgetRenderer → LabelWidget / ButtonWidget / etc.
│   │   └── rightPanel:
│   │       └── PropertiesPanel   (edit selected widget's properties)
│   └── DragOverlay     (floating preview shown while dragging)
How a Widget Renders
WidgetRenderer is a router — it receives a widget object and picks the right renderer:


switch (widget.obj) {
  case 'label':  return <LabelWidget widget={widget} />;
  case 'btn':    return <ButtonWidget widget={widget} />;
  // ...
  default:       return <GenericWidget widget={widget} />;
}
Each widget component reads the widget's properties and converts them to CSS/SVG. For example, ButtonWidget turns bg_color, text_color, radius, text into a styled <div>.

The Render Cycle in Practice
When you drag a widget from the palette to the canvas:

DragOverlay shows a badge (because activePaletteDefinition state was set in onDragStart)
On drop, handleDragEnd fires → computes x/y → calls addWidget on the editor store
Zustand updates pages in the store → every component subscribed to pages re-renders
Canvas re-renders → maps widgets array → renders a new CanvasWidget
The useEffect watching isDirty fires → calls vscode.updatePages() → the file is saved
How would debug the React code. For example how do I do step-through debugging?
Globpattern: ".vscode/**"
Found 2 files
Read launch.json
Read tasks.json
There are two separate debuggers needed here because the code runs in two different processes.

Part 1: Debugging the Extension (Node.js side)
This covers extension.ts and editorProvider.ts. This is straightforward because VSCode has built-in Node.js debugging.

Steps:

Press F5 (or Run → Start Debugging → "Run Extension")
A second VSCode window opens — the Extension Development Host
Back in your first window, click in the gutter next to any line number in editorProvider.ts to set a breakpoint (red dot)
In the second window, open a .jsonl file — execution will pause at your breakpoint
Use the debug toolbar to step over (F10), step into (F11), inspect variables in the sidebar
Part 2: Debugging the React/Webview side
This is trickier. The webview runs in a sandboxed browser context, not Node.js. VSCode's debugger can't attach to it directly — you use Chrome DevTools instead.

Step 1: Fix the source maps
Currently webpack.config.js has devtool: 'nosources-source-map' for the webview, which generates maps but strips out the original source code. You need source-map to see your actual .tsx files in DevTools:

Read webpack.config.js
Edit webpack.config.js
Modified
Step 2: Open the Webview DevTools
After pressing F5 and opening a .jsonl file in the Extension Development Host:

Open the Command Palette (Cmd+Shift+P)
Run: Developer: Open Webview Developer Tools
A Chrome DevTools panel opens
Step 3: Navigate to your source files
In DevTools:

Click the Sources tab
In the file tree on the left, look for webpack:// → you'll find your original .tsx files listed there (this is what the source map enables)
Click any file (e.g. App.tsx) — you'll see your original TypeScript/React code
Click a line number to set a breakpoint

Sources
└── webpack://
    └── webview/
        ├── App.tsx          ← your original files
        ├── store/
        │   └── useEditorStore.ts
        └── components/
            └── Canvas/
                └── Canvas.tsx
What you can do in DevTools
Console tab — console.log() statements from your React code appear here. Very useful for quick inspection:


// Add temporarily to any component:
console.log('widget dragged:', widget, 'delta:', delta);
Sources tab / Breakpoints — execution pauses, you can:

Hover over any variable to see its value
Inspect the Scope panel on the right (shows all local variables, closures, and the store state)
Use Step Over (F10) to run the next line
Use Step Into (F11) to jump inside a function call
React DevTools — install the React Developer Tools Chrome extension, then a Components tab appears in DevTools showing the full component tree with each component's current props and state.

Summary of what debugs what
What you're debugging	Tool
extension.ts, editorProvider.ts	VSCode built-in debugger (F5)
App.tsx, stores, components	Webview DevTools → Sources tab
Quick values / logging	Webview DevTools → Console tab
Component props & state	React DevTools Components tab
React Developer tools can not be installed in vscode
You're right, that was bad advice. The webview's DevTools doesn't support browser extensions. Here are the actual options:

Option 1: Standalone React DevTools
There's an npm package that runs React DevTools as a standalone Electron app outside the browser, and connects via a local WebSocket. You inject one script into the page and it works.

Setup
Terminal 1 — install and run the standalone app:


npx react-devtools
This opens the DevTools window and listens on localhost:8097.

Modify the webview HTML to connect to it — but first the CSP must be loosened for dev. Change editorProvider.ts to inject the script only during development:

Read editorProvider.ts (lines 123-162)
Edit editorProvider.ts
Added 10 lines
The reactDevTools script has no nonce attribute — that's intentional. The CSP in dev mode explicitly allows http://localhost:8097 in script-src, so nonce isn't needed for it.

To use it:

Terminal: npx react-devtools — leaves it running, waiting for a connection
F5 in VSCode to launch the Extension Development Host
Open a .jsonl file — the standalone DevTools window connects automatically
You get a Components tab showing the full tree, and a Profiler tab for performance
Option 2: Inspect Zustand state from the Console
Since you're already using Zustand, you can expose the stores on window for quick console inspection — no extra tooling needed:

Read index.tsx
Edit index.tsx
Added 13 lines
Now in the Webview DevTools Console you can type:


window.__editor.getState().pages        // see all pages + widgets
window.__editor.getState().currentPageId
window.__selection.getState().selectedWidgetIds
window.__history.getState().past.length  // how many undo steps
Summary
Goal	How
Step-through breakpoints in .tsx	Webview DevTools → Sources tab (works now with source-map)
Inspect component tree & props	npx react-devtools standalone
Inspect store state on demand	window.__editor.getState() in Console
Quick logging	console.log(...) — appears in Console tab
Debug extension/Node.js code	VSCode built-in debugger (F5 breakpoints in .ts files)
