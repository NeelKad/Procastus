# Web App - StudyFocused Renew

The web app is a companion interface to the browser extension, providing a full-featured web-based UI for managing study sessions.

## Features

- ✅ **Extension Bridge Communication** - Connects to the extension via postMessage
- ✅ **Plan Creation** - Create and manage study tasks
- ✅ **Blocked Sites Management** - Add/remove distracting websites
- ✅ **Session Management** - Start, monitor, and end focus sessions
- ✅ **Real-time Timer** - Live countdown for current task/break
- ✅ **Notes** - Take notes during study sessions
- ✅ **Responsive Design** - Works on desktop and mobile

## Setup

1. **Install dependencies**
   ```bash
   cd webapp
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   - The app will run on `http://localhost:5173`
   - The extension must be installed and enabled for the webapp to function

## Architecture

### Bridge Communication

The webapp communicates with the extension through a message bridge:

- **Extension sends**: Messages via `window.postMessage`
- **Content script (fab.ts)** acts as a relay between webapp and background script
- **Webapp receives**: Responses via `window.addEventListener('message')`

### Key Components

- **`bridge.ts`**: Utility functions for extension communication
- **`App.tsx`**: Main application component with routing logic
- **TaskForm**: Component for adding new tasks
- **BlockedSitesInput**: Component for managing blocked websites

### Message Types

All messages use the `SF_*` prefix:
- `SF_PING` - Check extension availability
- `SF_GET_STATE` - Get current state
- `SF_SET_PLAN` - Update tasks and blocked sites
- `SF_START_SESSION` - Start a focus session
- `SF_END_SESSION` - End active session
- `SF_NEXT_PHASE` - Advance to next task/break
- `SF_UPDATE_SESSION` - Update active session plan
- `SF_UPDATE_NOTES` - Update session notes

## Usage

### Connecting to Extension

1. Install and enable the StudyFocused Renew extension
2. Open the webapp at `http://localhost:5173`
3. The app will automatically detect the extension
4. If the extension isn't detected, click "Retry Connection"

### Creating a Study Plan

1. Enter task title and estimated minutes
2. Click "Add Task" to add it to your plan
3. Add blocked websites (e.g., "youtube.com")
4. Add optional notes
5. Click "Start Focus Session" when ready

### During a Session

- View current task and remaining time
- See upcoming tasks in the schedule
- Complete tasks to advance
- Edit notes in real-time
- End session at any time

## Development

### Project Structure

```
webapp/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Entry point
│   ├── index.css        # Global styles
│   └── utils/
│       └── bridge.ts    # Extension bridge utilities
├── vite.config.ts       # Vite configuration
└── package.json
```

### Shared Code

The webapp uses shared types from `../shared/types.ts` via the `@shared` alias configured in:
- `vite.config.ts` (for build)
- `tsconfig.app.json` (for TypeScript)

### Building

```bash
npm run build
```

Built files will be in `dist/` directory.

## Troubleshooting

### Extension Not Detected

- Ensure the extension is installed and enabled
- Check browser console for errors
- Verify `externally_connectable` matches in extension manifest
- Try reloading the extension and webapp

### Messages Not Working

- Check browser console for bridge errors
- Verify content script (fab.js) is loaded on the page
- Ensure extension has required permissions

### Build Errors

- Check that shared folder path is correct
- Verify TypeScript paths configuration
- Ensure all dependencies are installed

## Integration with Extension

The webapp is designed to work seamlessly with the extension:

1. **Extension popup** - Quick access for creating plans
2. **Web app** - Full-featured interface for detailed management
3. **Floating button** - Opens webapp from any page
4. **Shared state** - Both interfaces use the same state storage

The extension's floating action button (FAB) opens the webapp, allowing users to access the full interface from anywhere on the web.

