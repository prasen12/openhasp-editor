# openHASP Page Editor

A Visual Studio Code extension that provides a graphical drag-and-drop editor for creating and editing openHASP pages.

## Features

- **Visual Page Editor** - Drag-and-drop interface for designing openHASP pages
- **Widget Palette** - 40+ supported openHASP widgets (buttons, sliders, gauges, etc.)
- **Property Inspector** - Edit widget properties through user-friendly forms
- **Multi-Page Management** - Create and manage multiple pages
- **Visual Preview** - See how your pages will look on the device
- **Template Library** - Pre-built components for common use cases
- **MQTT Integration** - Upload pages directly to openHASP devices
- **JSONL Support** - Native support for openHASP's JSONL format

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

1. Open a `.jsonl` file in VSCode
2. Right-click the editor and select "Open with openHASP Editor"
3. Or use the command palette: `openHASP: Open with openHASP Editor`

### Creating Pages

1. Click the "+" button in the pages panel to add a new page
2. Drag widgets from the palette onto the canvas
3. Select widgets to edit their properties in the inspector
4. Save the file to persist changes

### Uploading to Device

1. Click the upload button in the toolbar
2. Configure your MQTT broker settings
3. Select your openHASP device
4. Click "Upload" to send pages to the device

## Configuration

Configure the extension in VSCode settings:

```json
{
  "openhasp.mqtt.broker": "mqtt://localhost",
  "openhasp.mqtt.port": 1883,
  "openhasp.mqtt.username": "",
  "openhasp.mqtt.password": "",
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

### Phase 2: Basic Editor (In Progress)
- [ ] Widget palette with all widgets
- [ ] Canvas with grid overlay
- [ ] Drag-drop from palette to canvas
- [ ] Basic widget renderers
- [ ] Widget selection

### Phase 3: Property Editing
- [ ] Property inspector panel
- [ ] Dynamic property forms
- [ ] Property validation
- [ ] Real-time updates

### Phase 4: Advanced Features
- [ ] Undo/redo system
- [ ] Multi-selection
- [ ] Page management
- [ ] Keyboard shortcuts
- [ ] Copy/paste/duplicate

### Phase 5: Preview & Templates
- [ ] Visual preview panel
- [ ] Widget renderers for all types
- [ ] Template library
- [ ] Save/load templates

### Phase 6: MQTT Integration
- [ ] MQTT client
- [ ] Device discovery
- [ ] Upload command
- [ ] Progress notifications

### Phase 7: Polish & Testing
- [ ] Validation and error handling
- [ ] UI/UX improvements
- [ ] Unit tests
- [ ] Device testing
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
