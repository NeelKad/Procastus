# StudyFocused Renew

A Chrome browser extension that helps students stay focused during study sessions by blocking distracting websites and providing a structured task management system with automatic break scheduling.

## Features

### 🎯 Study Plan Management
- Create custom study plans with multiple tasks
- Set estimated time for each task
- Automatic 5-minute breaks between tasks
- Preview your study timetable before starting

### 🚫 Website Blocking
- Block distracting websites (YouTube, social media, etc.)
- Blocks only activate during active study sessions
- Saved blocklists persist across sessions
- Configurable default blocked sites in options

### ⏱️ Focus Sessions
- Real-time countdown timer for current task/break
- Progress tracking (Step X of Y)
- Phase-by-phase completion
- Edit your plan even during an active session

### 📝 Notes & Organization
- Take notes during study sessions
- In-page widget for quick access
- Persistent note storage

### 🎨 User Interface
- Clean, modern popup interface
- Beautiful block page when accessing restricted sites
- Floating widget for in-page access
- Responsive timetable view

## Project Structure

```
StudyFocused Renew/
├── extension/          # Chrome extension source code
│   ├── src/
│   │   ├── background/ # Service worker (background script)
│   │   ├── popup/      # Extension popup UI
│   │   ├── options/    # Options page
│   │   ├── focus/      # Block page component
│   │   ├── widget/     # In-page floating widget
│   │   ├── content/    # Content scripts
│   │   └── ...
│   ├── manifest.json   # Extension manifest
│   └── package.json
├── shared/             # Shared types and utilities
│   ├── types.ts
│   └── utils.ts
└── webapp/             # Web application (future integration)
```

## Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Chrome or Chromium-based browser

### Development Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd "StudyFocused Renew"
   ```

2. **Install extension dependencies**
   ```bash
   cd extension
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   This will create a `dist/` folder with the compiled extension.

4. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist/` folder

### Development Mode

For active development with hot reload:

```bash
cd extension
npm run dev
```

Note: You'll need to reload the extension in Chrome after making changes during development.

## Usage

### Creating a Study Plan

1. Click the extension icon in your browser toolbar
2. Add tasks:
   - Enter a task title (e.g., "Biology notes")
   - Set the estimated time in minutes
   - Click "Add Task"
3. Add blocked websites:
   - Enter a domain (e.g., "youtube.com")
   - Click "Add"
4. Click "Generate Timetable" to preview your plan
5. Click "Start Session" to begin

### During a Study Session

- View your current task and remaining time in the popup
- Complete tasks to advance to the next phase
- Edit your plan and blocked sites anytime
- Access blocked sites will redirect to a focus page
- Use the floating widget (bottom-right) for quick access

### Ending a Session

- Click "End Session" in the popup
- Or complete all tasks to automatically end

## Technical Details

### Architecture

- **Manifest V3**: Uses Chrome's latest extension API
- **React + TypeScript**: Modern UI framework with type safety
- **Vite**: Fast build tool and development server
- **Shared Code**: Common types and utilities in `shared/` folder

### Key Components

- **Background Script**: Manages state, blocking rules, and message handling
- **Popup**: Main UI for creating plans and managing sessions
- **Block Page**: Shown when accessing blocked websites
- **Content Scripts**: Injects floating widget and bridge for web app communication
- **Widget**: Floating panel for quick access to tasks and notes

### Message Types

The extension uses a message bridge system for communication:

- `SF_PING` - Check extension availability
- `SF_GET_STATE` - Get current state
- `SF_SET_PLAN` - Update tasks and blocked sites
- `SF_START_SESSION` - Start a focus session
- `SF_END_SESSION` - End active session
- `SF_NEXT_PHASE` - Advance to next task/break
- `SF_UPDATE_SESSION` - Update active session plan
- `SF_UPDATE_NOTES` - Update session notes

Legacy message types are supported for backward compatibility.

## Testing Checklist

Before final release, test the following:

- [ ] Extension installs and loads correctly
- [ ] Popup opens and displays correctly
- [ ] Can create tasks and set time estimates
- [ ] Can add and remove blocked sites
- [ ] Timetable generates correctly with breaks
- [ ] Session starts and timer counts down
- [ ] Blocked sites redirect to block page
- [ ] Block page shows current task and timer
- [ ] Can complete tasks and advance phases
- [ ] Can edit plan during active session
- [ ] Session ends correctly
- [ ] Options page saves default blocked sites
- [ ] Widget appears and functions on pages
- [ ] Notes save and persist
- [ ] State persists across browser restarts

## Building for Production

```bash
cd extension
npm run build
```

The built extension will be in `extension/dist/`. This folder can be zipped for distribution via Chrome Web Store.

## Troubleshooting

### Extension not loading
- Ensure you're loading the `dist/` folder, not the root `extension/` folder
- Check browser console for errors (F12)

### Blocking not working
- Verify you have the `declarativeNetRequest` permission
- Check that blocked sites are formatted correctly (e.g., "youtube.com" not "https://youtube.com")

### Timer not updating
- Check that storage events are working
- Verify background script is running (check `chrome://extensions/`)

## Future Enhancements

- Web app integration for cloud sync
- Statistics and session history
- Pomodoro technique customization
- Sound notifications
- Browser extension for other browsers (Firefox, Edge)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

