# Troubleshooting Guide

## Blank/White Screen When Opening Editor

If you see a blank screen when opening the editor, follow these steps:

### Step 1: Check Webview Developer Tools

1. With the editor open, press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Developer: Open Webview Developer Tools`
3. Press Enter
4. Check the **Console** tab for errors or messages

You should see messages like:
```
Webview script loaded
App component rendering...
App useEffect running - notifying extension
```

### Step 2: Check What You See

#### If you see errors in console:
- Note the error message
- Check if it mentions missing files or modules
- Try rebuilding: `npm run compile`

#### If you see "Root element not found":
- This means the HTML isn't loading properly
- Try closing and reopening the editor

#### If you see the logging messages but blank screen:
- Check the **Elements** tab in DevTools
- Look for the `<div id="root">` element
- Check if it has any children

### Step 3: Verify the Build

```bash
# Make sure you have the compiled files
ls -la dist/

# You should see:
# extension.js (15-16 KB)
# webview.js (1.4-1.5 MB)
```

### Step 4: Try These Solutions

#### Solution 1: Clean Rebuild
```bash
rm -rf dist/ node_modules/
npm install
npm run compile
```

Then press F5 again.

#### Solution 2: Check File Association

1. Right-click on `examples/sample.jsonl`
2. Select "Reopen Editor With..."
3. Make sure "openHASP Page Editor" is listed
4. Select it

#### Solution 3: Check Extension is Activated

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `Developer: Show Running Extensions`
3. Look for "openhasp-editor" in the list
4. Check if there are any errors

### Step 5: Create a Test File

If the sample file doesn't work, try creating a minimal test:

**test.jsonl**:
```json
{"page":1,"comment":"Test Page"}
{"id":1,"obj":"label","x":10,"y":10,"w":100,"h":30,"text":"Hello"}
```

1. Save this as `test.jsonl`
2. Right-click → "Reopen Editor With..." → "openHASP Page Editor"

### Step 6: Check Console Output

Look for messages in the **Extension Host** output:

1. View → Output
2. Select "Extension Host" from dropdown
3. Look for "openHASP Page Editor extension is now active"

## Common Issues

### Issue: "Cannot find module" errors

**Solution**: Reinstall dependencies
```bash
npm install
```

### Issue: TypeScript errors

**Solution**: Check TypeScript compilation
```bash
npx tsc --noEmit -p tsconfig.json
npx tsc --noEmit -p tsconfig.webview.json
```

### Issue: Webview shows old code

**Solution**:
1. Reload the Extension Development Host window (`Cmd+R` / `Ctrl+R`)
2. Or close and reopen the file

### Issue: Extension doesn't activate

**Solution**: Check `package.json` activation events:
```json
"activationEvents": [
  "onCustomEditor:openhasp.pageEditor",
  "onCommand:openhasp.openEditor",
  "onLanguage:jsonl"
]
```

## Debugging Steps

### Enable Verbose Logging

The latest build includes debug logging. Check the Webview DevTools console for:

1. `Webview script loaded` - Script is running
2. `Root element found, rendering app...` - React is initializing
3. `App component rendering...` - App component is mounting
4. `App useEffect running - notifying extension` - Communication starting
5. `Received message from extension: init` - Got data from extension

### What Each Message Means

- **No messages at all**: Webview script isn't loading
  - Check if `dist/webview.js` exists
  - Rebuild: `npm run compile`

- **"Root element not found"**: HTML structure issue
  - Check editorProvider.ts `getHtmlForWebview()` method

- **Script loads but no "App component"**: React not initializing
  - Check for JavaScript errors in console
  - Verify all imports are correct

- **App renders but no "init" message**: Extension not sending data
  - Check extension logs in Output panel
  - Verify editorProvider is posting message

## Quick Diagnostics

Run this in the Webview DevTools console:

```javascript
// Check if root exists
console.log('Root:', document.getElementById('root'));

// Check if VSCode API is available
console.log('VSCode API:', typeof acquireVsCodeApi);

// Try manual message
window.postMessage({ type: 'ready' }, '*');
```

## Still Having Issues?

1. **Check the build output** for any warnings
2. **Look at examples/sample.jsonl** - make sure it's valid JSON
3. **Try the watch mode**: `npm run watch` and reload after changes
4. **Check VSCode version**: Requires VSCode 1.75.0 or higher

## Report an Issue

If you're still stuck, please provide:

1. VSCode version (`Help → About`)
2. Operating System
3. Console errors from Webview DevTools
4. Output from Extension Host
5. Steps to reproduce

## Expected Behavior

When working correctly, you should see:

1. **Left Panel**: Pages list + Widget palette with categories
2. **Center**: 240x320px gray canvas with grid
3. **Right Panel**: "Properties" header
4. **Bottom**: "2 pages • X widgets" status

If you see this, the extension is working! Try dragging a widget from the palette to the canvas.
