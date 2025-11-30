import { useEffect, useState } from 'react';
import './App.css';
import type { SharedState, Task, ActiveSession } from '@shared/types';
import { pingExtension, getState, setPlan, startSession, endSession, nextPhase, updateSession } from './utils/bridge';

type ViewMode = 'loading' | 'connect' | 'plan' | 'session';

function App() {
  const [mode, setMode] = useState<ViewMode>('loading');
  const [state, setState] = useState<SharedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  

  async function runCheckExtension() {
    try {
      const hasContentScript = document.getElementById('sf-floating-button') !== null;
      const available = await pingExtension();
      if (available) {
        const newState = await getState();
        setState(newState);
        setTasks(newState.tasks || []);
        setBlockedSites(newState.blockedSites || []);
        
        setMode(newState.activeSession ? 'session' : 'plan');
        setError(null);
      } else {
        setMode('connect');
        const diagnostic = hasContentScript
          ? 'Content script detected but bridge communication failed. Check console for errors.'
          : 'Content script not detected. Make sure the extension is enabled and reload the page.';
        setError(`Extension not detected. ${diagnostic}`);
      }
    } catch (err) {
      setMode('connect');
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to extension';
      setError(`Extension not available: ${errorMsg}. Please ensure the extension is installed and enabled.`);
    }
  }

  useEffect(() => {
    runCheckExtension();
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // state updates handled in runCheckExtension and loadState

  // replaced by runCheckExtension()

  async function loadState() {
    try {
      const newState = await getState();
      setState(newState);
      setTasks(newState.tasks || []);
      setBlockedSites(newState.blockedSites || []);
      
      setMode(newState.activeSession ? 'session' : 'plan');
      return newState;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load state');
      throw err;
    }
  }

  async function handleAddTask(title: string, minutes: number) {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      estimatedMinutes: minutes,
      order: tasks.length,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    await setPlan(updatedTasks, blockedSites);
    await loadState();
  }

  async function handleRemoveTask(taskId: string) {
    const updatedTasks = tasks.filter(t => t.id !== taskId).map((t, idx) => ({ ...t, order: idx }));
    setTasks(updatedTasks);
    await setPlan(updatedTasks, blockedSites);
    await loadState();
  }

  async function handleTaskFieldChange(
    taskId: string,
    field: 'title' | 'estimatedMinutes',
    value: string,
  ) {
    const next = tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (field === 'title') return { ...t, title: value.trim() };
      const mins = Math.max(1, Number(value) || t.estimatedMinutes || 1);
      return { ...t, estimatedMinutes: mins };
    });
    setTasks(next);
    await setPlan(next, blockedSites);
    await loadState();
  }

  async function moveTask(taskId: string, direction: 'up' | 'down') {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(tasks.length - 1, idx + 1);
    if (newIdx === idx) return;
    const next = [...tasks];
    const [moved] = next.splice(idx, 1);
    next.splice(newIdx, 0, moved);
    const reindexed = next.map((t, i) => ({ ...t, order: i }));
    setTasks(reindexed);
    await setPlan(reindexed, blockedSites);
    await loadState();
  }

  async function handleAddBlockedSite(site: string) {
    const updated = [...blockedSites, site];
    setBlockedSites(updated);
    await setPlan(tasks, updated);
    await loadState();
  }

  async function handleRemoveBlockedSite(site: string) {
    const updated = blockedSites.filter(s => s !== site);
    setBlockedSites(updated);
    await setPlan(tasks, updated);
    await loadState();
  }

  async function handleStartSession() {
    if (!tasks.length) {
      setError('Add at least one task');
      return;
    }
    if (!blockedSites.length) {
      setError('Add at least one blocked site');
      return;
    }
    try {
      setError(null);
      await startSession(tasks, blockedSites);
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }

  async function handleEndSession() {
    try {
      await endSession();
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  }

  async function handleCompletePhase() {
    try {
      const response = await nextPhase();
      await loadState();
      if (response && !response.activeSession) {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete phase');
    }
  }

  

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  

  function getTimer(session: ActiveSession) {
    const currentEntry = session.entries[session.currentIndex];
    if (!currentEntry) return null;

    const durationMs = currentEntry.estimatedMinutes * 60_000;
    const elapsed = currentTime - session.phaseStartedAt;
    const remaining = Math.max(0, durationMs - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return {
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      remaining,
      isComplete: remaining === 0,
      isBreak: currentEntry.isBreak || false,
      title: currentEntry.title,
    };
  }

  if (mode === 'loading') {
    return (
      <div className="app-container loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (mode === 'connect') {
    return (
      <div className="app-container connect">
        <div className="connect-card">
          <h1>
            <img src="/assets/procastus-logo.svg" alt="Procastus logo" className="app-logo" />
          </h1>
          <p className="error">{error || 'Extension not detected'}</p>
          <div className="connect-instructions">
            <p><strong>To use this web app, you need to:</strong></p>
            <ol>
              <li>Build the extension: <code>cd extension && npm run build</code></li>
              <li>Open Chrome and go to <code>chrome://extensions/</code></li>
              <li>Enable "Developer mode" (toggle in top-right)</li>
              <li>Click "Load unpacked"</li>
              <li>Select the <code>extension/dist/</code> folder</li>
              <li>Refresh this page</li>
            </ol>
            <p>The extension must be installed and enabled for the web app to function.</p>
          </div>
          <button onClick={runCheckExtension} className="btn-primary">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'session' && state?.activeSession) {
    const session = state.activeSession;
    const timer = getTimer(session);
    const progress = session.entries.length > 0 
      ? ((session.currentIndex + 1) / session.entries.length) * 100 
      : 0;
    const upcomingEntries = session.entries.slice(session.currentIndex + 1);

    async function persistSessionPlan(nextTasks: Task[], nextSites: string[]) {
      try {
        await updateSession(nextTasks, nextSites);
        await loadState();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update session plan');
      }
    }

    async function handleSessionTaskFieldChange(
      taskId: string,
      field: 'title' | 'estimatedMinutes',
      value: string,
    ) {
      const next = tasks.map((t) => {
        if (t.id !== taskId) return t;
        if (field === 'title') return { ...t, title: value.trim() };
        const mins = Math.max(1, Number(value) || t.estimatedMinutes || 1);
        return { ...t, estimatedMinutes: mins };
      });
      setTasks(next);
      await persistSessionPlan(next, blockedSites);
    }

    async function moveSessionTask(taskId: string, direction: 'up' | 'down') {
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return;
      const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(tasks.length - 1, idx + 1);
      if (newIdx === idx) return;
      const next = [...tasks];
      const [moved] = next.splice(idx, 1);
      next.splice(newIdx, 0, moved);
      const reindexed = next.map((t, i) => ({ ...t, order: i }));
      setTasks(reindexed);
      await persistSessionPlan(reindexed, blockedSites);
    }

    async function handleSessionBlockedAdd(site: string) {
      const updated = [...blockedSites, site];
      setBlockedSites(updated);
      await persistSessionPlan(tasks, updated);
    }

    async function handleSessionBlockedRemove(site: string) {
      const updated = blockedSites.filter((s) => s !== site);
      setBlockedSites(updated);
      await persistSessionPlan(tasks, updated);
    }

    async function handleSessionTaskRemove(taskId: string) {
      const updated = tasks.filter((t) => t.id !== taskId).map((t, idx) => ({ ...t, order: idx }));
      setTasks(updated);
      await persistSessionPlan(updated, blockedSites);
    }

    return (
      <div className="app-container session">
        <header className="app-header">
          <h1>🎯 Focus Session</h1>
          <button onClick={handleEndSession} className="btn-secondary">End Session</button>
        </header>

        <div className="session-container">
          {error && <div className="error-banner" style={{ margin: '0 16px' }}>{error}</div>}

          <div className="session-content">
            {/* Left column: Progress, Timer, Current Task, Upcoming */}
            <div className="session-left">
              {/* Progress Section */}
              <div className="session-box">
                <div className="session-header">
                  <h2>Focus Session</h2>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-text">
                    Step {session.currentIndex + 1} of {session.entries.length}
                  </div>
                </div>
              </div>

              {/* Timer */}
              {timer && (
                <div className={`session-box timer-container ${timer.isBreak ? 'timer-break' : ''} ${timer.isComplete ? 'timer-complete' : ''}`}>
                  <div className="timer-label">{timer.isBreak ? 'Break Time' : 'Time Remaining'}</div>
                  <div className="timer-display">{timer.formatted}</div>
                  {timer.isComplete && (
                    <div className="timer-complete-message">
                      Time's up! Ready to continue?
                    </div>
                  )}
                </div>
              )}

              {/* Current Task */}
              <div className={`session-box current-task-card ${timer?.isBreak ? 'current-task-break' : ''}`}>
                <div className="task-label">{timer?.isBreak ? 'Current Break' : 'Current Task'}</div>
                <div className="task-name">{timer?.title || 'N/A'}</div>
                {timer && (
                  <div className="task-duration-info">
                    {timer.isBreak ? 'Enjoy a quick recharge' : `Allocated: ${formatDuration(session.entries[session.currentIndex]?.estimatedMinutes ?? 0)}`}
                  </div>
                )}
              </div>

              {/* Upcoming Schedule */}
              <div className="session-box remaining-tasks flex-grow">
                <h4>Upcoming Schedule</h4>
                {upcomingEntries.length === 0 ? (
                  <div className="no-more-tasks">You're almost done! 🎉</div>
                ) : (
                  upcomingEntries.map((entry, idx) => (
                    <div key={entry.id} className={`upcoming-task ${entry.isBreak ? 'upcoming-break' : ''}`}>
                      <span className="upcoming-task-number">{session.currentIndex + idx + 2}</span>
                      <span className="upcoming-task-title">{entry.title}</span>
                      <span className="upcoming-task-time">
                        {entry.isBreak ? '5m' : formatDuration(entry.estimatedMinutes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right column: Edit Schedule and Add New Items */}
            <div className="session-right">
              {/* Add New Task Section */}
              <div className="session-box">
                <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '600', color: '#e0e7ff' }}>Add Task</h3>
                <SessionTaskForm onAdd={async (title, minutes) => {
                  const newTask: Task = {
                    id: crypto.randomUUID(),
                    title,
                    estimatedMinutes: minutes,
                    order: tasks.length,
                  };
                  const updatedTasks = [...tasks, newTask];
                  setTasks(updatedTasks);
                  await persistSessionPlan(updatedTasks, blockedSites);
                }} />
              </div>

              {/* Edit Schedule */}
              <div className="session-box flex-grow" style={{ minHeight: '300px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#e0e7ff' }}>Edit Schedule</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '100%', overflow: 'auto', paddingRight: '4px' }}>
                  {tasks.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '40px 20px' }}>
                      No tasks. Add one above!
                    </div>
                  ) : (
                    tasks.map((task, index) => (
                      <div key={task.id} className="task-item" style={{ padding: '12px', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span className="task-number" style={{ width: '28px', height: '28px', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>{index + 1}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <input
                            className="inline-input"
                            defaultValue={task.title}
                            aria-label={`Task ${index + 1} title`}
                            onBlur={(e) => handleSessionTaskFieldChange(task.id, 'title', e.target.value)}
                            style={{ fontSize: '13px', fontWeight: '500' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              className="inline-input inline-number"
                              type="number"
                              min={1}
                              defaultValue={task.estimatedMinutes}
                              aria-label={`Task ${index + 1} minutes`}
                              onBlur={(e) => handleSessionTaskFieldChange(task.id, 'estimatedMinutes', e.target.value)}
                              style={{ width: '60px', fontSize: '12px' }}
                            />
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>min</span>
                          </div>
                        </div>
                        <div className="task-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button className="btn-chip" onClick={() => moveSessionTask(task.id, 'up')} aria-label="Move up" style={{ fontSize: '11px', padding: '6px 8px' }} title="Move up">↑</button>
                          <button className="btn-chip" onClick={() => moveSessionTask(task.id, 'down')} aria-label="Move down" style={{ fontSize: '11px', padding: '6px 8px' }} title="Move down">↓</button>
                          <button onClick={() => handleSessionTaskRemove(task.id)} className="btn-remove" aria-label="Delete" style={{ width: '28px', height: '28px', fontSize: '14px' }}>×</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Blocked Sites */}
              <div className="session-box">
                <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '600', color: '#e0e7ff' }}>Blocked Sites</h3>
                <BlockedSitesInput 
                  sites={blockedSites}
                  onAdd={handleSessionBlockedAdd}
                  onRemove={handleSessionBlockedRemove}
                />
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="session-buttons">
            <button onClick={handleCompletePhase} className="btn-primary">
              {session.currentIndex + 1 >= session.entries.length
                ? 'Finish Session'
                : timer?.isBreak
                ? 'End Break'
                : 'Next'}
            </button>
            <button onClick={handleEndSession} className="btn-secondary">
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Plan creation/editing mode
  const totalTime = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return (
    <div className="app-container plan">
      <header className="app-header">
        <h1>
          <img src="/assets/procastus-logo.svg" alt="Procastus logo" className="app-logo" />
        </h1>
        <button onClick={runCheckExtension} className="btn-secondary">Refresh</button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="app-content">
        {/* Create Study Plan Box */}
        <div className="plan-box">
          <div className="plan-box-title">Create Your Study Plan</div>
          
          {/* Input Section */}
          <div className="plan-input-section">
            <TaskForm onAdd={handleAddTask} />
          </div>
        </div>

        {/* Two-column grid for tasks and blocked sites */}
        <div className="two-column-grid">
          {/* Tasks Box */}
          <div className="list-box">
            <div className="list-box-title">Your Tasks ({tasks.length})</div>
            <div className="items-list">
              {tasks.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  No tasks yet. Add one above!
                </div>
              ) : (
                tasks.map((task, index) => (
                  <div key={task.id} className="task-item">
                    <div className="task-content">
                      <span className="task-number">{index + 1}</span>
                      <input
                        className="inline-input"
                        defaultValue={task.title}
                        aria-label={`Task ${index + 1} title`}
                        onBlur={(e) => handleTaskFieldChange(task.id, 'title', e.target.value)}
                      />
                      <div className="inline-minutes">
                        <input
                          className="inline-input inline-number"
                          type="number"
                          min={1}
                          defaultValue={task.estimatedMinutes}
                          aria-label={`Task ${index + 1} minutes`}
                          onBlur={(e) => handleTaskFieldChange(task.id, 'estimatedMinutes', e.target.value)}
                        />
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>min</span>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button className="btn-chip" onClick={() => moveTask(task.id, 'up')} aria-label="Move up">↑</button>
                      <button className="btn-chip" onClick={() => moveTask(task.id, 'down')} aria-label="Move down">↓</button>
                      <button onClick={() => handleRemoveTask(task.id)} className="btn-remove" aria-label="Remove">×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {totalTime > 0 && (
              <div style={{ textAlign: 'right', fontWeight: '600', color: '#38bdf8', fontSize: '13px', marginTop: '8px' }}>
                Total: {formatDuration(totalTime)}
              </div>
            )}
          </div>

          {/* Blocked Sites Box */}
          <div className="list-box">
            <div className="list-box-title">Blocked Websites</div>
            <BlockedSitesInput 
              sites={blockedSites}
              onAdd={handleAddBlockedSite}
              onRemove={handleRemoveBlockedSite}
            />
          </div>
        </div>

        {/* Start Focus Session Button */}
        {tasks.length > 0 && blockedSites.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <button onClick={handleStartSession} className="btn-primary btn-large" style={{ width: '100%' }}>
              Start Focus Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskForm({ onAdd }: { onAdd: (title: string, minutes: number) => void }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const mins = minutes ? parseInt(minutes, 10) : 30;
    if (mins <= 0) return;
    onAdd(title.trim(), mins);
    setTitle('');
    setMinutes('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="input-row">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="input-field"
        />
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutes"
          min="1"
          className="input-field input-minutes"
        />
      </div>
      <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', paddingRight: '24px' }}>Add Task</button>
    </form>
  );
}

function BlockedSitesInput({ 
  sites, 
  onAdd, 
  onRemove 
}: { 
  sites: string[]; 
  onAdd: (site: string) => void; 
  onRemove: (site: string) => void;
}) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed || sites.includes(trimmed)) {
      setInput('');
      return;
    }
    onAdd(trimmed);
    setInput('');
  }

  return (
    <div className="blocked-sites">
      <div className="blocked-input-group">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder="e.g. youtube.com"
          className="input-field"
        />
        <button onClick={handleAdd} className="btn-secondary">Add</button>
      </div>
      {sites.length > 0 && (
        <div className="blocked-sites-list">
          {sites.map((site) => (
            <span key={site} className="blocked-site-tag">
              {site}
              <button onClick={() => onRemove(site)} className="tag-remove">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionTaskForm({ onAdd }: { onAdd: (title: string, minutes: number) => void }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const mins = minutes ? parseInt(minutes, 10) : 30;
    if (mins <= 0) return;
    onAdd(title.trim(), mins);
    setTitle('');
    setMinutes('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="input-field"
          style={{ flex: 1, fontSize: '12px', padding: '8px 10px' }}
        />
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Min"
          min="1"
          className="input-field"
          style={{ width: '60px', fontSize: '12px', padding: '8px 10px' }}
        />
      </div>
      <button type="submit" className="btn-primary" style={{ fontSize: '12px', padding: '8px 12px' }}>Add</button>
    </form>
  );
}

export default App;
