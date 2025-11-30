import type { BridgeRequest, BridgeResponse, SharedState } from '@shared/types';

// Inline constants to avoid import issues in content script
const STATE_KEY = 'sfState';
const WEB_APP_URL = 'http://localhost:5173/';
const WEB_APP_ORIGINS = ['http://localhost', 'http://127.0.0.1'];

const BUTTON_ID = 'sf-floating-button';
const WIDGET_LOADER_ID = 'sf-widget-loader';
const SOURCE_WEB = 'studyfocus-web';
const SOURCE_EXTENSION = 'studyfocus-extension';

let currentState: SharedState | null = null;

function createButton(): HTMLElement {
  if (document.getElementById(BUTTON_ID)) {
    return document.getElementById(BUTTON_ID)!;
  }

  const btn = document.createElement('div');
  btn.id = BUTTON_ID;
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4), 0 0 0 4px rgba(102, 126, 234, 0.1);
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    user-select: none;
    padding: 8px;
    transition: all 0.3s ease;
    border: 3px solid rgba(255, 255, 255, 0.2);
  `;
  btn.innerHTML = `<span style="font-size:10px; opacity: 0.95;">🎯 Focus</span><strong style="font-size:16px; margin-top: 2px;">--:--</strong>`;
  
  // Add hover effect
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 25px 50px rgba(102, 126, 234, 0.5), 0 0 0 6px rgba(102, 126, 234, 0.15)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.4), 0 0 0 4px rgba(102, 126, 234, 0.1)';
  });

  let drag = false;
  let offsetX = 0;
  let offsetY = 0;

  btn.addEventListener('mousedown', (event) => {
    drag = true;
    offsetX = event.clientX - btn.getBoundingClientRect().left;
    offsetY = event.clientY - btn.getBoundingClientRect().top;
    event.preventDefault();
  });

  window.addEventListener('mousemove', (event) => {
    if (!drag) return;
    btn.style.left = `${event.clientX - offsetX}px`;
    btn.style.top = `${event.clientY - offsetY}px`;
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  });

  window.addEventListener('mouseup', (event) => {
    if (!drag) return;
    drag = false;
    event.preventDefault();
  });

  btn.addEventListener('click', () => {
    window.open(WEB_APP_URL, '_blank');
  });

  document.documentElement.appendChild(btn);
  return btn;
}

function formatTimer(ms: number | undefined): string {
  if (ms == null || ms <= 0) return '--:--';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateButton() {
  const btn = createButton();
  const strong = btn.querySelector('strong');
  if (!strong) return;
  if (!currentState?.activeSession) {
    strong.textContent = '--:--';
    return;
  }
  const currentEntry = currentState.activeSession.entries[currentState.activeSession.currentIndex];
  if (!currentEntry) {
    strong.textContent = '--:--';
    return;
  }
  const duration = currentEntry.estimatedMinutes * 60_000;
  const elapsed = Date.now() - currentState.activeSession.phaseStartedAt;
  const remaining = Math.max(0, duration - elapsed);
  strong.textContent = formatTimer(remaining);
}

async function loadState() {
  try {
    const { [STATE_KEY]: stored } = await chrome.storage.local.get([STATE_KEY]);
    currentState = stored ?? null;
    updateButton();
  } catch (error) {
    console.error('[StudyFocus] Failed to load state:', error);
    currentState = null;
    updateButton();
  }
}

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  area: chrome.storage.AreaName,
) {
  try {
    if (area !== 'local') return;
    if (STATE_KEY in changes) {
      currentState = changes[STATE_KEY].newValue ?? null;
      updateButton();
    }
  } catch (error) {
    console.error('[StudyFocus] Storage change error:', error);
  }
}

function handleBridgeMessages() {
  window.addEventListener('message', (event) => {
    try {
      // Debug logging
      if (event.data?.type?.startsWith('SF_')) {
        console.log('[StudyFocus] Received bridge message:', event.data, 'from origin:', event.origin);
      }
      
      // Check if origin matches (allow localhost with any port)
      const originMatches = WEB_APP_ORIGINS.some((origin) => {
        const matches = event.origin.startsWith(origin);
        if (!matches && event.origin.includes('localhost')) {
          console.log('[StudyFocus] Origin check:', event.origin, 'vs', origin);
        }
        return matches;
      });
      
      if (!originMatches) {
        // Log for debugging
        if (event.data?.type?.startsWith('SF_')) {
          console.log('[StudyFocus] Origin mismatch:', event.origin, 'not in', WEB_APP_ORIGINS);
        }
        return;
      }
      
      const data = event.data as BridgeRequest | undefined;
      if (!data || data.requestId == null || !data.type?.startsWith('SF_')) {
        if (data?.type?.startsWith('SF_')) {
          console.log('[StudyFocus] Invalid message format:', data);
        }
        return;
      }

      if (!chrome?.runtime) {
        console.error('[StudyFocus] Chrome runtime not available');
        window.postMessage({
          source: SOURCE_EXTENSION,
          requestId: data.requestId,
          success: false,
          error: 'Extension runtime not available',
        }, event.origin);
        return;
      }

      chrome.runtime.sendMessage(data, (response: BridgeResponse) => {
        if (chrome.runtime.lastError) {
          console.error('[StudyFocus] Runtime error:', chrome.runtime.lastError.message);
        }
        const detail: BridgeResponse = response ?? {
          requestId: data.requestId,
          success: false,
          error: chrome.runtime.lastError?.message ?? 'Extension unavailable',
        };
        window.postMessage({ source: SOURCE_EXTENSION, ...detail }, event.origin);
      });
    } catch (error) {
      console.error('[StudyFocus] Bridge message error:', error);
    }
  });
}

// Initialize only if Chrome APIs are available
if (typeof chrome !== 'undefined' && chrome.storage && chrome.runtime) {
  try {
    const url = chrome.runtime.getURL('widget.js');
    if (!document.getElementById(WIDGET_LOADER_ID)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      script.id = WIDGET_LOADER_ID;
      document.documentElement.appendChild(script);
    }
  } catch (e) {
    console.error('[StudyFocus] Failed to inject widget', e);
  }
  loadState();
  handleBridgeMessages();
  chrome.storage.onChanged.addListener(handleStorageChange);
  updateButton();
} else {
  console.error('[StudyFocus] Chrome APIs not available in this context');
}

