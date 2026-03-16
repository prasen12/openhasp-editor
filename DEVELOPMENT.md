# Development Guide

## Phase 1: Core Infrastructure ✅ COMPLETED

We have successfully completed Phase 1 of the openHASP Page Editor VSCode extension. Here's what has been implemented:

### Files Created

#### Extension Host (Node.js/VSCode API)
1. **[package.json](package.json)** - Extension manifest with commands, configuration, and dependencies
2. **[src/extension.ts](src/extension.ts)** - Extension activation and command registration
3. **[src/editorProvider.ts](src/editorProvider.ts)** - Custom text editor provider implementation
4. **[src/jsonl/parser.ts](src/jsonl/parser.ts)** - JSONL to Page[] parser
5. **[src/jsonl/serializer.ts](src/jsonl/serializer.ts)** - Page[] to JSONL serializer
6. **[src/types/models.ts](src/types/models.ts)** - TypeScript type definitions

#### Webview (React/Browser)
1. **[webview/index.tsx](webview/index.tsx)** - React entry point
2. **[webview/App.tsx](webview/App.tsx)** - Main React application component
3. **[webview/types.ts](webview/types.ts)** - Webview type definitions
4. **[webview/store/useEditorStore.ts](webview/store/useEditorStore.ts)** - Main editor state management
5. **[webview/store/useSelectionStore.ts](webview/store/useSelectionStore.ts)** - Widget selection state
6. **[webview/store/useHistoryStore.ts](webview/store/useHistoryStore.ts)** - Undo/redo history management
7. **[webview/utils/vscodeApi.ts](webview/utils/vscodeApi.ts)** - VSCode API wrapper for webview

#### Configuration
1. **[tsconfig.json](tsconfig.json)** - TypeScript config for extension
2. **[tsconfig.webview.json](tsconfig.webview.json)** - TypeScript config for webview
3. **[webpack.config.js](webpack.config.js)** - Webpack build configuration
4. **[.eslintrc.json](.eslintrc.json)** - ESLint configuration
5. **[.gitignore](.gitignore)** - Git ignore patterns
6. **[.vscodeignore](.vscodeignore)** - Files to exclude from extension package
7. **[.vscode/launch.json](.vscode/launch.json)** - Debug configuration
8. **[.vscode/tasks.json](.vscode/tasks.json)** - Build tasks

#### Documentation & Examples
1. **[README.md](README.md)** - Main documentation
2. **[DEVELOPMENT.md](DEVELOPMENT.md)** - This file
3. **[examples/sample.jsonl](examples/sample.jsonl)** - Sample JSONL file for testing

### Features Implemented

#### ✅ JSONL Parser
- Parses openHASP JSONL format
- Handles page headers with comments
- Extracts widgets with all properties
- Validates JSON syntax
- Robust error handling

#### ✅ JSONL Serializer
- Converts Page[] back to JSONL format
- Maintains page order
- Sorts widgets by ID
- Removes undefined/null properties
- Preserves format for round-trip fidelity

#### ✅ Custom Editor Provider
- Registers for `.jsonl` and `.hasp` files
- Creates webview with React app
- Handles document synchronization
- Implements bidirectional communication
- Auto-updates on external changes

#### ✅ State Management (Zustand)
- **Editor Store**: Pages, widgets, CRUD operations
- **Selection Store**: Widget selection tracking
- **History Store**: Undo/redo with 50-operation limit

