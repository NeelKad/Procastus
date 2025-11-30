import type { Task, SessionEntry, TimetableSlot, ActiveSession } from './types';

export function createSessionEntries(baseTasks: Task[]): SessionEntry[] {
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

export function generateTimetable(tasks: Task[]): TimetableSlot[] {
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

export function createActiveSession(tasks: Task[], blockedSites: string[]): ActiveSession {
  const entries = createSessionEntries(tasks);
  const timetable = generateTimetable(tasks);
  const now = Date.now();

  return {
    baseTasks: tasks,
    entries,
    blockedSites,
    currentIndex: 0,
    phaseStartedAt: now,
    sessionStartedAt: now,
    timetable,
  };
}

export function reorderTasks(tasks: Task[]): Task[] {
  return tasks.map((task, index) => ({
    ...task,
    order: index,
  }));
}

