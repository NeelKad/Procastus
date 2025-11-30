export interface Task {
  id: string;
  title: string;
  estimatedMinutes: number;
  order: number;
}

export interface SessionEntry extends Task {
  isBreak?: boolean;
}

export interface TimetableSlot {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  isBreak?: boolean;
  durationMinutes: number;
}

export interface ActiveSession {
  baseTasks: Task[];
  entries: SessionEntry[];
  blockedSites: string[];
  currentIndex: number;
  phaseStartedAt: number;
  sessionStartedAt: number;
  timetable: TimetableSlot[];
}

export interface SharedState {
  tasks: Task[];
  blockedSites: string[];
  activeSession: ActiveSession | null;
  notes?: string;
}

export const EMPTY_STATE: SharedState = {
  tasks: [],
  blockedSites: [],
  activeSession: null,
  notes: '',
};

export type BridgeRequestType =
  | 'SF_PING'
  | 'SF_GET_STATE'
  | 'SF_SET_PLAN'
  | 'SF_UPDATE_NOTES'
  | 'SF_START_SESSION'
  | 'SF_END_SESSION'
  | 'SF_NEXT_PHASE'
  | 'SF_UPDATE_SESSION'
  // Legacy message types for backward compatibility
  | 'START_FOCUS_SESSION'
  | 'END_FOCUS_SESSION'
  | 'NEXT_PHASE'
  | 'UPDATE_FOCUS_SESSION';

export interface BridgeRequest {
  requestId?: string;
  type: BridgeRequestType;
  payload?: any;
}

export interface BridgeResponse {
  requestId?: string;
  success: boolean;
  payload?: any;
  error?: string;
  session?: ActiveSession;
}