#### ✅ Webview Communication
- Extension → Webview messages (init, documentChanged, navigateTo)
- Webview → Extension messages (update, export, ready)
- Automatic state synchronization

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      VSCode Extension                        │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  extension.ts  │────────>│ editorProvider.ts │           │
│  └────────────────┘         └──────────────────┘           │
│         │                            │                      │
│         │                            │                      │
│         │                    ┌───────▼───────┐             │
│         │                    │  JSONL Parser │             │
│         │                    │ & Serializer  │             │
│         │                    └───────────────┘             │
│         │                                                   │
│         └───────────────┐                                   │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ postMessage / addEventListener
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Webview (React)                         │
│                                                              │
│  ┌──────────┐         ┌──────────────────┐                 │
│  │ App.tsx  │────────>│  Zustand Stores  │                 │
│  └──────────┘         └──────────────────┘                 │
│       │                        │                            │
│       │               ┌────────┼────────┐                  │
│       │               │        │        │                  │
│       │          ┌────▼──┐ ┌──▼───┐ ┌──▼──────┐          │
│       │          │ Editor│ │Select│ │ History │          │
│       │          │ Store │ │Store │ │ Store   │          │
│       │          └───────┘ └──────┘ └─────────┘          │
│       │                                                     │
│       └────> vscodeApi.ts (Communication Layer)            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Testing the Extension

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run compile
```

### 3. Run in Development
1. Open this folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Open the [examples/sample.jsonl](examples/sample.jsonl) file
4. Right-click and select "Reopen Editor With..." → "openHASP Page Editor"
5. The editor should load and display page information

### 4. Testing Features

#### Test JSONL Parsing
- Open `examples/sample.jsonl`
- Check that the webview shows:
  - Pages loaded: 2
  - Widgets on page 1: 5

#### Test Document Sync
- Edit the JSONL file in text mode
- Switch back to visual editor
- Changes should be reflected

#### Test Updates
- (Will be testable when UI is built)

## Next Steps: Phase 2 - Basic Editor

The next phase will implement the visual editor UI:

### Components to Build

1. **Widget Palette** ([webview/components/Palette/WidgetPalette.tsx](webview/components/Palette/WidgetPalette.tsx))
   - List all 40+ widget types
   - Group by category
   - Draggable items using @dnd-kit/core

2. **Canvas** ([webview/components/Canvas/Canvas.tsx](webview/components/Canvas/Canvas.tsx))
   - Drop target for widgets
   - Grid overlay
   - Zoom and pan controls
   - Widget rendering

3. **Widget Renderers** ([webview/rendering/](webview/rendering/))
   - Create React components for each widget type
   - Start with: label, button, slider, gauge, arc
   - CSS-based visual approximations

4. **Layout Components** ([webview/components/Layout/](webview/components/Layout/))
   - EditorLayout: Main container
   - Toolbar: Top toolbar with actions
   - StatusBar: Bottom status bar

### Implementation Order

1. Create basic layout structure
2. Implement widget palette
3. Add canvas component with grid
4. Implement drag-drop from palette to canvas
5. Create widget renderers for common widgets
6. Add selection functionality

## Development Tips

### Hot Reload
```bash
npm run watch
```
This will watch for file changes and rebuild automatically. You'll need to reload the Extension Development Host window (Cmd+R / Ctrl+R) to see changes.

### Debugging Extension Host
- Set breakpoints in `src/**/*.ts` files
- Press F5 to start debugging
- Breakpoints will hit in the main VSCode window

### Debugging Webview
- Open the Extension Development Host
- Open Command Palette: `Developer: Open Webview Developer Tools`
- Use Chrome DevTools to debug React code
- Console logs from `webview/**/*.tsx` appear here

### TypeScript Errors
```bash
# Check extension code
npx tsc --noEmit -p tsconfig.json

# Check webview code
npx tsc --noEmit -p tsconfig.webview.json
```

### Build Production Package
```bash
npm run package
```

Creates optimized production build in `dist/`

### Create VSIX Package
```bash
npx vsce package
```

Creates `.vsix` file that can be installed in VSCode

## Code Style

- Use TypeScript strict mode
- Prefer functional React components
- Use Zustand for state management
- Follow VSCode extension naming conventions
- Add JSDoc comments for public APIs

## File Organization

```
src/          - Extension host code (runs in Node.js)
webview/      - React UI code (runs in browser)
dist/         - Compiled output
examples/     - Sample files for testing
templates/    - Built-in widget templates (to be added)
```

## Dependencies

### Runtime Dependencies
- `react` & `react-dom` - UI framework
- `zustand` - State management
- `@dnd-kit/core` - Drag and drop
- `re-resizable` - Widget resizing

### Dev Dependencies
- `typescript` - Type checking
- `webpack` - Bundling
- `ts-loader` - TypeScript loader
- `@vscode/test-electron` - Testing framework

## Troubleshooting

### "Extension host terminated unexpectedly"
- Check extension logs in Output panel
- Look for TypeScript errors in Problems panel
- Rebuild: `npm run compile`

### Webview not loading
- Check browser console in Webview Developer Tools
- Verify `dist/webview.js` exists
- Check CSP (Content Security Policy) in HTML

### JSONL not parsing
- Validate JSON syntax: each line must be valid JSON
- Check for trailing commas or formatting issues
- Test with `examples/sample.jsonl`

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [openHASP Documentation](https://www.openhasp.com/)
- [LVGL Documentation](https://docs.lvgl.io/)

## Contributing

When adding new features:

1. Create feature branch
2. Update this document
3. Add tests if applicable
4. Update README.md
5. Submit pull request

## License

MIT License - See LICENSE file
