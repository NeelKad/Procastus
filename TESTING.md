# Testing Guide for StudyFocused Renew

This guide will help you test all features of the extension to ensure it's ready for final release.

## Pre-Testing Setup

1. **Build the extension**
   ```bash
   cd extension
   npm run build
   ```

2. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist/` folder
   - Verify the extension appears and is enabled

3. **Verify Extension Loads**
   - Check for any error messages in the extensions page
   - Open Chrome DevTools Console (F12) to check for runtime errors

## Feature Testing Checklist

### 1. Extension Popup

**Test:** Basic popup functionality
- [ ] Click extension icon in toolbar
- [ ] Popup opens correctly
- [ ] No console errors appear
- [ ] UI is properly styled and readable

### 2. Task Creation

**Test:** Creating study tasks
- [ ] Enter a task title (e.g., "Biology notes")
- [ ] Enter estimated minutes (e.g., 30)
- [ ] Click "Add Task"
- [ ] Task appears in the tasks list
- [ ] Can edit task title directly in the list
- [ ] Can edit task duration directly
- [ ] Can remove tasks with × button
- [ ] Total time displays correctly

**Test:** Multiple tasks
- [ ] Add 3-4 tasks with different durations
- [ ] Tasks display in order
- [ ] Total time sums correctly

### 3. Blocked Websites

**Test:** Adding blocked sites
- [ ] Enter a domain (e.g., "youtube.com")
- [ ] Click "Add"
- [ ] Site appears in blocked sites list
- [ ] Can remove sites with × button
- [ ] Saved blocked sites persist when popup is closed/reopened

**Test:** Multiple blocked sites
- [ ] Add 3-4 different domains
- [ ] All sites appear in list
- [ ] All sites can be removed individually

### 4. Timetable Generation

**Test:** Preview timetable
- [ ] Create 2-3 tasks
- [ ] Add at least one blocked site
- [ ] Click "Generate Timetable"
- [ ] Timetable view displays
- [ ] Shows all tasks with start/end times
- [ ] Shows 5-minute breaks between tasks
- [ ] Can go back to edit plan

### 5. Starting a Session

**Test:** Starting focus session
- [ ] Create a plan with tasks and blocked sites
- [ ] Click "Start Session"
- [ ] Session view appears
- [ ] Timer starts counting down
- [ ] Current task displays correctly
- [ ] Progress bar shows correct progress
- [ ] Upcoming schedule shows remaining tasks

### 6. Website Blocking

**Test:** Blocking functionality
- [ ] Start a session with youtube.com blocked
- [ ] Try to navigate to youtube.com
- [ ] Should redirect to block page
- [ ] Block page shows:
  - [ ] Current task name
  - [ ] Timer
  - [ ] Full schedule
  - [ ] Blocked sites list
  - [ ] "End focus session" button

**Test:** Multiple blocked sites
- [ ] Add multiple sites to blocklist
- [ ] Try accessing each blocked site
- [ ] All redirect to block page correctly

### 7. Session Timer

**Test:** Timer functionality
- [ ] Start a session
- [ ] Watch timer count down
- [ ] Timer format is MM:SS
- [ ] Timer updates every second
- [ ] When time reaches 0, shows "Time's up!" message

### 8. Task Completion

**Test:** Completing tasks
- [ ] Start a session with multiple tasks
- [ ] Click "Complete Task & Continue"
- [ ] Advances to next task/break
- [ ] Timer resets for new task
- [ ] Progress updates correctly
- [ ] Can complete all tasks

### 9. Breaks

**Test:** Automatic breaks
- [ ] Complete a task
- [ ] Break automatically appears
- [ ] Break shows "Recharge break" title
- [ ] Break timer shows 5 minutes
- [ ] Can complete break early

### 10. Editing Plan During Session

**Test:** Plan modifications
- [ ] Start a session
- [ ] Scroll to "Adjust plan & sites" section
- [ ] Add a new task
- [ ] Edit existing task
- [ ] Add/remove blocked sites
- [ ] Click "Apply changes to this session"
- [ ] Changes take effect immediately
- [ ] Timer adjusts if needed

### 11. Ending Session

**Test:** Ending session
- [ ] Click "End Session" button
- [ ] Session ends
- [ ] Returns to create view
- [ ] Website blocking stops (try accessing blocked site)
- [ ] Plan and blocked sites are preserved

**Test:** Auto-complete session
- [ ] Complete all tasks and breaks
- [ ] Session ends automatically
- [ ] Shows completion message

### 12. Options Page

**Test:** Options functionality
- [ ] Right-click extension icon → Options
- [ ] Or navigate to chrome://extensions → Extension options
- [ ] Options page opens
- [ ] Can edit default blocked sites
- [ ] Click "Save"
- [ ] Settings persist

### 13. Floating Widget

**Test:** In-page widget
- [ ] Navigate to any website (e.g., google.com)
- [ ] Look for floating widget in bottom-right (or collapsed button)
- [ ] Click to expand widget
- [ ] Widget shows current session info
- [ ] Can edit tasks in widget
- [ ] Notes field works
- [ ] Widget can be collapsed

**Test:** Widget without session
- [ ] End any active session
- [ ] Navigate to a page
- [ ] Widget should show "Ready when you are"
- [ ] Notes still work

### 14. Notes Feature

**Test:** Session notes
- [ ] Start a session
- [ ] Type notes in popup or widget
- [ ] Notes save automatically
- [ ] Notes persist after closing/reopening popup
- [ ] Notes persist after page refresh (in widget)

### 15. State Persistence

**Test:** Data persistence
- [ ] Create a plan with tasks and blocked sites
- [ ] Close popup
- [ ] Reopen popup
- [ ] Plan is still there
- [ ] Start a session
- [ ] Restart Chrome
- [ ] Reopen extension
- [ ] Session state is restored
- [ ] Timer continues from correct time

### 16. Floating Action Button (FAB)

**Test:** FAB functionality
- [ ] Navigate to any page
- [ ] Look for floating button (bottom-right)
- [ ] Button shows timer if session active
- [ ] Button is draggable
- [ ] Clicking button opens web app (if configured)

### 17. Error Handling

**Test:** Edge cases
- [ ] Try to start session with no tasks → Error message shown
- [ ] Try to start session with no blocked sites → Error message shown
- [ ] Try to add empty task → Error message shown
- [ ] Try invalid time values → Handled gracefully

## Browser Console Checks

While testing, check the browser console (F12) for:

- [ ] No error messages
- [ ] No warnings about missing resources
- [ ] Storage operations working correctly
- [ ] Background script loaded
- [ ] Content scripts injected

## Performance Checks

- [ ] Popup opens quickly (< 500ms)
- [ ] Timer updates smoothly (no lag)
- [ ] No memory leaks (monitor over 30 minutes)
- [ ] Extension doesn't slow down browser

## Cross-Browser Testing (if applicable)

- [ ] Chrome (latest)
- [ ] Edge (Chromium-based)
- [ ] Other Chromium browsers

## Known Issues to Watch For

1. **Blocking Rules Not Applied**
   - Solution: Check declarativeNetRequest permission
   - Solution: Verify site format (use "youtube.com" not "https://youtube.com")

2. **Timer Not Updating**
   - Solution: Check storage events
   - Solution: Verify background script is running

3. **Widget Not Appearing**
   - Solution: Check content scripts are loaded
   - Solution: Check for JavaScript errors in console

4. **State Not Persisting**
   - Solution: Check storage permissions
   - Solution: Verify STATE_KEY constant matches

## Final Pre-Release Checklist

- [ ] All features tested and working
- [ ] No console errors
- [ ] README.md updated and accurate
- [ ] Extension version number set correctly
- [ ] Extension description is clear
- [ ] Build process completes without errors
- [ ] All required files present in dist/
- [ ] Manifest.json is valid
- [ ] Extension loads without errors
- [ ] All permissions justified

## Reporting Issues

If you find issues during testing:

1. Note the exact steps to reproduce
2. Check browser console for errors
3. Note browser version and OS
4. Document any error messages
5. Take screenshots if helpful

---

**Happy Testing!** 🎯

