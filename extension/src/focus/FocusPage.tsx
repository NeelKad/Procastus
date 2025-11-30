import React, { useEffect, useState } from 'react';
import type { ActiveSession } from '@shared/types';
import { WEB_APP_URL } from '../constants';

export const FocusPage: React.FC = () => {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    chrome.storage.local.get(['sfState'], (data) => {
      const state = data.sfState;
      if (state?.activeSession) {
        setSession(state.activeSession as ActiveSession);
      } else {
        chrome.storage.local.get(['activeSession'], (fallbackData) => {
          if (fallbackData.activeSession) {
            setSession(fallbackData.activeSession as ActiveSession);
          }
        });
      }
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === 'local') {
        if (changes.sfState?.newValue?.activeSession) {
          setSession(changes.sfState.newValue.activeSession as ActiveSession);
        } else if (changes.activeSession) {
          setSession(changes.activeSession.newValue as ActiveSession | null);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function formatTime(value: number) {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function getTimer() {
    if (!session) return null;
    const current = session.entries[session.currentIndex];
    if (!current) return null;

    const durationMs = current.estimatedMinutes * 60_000;
    const elapsed = now - session.phaseStartedAt;
    const remaining = Math.max(0, durationMs - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return {
      formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      isComplete: remaining === 0,
      isBreak: current.isBreak,
      progress: durationMs ? Math.min(100, ((durationMs - remaining) / durationMs) * 100) : 0,
    };
  }

  function handleEndSession() {
    chrome.runtime.sendMessage({ type: 'SF_END_SESSION' }, () => {
      window.location.href = 'chrome://newtab/';
    });
  }

  function handleOpenWebApp() {
    window.open(WEB_APP_URL, '_blank');
  }

  if (!session) {
    return (
      <div style={styles.container}>
        <div style={styles.panel}>
          <div style={styles.hero}>
            <div style={styles.icon}>🎯</div>
            <h1 style={styles.title}>Stay Focused</h1>
            <p style={styles.subtitle}>No active focus session detected.</p>
              <button onClick={handleOpenWebApp} style={styles.primaryButton}>
                Open Procastus Web App
              </button>
          </div>
        </div>
      </div>
    );
  }

  const timer = getTimer();
  const currentEntry = session.entries[session.currentIndex];
  const progress = session.entries.length > 0 
    ? ((session.currentIndex + 1) / session.entries.length) * 100 
    : 0;
  const upcomingEntries = session.entries.slice(session.currentIndex + 1);

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.icon}>🚫</div>
            <div>
              <h1 style={styles.mainTitle}>Blocked for Focus</h1>
              <p style={styles.headerSubtitle}>This site is restricted during your focus session. Use the web app to manage your session.</p>
            </div>
          </div>
        </div>

        <div style={styles.timerSection}>
          <div style={styles.timerCard}>
            <div style={styles.timerLabel}>
              {timer?.isBreak ? 'Break Time Remaining' : 'Time Remaining'}
            </div>
            <div style={styles.timerDisplay}>{timer?.formatted || '--:--'}</div>
            {timer?.isComplete && (
              <div style={styles.completeMessage}>Time's up! Ready to continue?</div>
            )}
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${timer?.progress || 0}%` }} />
            </div>
          </div>

          <div style={styles.currentTaskCard}>
            <div style={styles.taskLabel}>Current {timer?.isBreak ? 'Break' : 'Task'}</div>
            <div style={styles.taskName}>{currentEntry?.title || 'N/A'}</div>
            <div style={styles.taskInfo}>
              {currentEntry?.isBreak
                ? 'Enjoy a 5-minute recharge'
                : `Allocated: ${formatDuration(currentEntry?.estimatedMinutes ?? 0)}`}
            </div>
            <div style={styles.progressText}>
              Step {session.currentIndex + 1} of {session.entries.length} ({Math.round(progress)}% complete)
            </div>
          </div>
        </div>

        {upcomingEntries.length > 0 && (
          <div style={styles.upcomingSection}>
            <h3 style={styles.sectionTitle}>Upcoming</h3>
            <div style={styles.upcomingList}>
              {upcomingEntries.slice(0, 5).map((entry, idx) => (
                <div key={entry.id} style={styles.upcomingItem}>
                  <span style={styles.upcomingNumber}>{session.currentIndex + idx + 2}</span>
                  <div style={styles.upcomingContent}>
                    <strong style={styles.upcomingTitle}>{entry.title}</strong>
                    <span style={styles.upcomingTime}>
                      {entry.isBreak ? '5 min break' : formatDuration(entry.estimatedMinutes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.blockedSitesSection}>
          <h4 style={styles.sectionTitle}>Blocked Sites</h4>
          <div style={styles.blockedSitesList}>
            {session.blockedSites.map((site) => (
              <span key={site} style={styles.blockedTag}>{site}</span>
            ))}
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={handleOpenWebApp} style={styles.primaryButton}>
            Open Procastus Web App
          </button>
          <button onClick={handleEndSession} style={styles.secondaryButton}>
            End Focus Session
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'auto',
  },
  panel: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '800px',
    width: '100%',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  icon: {
    fontSize: '48px',
    lineHeight: 1,
  },
  mainTitle: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
  },
  headerSubtitle: {
    margin: '8px 0 0',
    fontSize: '16px',
    color: '#6b7280',
  },
  hero: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  title: {
    margin: '16px 0 8px',
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: '16px',
    color: '#6b7280',
  },
  timerSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  timerCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '32px',
    color: 'white',
    textAlign: 'center',
  },
  timerLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timerDisplay: {
    fontSize: '64px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    margin: '16px 0',
    lineHeight: 1,
  },
  completeMessage: {
    fontSize: '14px',
    opacity: 0.9,
    marginTop: '12px',
    fontStyle: 'italic',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  progressFill: {
    height: '100%',
    background: 'white',
    transition: 'width 0.3s ease',
  },
  currentTaskCard: {
    background: '#f9fafb',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #e5e7eb',
  },
  taskLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  taskName: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  taskInfo: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  progressText: {
    fontSize: '14px',
    color: '#667eea',
    fontWeight: 600,
  },
  upcomingSection: {
    marginBottom: '32px',
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  upcomingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  upcomingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  upcomingNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  upcomingContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  upcomingTitle: {
    fontSize: '15px',
    color: '#111827',
  },
  upcomingTime: {
    fontSize: '13px',
    color: '#6b7280',
  },
  blockedSitesSection: {
    marginBottom: '32px',
    padding: '20px',
    background: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #fbbf24',
  },
  blockedSitesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
  },
  blockedTag: {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#fbbf24',
    color: '#78350f',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  primaryButton: {
    padding: '16px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
