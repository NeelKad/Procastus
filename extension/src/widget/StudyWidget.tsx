import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TaskItem {
  id: string;
  title: string;
  estimatedMinutes: number;
  order: number;
}

interface SessionEntry extends TaskItem {
  isBreak?: boolean;
}

interface TimetableSlot {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  isBreak?: boolean;
}

interface ActiveSessionState {
  baseTasks: TaskItem[];
  entries: SessionEntry[];
  blockedSites: string[];
  currentIndex: number;
  phaseStartedAt: number;
  sessionStartedAt: number;
  timetable: TimetableSlot[];
}

const NOTES_KEY = 'widgetNotes';

function createSessionEntries(baseTasks: TaskItem[]): SessionEntry[] {
  const entries: SessionEntry[] = [];
  baseTasks.forEach((task, index) => {
    entries.push({ ...task, isBreak: false });
    if (index < baseTasks.length - 1) {
      entries.push({
        id: `${task.id}-break-${index}`,
        title: 'Recharge break',
        estimatedMinutes: 5,
        order: task.order + 0.5,
        isBreak: true,
      });
    }
  });
  return entries;
}

function generateTimetable(tasks: TaskItem[]): TimetableSlot[] {
  const entries = createSessionEntries(tasks);
  if (!entries.length) return [];

  const timetable: TimetableSlot[] = [];
  let cursor = Date.now();

  entries.forEach((entry) => {
    const durationMs = entry.estimatedMinutes * 60_000;
    timetable.push({
      id: entry.id,
      title: entry.isBreak ? `${entry.title} (5 min)` : entry.title,
      startTime: cursor,
      endTime: cursor + durationMs,
      isBreak: entry.isBreak,
      durationMinutes: entry.estimatedMinutes,
    });
    cursor += durationMs;
  });

  return timetable;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const StudyWidget: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<ActiveSessionState | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [now, setNow] = useState(Date.now());

  const notesDebounceRef = useRef<number>();

  useEffect(() => {
    chrome.storage.local.get(['sfState', NOTES_KEY], (data) => {
      const state = data.sfState;
      if (state?.activeSession) {
        setSession(state.activeSession as ActiveSessionState);
        setTasks(state.activeSession.baseTasks ?? []);
      } else if (data.activeSession) {
        // Fallback to old format
        setSession(data.activeSession as ActiveSessionState);
        setTasks((data.activeSession as ActiveSessionState).baseTasks ?? []);
      }
      if (typeof data[NOTES_KEY] === 'string') {
        setNotes(data[NOTES_KEY]);
      }
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      if (changes.sfState?.newValue?.activeSession) {
        const nextSession = changes.sfState.newValue.activeSession as ActiveSessionState | null;
        setSession(nextSession);
        if (nextSession?.baseTasks) {
          setTasks(nextSession.baseTasks);
        } else {
          setTasks([]);
        }
      } else if (changes.activeSession) {
        const nextSession = changes.activeSession.newValue as ActiveSessionState | null;
        setSession(nextSession);
        if (nextSession?.baseTasks) {
          setTasks(nextSession.baseTasks);
        } else {
          setTasks([]);
        }
      }

      if (Object.prototype.hasOwnProperty.call(changes, NOTES_KEY)) {
        const noteValue = changes[NOTES_KEY].newValue;
        if (typeof noteValue === 'string') {
          setNotes(noteValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    window.clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = window.setTimeout(() => {
      chrome.storage.local.set({ [NOTES_KEY]: notes });
    }, 400);
    return () => window.clearTimeout(notesDebounceRef.current);
  }, [notes]);

  const currentTimer = useMemo(() => {
    if (!session) return null;
    const currentEntry = session.entries[session.currentIndex];
    if (!currentEntry) return null;
    const durationMs = currentEntry.estimatedMinutes * 60_000;
    const elapsed = now - session.phaseStartedAt;
    const remaining = Math.max(0, durationMs - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const total = Math.max(durationMs, 1);
    return {
      title: currentEntry.title,
      isBreak: Boolean(currentEntry.isBreak),
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      progress: Math.min(100, ((durationMs - remaining) / total) * 100),
      remaining,
    };
  }, [session, now]);

  const persistPlan = useCallback(
    (nextTasks: TaskItem[]) => {
      if (!session) return;
      setSaving(true);
      const payload = {
        baseTasks: nextTasks,
        entries: createSessionEntries(nextTasks),
        blockedSites: session.blockedSites ?? [],
        timetable: generateTimetable(nextTasks),
      };

      chrome.runtime.sendMessage({ type: 'SF_UPDATE_SESSION', payload }, (response) => {
        setSaving(false);
        setHasUnsavedChanges(false);
        if (chrome.runtime.lastError) {
          // eslint-disable-next-line no-console
          console.error(chrome.runtime.lastError.message);
          return;
        }
        if (response?.error) {
          // eslint-disable-next-line no-console
          console.error(response.error);
          return;
        }
        if (response?.session) {
          setSession(response.session as ActiveSessionState);
          setTasks((response.session as ActiveSessionState).baseTasks ?? []);
        }
      });
    },
    [session],
  );

  const handleTaskChange = (taskId: string, field: 'title' | 'estimatedMinutes', value: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if (field === 'title') {
          return { ...task, title: value };
        }
        const minutes = Math.max(1, Number(value) || 1);
        return { ...task, estimatedMinutes: minutes };
      }),
    );
    setHasUnsavedChanges(true);
  };

  const handleTaskBlur = () => {
    if (hasUnsavedChanges) {
      persistPlan(tasks);
    }
  };

  const collapsedContent = (
    <button
      type="button"
      className="sf-widget-toggle"
      aria-label="Open Procastus widget"
      onClick={() => setExpanded(true)}
    >
      <span>Procastus</span>
      {session && currentTimer && <strong>{currentTimer.formatted}</strong>}
    </button>
  );

  const upcomingEntries = session?.entries.slice((session?.currentIndex ?? -1) + 1) ?? [];
  const hasSession = Boolean(session);

  return (
    <div className={`sf-widget-container ${hasSession ? '' : 'sf-widget-container--inactive'}`}>
      {!expanded && collapsedContent}
      {expanded && (
        <div className="sf-widget-panel">
          <div className="sf-widget-panel-header">
            <div>
              <p className="sf-widget-subtitle">Focus assistant</p>
              <h3>{hasSession ? 'Current plan' : 'Ready when you are'}</h3>
            </div>
            <div className="sf-widget-actions">
              <button type="button" className="sf-widget-chip" onClick={() => setExpanded(false)}>
                Collapse
              </button>
            </div>
          </div>

          {!hasSession && (
            <>
                <p className="sf-widget-empty">
                Start a focus session from the Procastus popup to unlock the in-page planner.
              </p>
              <section>
                <div className="sf-widget-section-header">
                  <h4>Notes</h4>
                  <span>Jot thoughts anytime</span>
                </div>
                <textarea
                  className="sf-widget-notes"
                  rows={4}
                  value={notes}
                  placeholder="Capture ideas while you browse…"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </section>
            </>
          )}

          {hasSession && (
            <>
              <div
                className={`sf-widget-timer ${
                  currentTimer?.isBreak ? 'sf-widget-timer--break' : ''
                }`}
              >
                <div className="sf-widget-timer-meta">
                  <span>{currentTimer?.isBreak ? 'Break' : 'Time remaining'}</span>
                  {saving && <span className="sf-widget-status">Saving…</span>}
                </div>
                <div className="sf-widget-timer-value">{currentTimer?.formatted ?? '--:--'}</div>
                <div className="sf-widget-timer-bar">
                  <div style={{ width: `${currentTimer?.progress ?? 0}%` }} />
                </div>
              </div>

              <section>
                <div className="sf-widget-section-header">
                  <h4>Schedule</h4>
                  <span>{session?.baseTasks.length ?? 0} tasks</span>
                </div>
                <div className="sf-widget-task-list">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="sf-widget-task-row">
                      <span className="sf-widget-task-number">{index + 1}</span>
                      <input
                        className="sf-widget-inline-input"
                        value={task.title}
                        onChange={(e) => handleTaskChange(task.id, 'title', e.target.value)}
                        onBlur={handleTaskBlur}
                      />
                      <input
                        className="sf-widget-inline-input sf-widget-inline-number"
                        type="number"
                        value={task.estimatedMinutes.toString()}
                        onChange={(e) => handleTaskChange(task.id, 'estimatedMinutes', e.target.value)}
                        onBlur={handleTaskBlur}
                      />
                      <span className="sf-widget-inline-suffix">min</span>
                    </div>
                  ))}
                </div>
              </section>

              {upcomingEntries.length > 0 && (
                <section className="sf-widget-upcoming">
                  <div className="sf-widget-section-header">
                    <h4>Up next</h4>
                  </div>
                  <div className="sf-widget-upcoming-list">
                    {upcomingEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`sf-widget-upcoming-row ${
                          entry.isBreak ? 'sf-widget-upcoming-row--break' : ''
                        }`}
                      >
                        <div>
                          <strong>{entry.title}</strong>
                          <span>
                            {entry.isBreak ? '5 min break' : formatDuration(entry.estimatedMinutes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="sf-widget-section-header">
                  <h4>Notes</h4>
                  <span>Stay organized</span>
                </div>
                <textarea
                  className="sf-widget-notes"
                  rows={4}
                  value={notes}
                  placeholder="Capture quick thoughts, references, or reminders…"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};

