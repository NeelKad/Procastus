import type { BridgeRequest, SharedState, Task } from '@shared/types';
import { EMPTY_STATE } from '@shared/types';
import { createActiveSession, createSessionEntries, reorderTasks, generateTimetable } from '@shared/utils';
import { STATE_KEY } from '../constants';

const RULE_ID_BASE = 1000;

async function getState(): Promise<SharedState> {
  const stored = await chrome.storage.local.get([STATE_KEY]);
  return stored[STATE_KEY] ?? { ...EMPTY_STATE };
}

async function setState(next: SharedState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: next });
}

async function syncBlockingRules(blockedSites: string[]): Promise<void> {
  const sanitized = blockedSites
    .map((site) => site.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0])
    .filter(Boolean);

  const rules = sanitized.map<chrome.declarativeNetRequest.Rule>((host, idx) => ({
    id: RULE_ID_BASE + idx,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/content_block_page.html' } },
    condition: {
      urlFilter: `||${host}^`,
      resourceTypes: ['main_frame'],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({ length: sanitized.length + 5 }, (_, i) => RULE_ID_BASE + i),
    addRules: rules,
  });
}

async function clearBlockingRules(): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({ length: 500 }, (_, i) => RULE_ID_BASE + i),
    addRules: [],
  });
}

function newTask(title = ''): Task {
  return {
    id: crypto.randomUUID(),
    title,
    estimatedMinutes: 25,
    order: Date.now(),
  };
}

async function handleRequest(message: BridgeRequest) {
  const state = await getState();
  const msgType = message.type;

  // Handle legacy message types by mapping to new ones
  if (msgType === 'START_FOCUS_SESSION') {
    message.type = 'SF_START_SESSION';
    if (message.payload?.baseTasks) {
      message.payload = {
        tasks: message.payload.baseTasks,
        blockedSites: message.payload.blockedSites || [],
      };
    }
  } else if (msgType === 'END_FOCUS_SESSION') {
    message.type = 'SF_END_SESSION';
  } else if (msgType === 'NEXT_PHASE') {
    message.type = 'SF_NEXT_PHASE';
  } else if (msgType === 'UPDATE_FOCUS_SESSION') {
    message.type = 'SF_UPDATE_SESSION';
  }

  switch (message.type) {
    case 'SF_PING':
      return { success: true, payload: null };

    case 'SF_GET_STATE':
      return { success: true, payload: state };

    case 'SF_SET_PLAN': {
      const { tasks = [], blockedSites = [] } = message.payload ?? {};
      const sanitizedTasks = reorderTasks(tasks);
      const nextState: SharedState = {
        ...state,
        tasks: sanitizedTasks.length ? sanitizedTasks : [newTask('New task')],
        blockedSites,
      };
      if (nextState.activeSession) {
        nextState.activeSession.entries = createSessionEntries(nextState.tasks);
        nextState.activeSession.timetable = generateTimetable(nextState.tasks);
        nextState.activeSession.blockedSites = blockedSites;
      }
      await setState(nextState);
      if (nextState.activeSession) {
        await syncBlockingRules(blockedSites);
      }
      return { success: true, payload: nextState };
    }

    case 'SF_UPDATE_NOTES': {
      const { notes = '' } = message.payload ?? {};
      const nextState = { ...state, notes };
      await setState(nextState);
      return { success: true, payload: nextState };
    }

    case 'SF_START_SESSION': {
      let tasks = state.tasks.length ? state.tasks : [newTask('New task')];
      let blockedSites = state.blockedSites.length ? state.blockedSites : ['youtube.com'];
      
      // Handle legacy format
      if (message.payload?.baseTasks) {
        tasks = message.payload.baseTasks;
        blockedSites = message.payload.blockedSites || blockedSites;
      } else if (message.payload?.tasks) {
        tasks = message.payload.tasks;
        blockedSites = message.payload.blockedSites || blockedSites;
      }

      const activeSession = createActiveSession(tasks, blockedSites);
      const nextState: SharedState = { ...state, tasks, blockedSites, activeSession };
      await syncBlockingRules(blockedSites);
      await setState(nextState);
      return { success: true, payload: nextState, session: activeSession };
    }

    case 'SF_END_SESSION': {
      const nextState: SharedState = { ...state, activeSession: null };
      await clearBlockingRules();
      await setState(nextState);
      return { success: true, payload: nextState };
    }

    case 'SF_NEXT_PHASE': {
      if (!state.activeSession) {
        return { success: false, error: 'No active session' };
      }
      const nextIndex = (message.payload?.currentIndex ?? state.activeSession.currentIndex + 1);
      if (nextIndex >= state.activeSession.entries.length) {
        // Session complete
        const nextState: SharedState = { ...state, activeSession: null };
        await clearBlockingRules();
        await setState(nextState);
        return { success: true, payload: nextState };
      }
      const updatedSession = {
        ...state.activeSession,
        currentIndex: nextIndex,
        phaseStartedAt: Date.now(),
      };
      const nextState: SharedState = { ...state, activeSession: updatedSession };
      await setState(nextState);
      return { success: true, payload: nextState, session: updatedSession };
    }

    case 'SF_UPDATE_SESSION': {
      if (!state.activeSession) {
        return { success: false, error: 'No active session' };
      }
      const payload = message.payload ?? {};
      let baseTasks = state.activeSession.baseTasks;
      let blockedSites = state.activeSession.blockedSites;

      if (payload.baseTasks) {
        baseTasks = reorderTasks(payload.baseTasks);
      }
      if (payload.blockedSites) {
        blockedSites = payload.blockedSites;
      }

      const entries = createSessionEntries(baseTasks);
      const timetable = generateTimetable(baseTasks);
      const updatedSession = {
        ...state.activeSession,
        baseTasks,
        entries,
        timetable,
        blockedSites,
      };
      const nextState: SharedState = { ...state, activeSession: updatedSession, tasks: baseTasks, blockedSites };
      await syncBlockingRules(blockedSites);
      await setState(nextState);
      return { success: true, payload: nextState, session: updatedSession };
    }

    default:
      return { success: false, error: `Unknown request: ${message.type}` };
  }
}

chrome.runtime.onMessage.addListener((message: BridgeRequest, _sender, sendResponse) => {
  // Accept both SF_* and legacy message types
  const isSFMessage = message?.type?.startsWith('SF_');
  const isLegacyMessage = ['START_FOCUS_SESSION', 'END_FOCUS_SESSION', 'NEXT_PHASE', 'UPDATE_FOCUS_SESSION'].includes(message?.type);
  
  if (!isSFMessage && !isLegacyMessage) {
    return false;
  }

  handleRequest(message)
    .then((result) => {
      sendResponse({ requestId: message.requestId, ...result });
    })
    .catch((err: Error) => {
      sendResponse({
        requestId: message.requestId,
        success: false,
        error: err.message ?? 'Unexpected error',
      });
    });
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  if (!state.tasks.length) {
    await setState({ ...state, tasks: [newTask('Homework session')] });
  }
});
