import type { BridgeRequest, BridgeResponse, Task } from '@shared/types';

const EXTENSION_ORIGIN = 'studyfocus-extension';
const REQUEST_TIMEOUT = 5000;

/**
 * Check if the extension is available
 */
export async function pingExtension(): Promise<boolean> {
  try {
    // Wait a bit for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    const response = await sendBridgeMessage({ type: 'SF_PING' });
    return response.success;
  } catch (error) {
    console.error('[StudyFocus WebApp] Ping failed:', error);
    return false;
  }
}

/**
 * Send a message to the extension via postMessage bridge
 */
export function sendBridgeMessage<T = unknown>(
  request: BridgeRequest,
): Promise<BridgeResponse<T>> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const message: BridgeRequest = {
      ...request,
      requestId,
    };

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, REQUEST_TIMEOUT);

    const handler = (event: MessageEvent) => {
      // Debug logging
      if (event.data?.type?.startsWith('SF_') || event.data?.source === EXTENSION_ORIGIN) {
        console.log('[StudyFocus WebApp] Received message:', event.data, 'from origin:', event.origin);
      }
      
      // Only accept messages from the extension
      if (event.data?.source !== EXTENSION_ORIGIN) return;
      if (event.data?.requestId !== requestId) return;

      clearTimeout(timeout);
      window.removeEventListener('message', handler);

      const response = event.data as BridgeResponse<T>;
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Request failed'));
      }
    };

    window.addEventListener('message', handler);
    console.log('[StudyFocus WebApp] Sending message:', message);
    window.postMessage(message, '*');
  });
}

/**
 * Get current state from extension
 */
export async function getState() {
  const response = await sendBridgeMessage({ type: 'SF_GET_STATE' });
  return response.payload;
}

/**
 * Set plan (tasks and blocked sites)
 */
export async function setPlan(tasks: Task[], blockedSites: string[]) {
  const response = await sendBridgeMessage({
    type: 'SF_SET_PLAN',
    payload: { tasks, blockedSites },
  });
  return response.payload;
}

/**
 * Start a focus session
 */
export async function startSession(tasks: Task[], blockedSites: string[]) {
  const response = await sendBridgeMessage({
    type: 'SF_START_SESSION',
    payload: { tasks, blockedSites },
  });
  return response.payload;
}

/**
 * End active session
 */
export async function endSession() {
  const response = await sendBridgeMessage({ type: 'SF_END_SESSION' });
  return response.payload;
}

/**
 * Move to next phase
 */
export async function nextPhase() {
  const response = await sendBridgeMessage({ type: 'SF_NEXT_PHASE' });
  return response.payload;
}

/**
 * Update session plan
 */
export async function updateSession(baseTasks: Task[], blockedSites: string[]) {
  const response = await sendBridgeMessage({
    type: 'SF_UPDATE_SESSION',
    payload: { baseTasks, blockedSites },
  });
  return response.payload;
}

/**
 * Update notes
 */
export async function updateNotes(notes: string) {
  const response = await sendBridgeMessage({
    type: 'SF_UPDATE_NOTES',
    payload: { notes },
  });
  return response.payload;
}

