// src/components/WrappedModal.jsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { computeWrapped } from '../utils/computeWrapped';

const PERIODS = ['week', 'month', 'year'];

function formatDuration(ms) {
  if (ms === null) return '—';
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function formatHour(hour) {
  if (hour === null) return '—';
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
}

export default function WrappedModal({ tasks, onClose }) {
  const [period, setPeriod] = useState('week');
  const stats = computeWrapped(tasks, period);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="wrapped-backdrop" onClick={onClose}>
      <div className="wrapped-modal" onClick={e => e.stopPropagation()}>
        <button className="wrapped-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h2 className="wrapped-title">Your Wrapped</h2>

        <div className="wrapped-period-switcher">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`wrapped-period-btn${period === p ? ' wrapped-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {stats.completed === 0 ? (
          <p className="wrapped-empty">No completed tasks this {period} yet.</p>
        ) : (
          <>
            <div className="wrapped-stats">
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{stats.completed}</span>
                <span className="wrapped-stat-label">tasks completed</span>
              </div>
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{formatDuration(stats.fastestMs)}</span>
                <span className="wrapped-stat-label">fastest completion</span>
              </div>
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{formatDuration(stats.avgMs)}</span>
                <span className="wrapped-stat-label">avg completion time</span>
              </div>
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{stats.longestStreak}d</span>
                <span className="wrapped-stat-label">longest streak</span>
              </div>
              {stats.completionRate !== null && (
                <div className="wrapped-stat">
                  <span className="wrapped-stat-number">{stats.completionRate}%</span>
                  <span className="wrapped-stat-label">completion rate</span>
                </div>
              )}
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{stats.bestDay ?? '—'}</span>
                <span className="wrapped-stat-label">most productive day</span>
              </div>
              <div className="wrapped-stat">
                <span className="wrapped-stat-number">{formatHour(stats.bestHour)}</span>
                <span className="wrapped-stat-label">most productive hour</span>
              </div>
            </div>

            <div className="wrapped-personality">
              {stats.personality ? (
                <>
                  <p className="wrapped-personality-label">{stats.personality}</p>
                  <p className="wrapped-personality-desc">{stats.personalityDesc}</p>
                </>
              ) : (
                <p className="wrapped-personality-empty">Not enough data yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
