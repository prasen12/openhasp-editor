# openHASP Page Editor

A Visual Studio Code extension that provides a graphical drag-and-drop editor for creating and editing openHASP pages.

> **Using the extension?** See the [user guide](docs/EXTENSION_README.md) — settings, Home Assistant
> bindings, templates, and the JSONL/YAML generation workflow. That file is what ships inside the
> `.vsix` and becomes the marketplace page (see [RELEASING.md](RELEASING.md)); this README is for
> working on the extension itself.

## Features

- **Visual Page Editor** - Drag-and-drop interface for designing openHASP pages
- **Widget Palette** - 22 supported openHASP widgets (buttons, sliders, gauges, etc.)
- **Property Inspector** - Widget-specific property sections for detailed customization
- **Multi-Page Management** - Create and manage multiple pages
- **Visual Preview** - See how your pages will look on the device
- **JSONL Support** - Native support for openHASP's JSONL format
- **Design Files** - Rich `.hasp.json` design format with device properties
- **JSONL Import** - Import existing `.jsonl` files as design files
- **JSONL Export** - Export design files back to `.jsonl` for device deployment
- **openHASP Explorer** - Activity bar view for browsing design files
- **Home Assistant Config** - Generate HA configuration from your design files
- **Widget Navigation** - Jump directly to specific pages and widgets

## Supported Widgets

### Containers
- screen, container, window, tabview, tab, msgbox, tileview

### Controls
- button, checkbox, switch, slider, dropdown, textarea, spinbox, color picker, keyboard

### Visualization
- label, gauge, bar, linemeter, LED, arc, spinner, chart, datetime

### Selectors
- dropdown, roller, list, table, calendar, menu

### Graphics
- line, image, animated image, canvas, mask, QR code

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 to open a new VSCode window with the extension loaded

### From VSIX

1. Download the latest `.vsix` file from releases
2. In VSCode, go to Extensions view
3. Click the `...` menu and select "Install from VSIX..."
4. Select the downloaded file

## Usage

### Opening the Editor

1. Open a `.jsonl` or `.hasp.json` file in VSCode
2. Right-click the editor and select "Open with openHASP Editor"
3. Or use the command palette: `openHASP: Open with openHASP Editor`

### Creating Pages

1. Click the "+" button in the pages panel to add a new page
2. Drag widgets from the palette onto the canvas
3. Select widgets to edit their properties in the inspector
4. Save the file to persist changes

### Importing a JSONL File

Use the openHASP Explorer in the activity bar and click the import button, or run `openHASP: Import JSONL as Design File` from the command palette. This converts a plain `.jsonl` file into a `.hasp.json` design file with full editor support.

### Exporting to JSONL

Click the export button in the editor title bar or run `openHASP: Export as JSONL` to produce a `.jsonl` file ready for deployment to an openHASP device.

### Generating Home Assistant Configuration

Right-click a design file in the openHASP Explorer and select "Generate Home Assistant Config", or run `openHASP: Generate Home Assistant Config` from the command palette.

## Configuration

Configure the extension in VSCode settings:

```json
{
  "openhasp.editor.canvasWidth": 720,
  "openhasp.editor.canvasHeight": 480,
  "openhasp.editor.gridSize": 10,
  "openhasp.editor.snapToGrid": true
}
```

## Development

### Building

```bash
npm install
npm run compile
```

### Watching for Changes

```bash
npm run watch
```

### Running Tests

```bash
npm test
```

### Packaging

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VSCode.

## Project Structure

```
openhasp-editor/
├── src/                    # Extension host code (Node.js)
│   ├── extension.ts        # Extension activation
│   ├── editorProvider.ts   # Custom editor provider
│   ├── jsonl/              # JSONL parser/serializer
│   └── types/              # TypeScript types
├── webview/                # React UI (Browser)
│   ├── App.tsx             # Main React component
│   ├── store/              # Zustand state management
│   ├── components/         # React components
│   └── utils/              # Utility functions
└── dist/                   # Compiled output
```

## Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Extension scaffold
- [x] JSONL parser/serializer
- [x] Custom editor provider
- [x] React app with Zustand stores
- [x] Basic webview communication

### Phase 2: Basic Editor ✅
- [x] Widget palette with 17 widgets
- [x] Canvas with grid overlay
- [x] Drag-drop from palette to canvas
- [x] Basic widget renderers
- [x] Widget selection

### Phase 3: Property Editing ✅
- [x] Property inspector panel
- [x] Widget-specific property sections
- [x] Real-time updates

### Phase 4: Advanced Features ✅
- [x] JSONL import/export
- [x] Design file format (`.hasp.json`)
- [x] openHASP Explorer view
- [x] Home Assistant config generation
- [x] Widget navigation

### Phase 5: Polish & Testing
- [ ] Full test coverage
- [ ] Performance optimization
- [ ] Additional widget renderers
- [ ] Documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Resources

- [openHASP Documentation](https://www.openhasp.com/)
- [openHASP GitHub](https://github.com/HASwitchPlate/openHASP)
- [LVGL Documentation](https://docs.lvgl.io/)

## Support

If you encounter any issues or have feature requests, please file an issue on GitHub.
