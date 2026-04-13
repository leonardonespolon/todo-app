import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeWrapped } from '../../src/utils/computeWrapped';

// Fixed point in time: 2026-01-15T12:00:00Z (a Thursday)
const NOW = new Date('2026-01-15T12:00:00Z').getTime();
const DAY = 86400000;
const HOUR = 3600000;

function task(overrides) {
  return {
    id: 'test',
    text: 'Task',
    createdAt: NOW - 5 * DAY,
    completedAt: null,
    listId: 'todo',
    ...overrides,
  };
}

describe('computeWrapped', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // ── period window ──────────────────────────────────────────────────────
  describe('period window filtering', () => {
    it('week includes tasks completed within 7 days', () => {
      vi.setSystemTime(NOW);
      const t = task({ completedAt: NOW - 3 * DAY });
      expect(computeWrapped([t], 'week').completed).toBe(1);
    });

    it('week excludes tasks completed more than 7 days ago', () => {
      vi.setSystemTime(NOW);
      const t = task({ completedAt: NOW - 8 * DAY });
      expect(computeWrapped([t], 'week').completed).toBe(0);
    });

    it('month uses 30-day window', () => {
      vi.setSystemTime(NOW);
      const t = task({ completedAt: NOW - 25 * DAY });
      expect(computeWrapped([t], 'month').completed).toBe(1);
      expect(computeWrapped([t], 'week').completed).toBe(0);
    });

    it('year uses 365-day window', () => {
      vi.setSystemTime(NOW);
      const t = task({ completedAt: NOW - 200 * DAY });
      expect(computeWrapped([t], 'year').completed).toBe(1);
      expect(computeWrapped([t], 'month').completed).toBe(0);
    });
  });

  // ── empty period ───────────────────────────────────────────────────────
  describe('empty period', () => {
    it('returns zero/null for all stats when no completions', () => {
      vi.setSystemTime(NOW);
      const result = computeWrapped([], 'week');
      expect(result.completed).toBe(0);
      expect(result.fastestMs).toBeNull();
      expect(result.avgMs).toBeNull();
      expect(result.longestStreak).toBe(0);
      expect(result.completionRate).toBeNull();
      expect(result.bestDay).toBeNull();
      expect(result.bestHour).toBeNull();
      expect(result.personality).toBeNull();
      expect(result.personalityDesc).toBeNull();
    });
  });

  // ── fastest and avg ────────────────────────────────────────────────────
  describe('fastest and avg completion time', () => {
    it('calculates fastestMs and avgMs correctly', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ createdAt: NOW - 3 * HOUR, completedAt: NOW - 2 * HOUR }), // 1h
        task({ createdAt: NOW - 5 * HOUR, completedAt: NOW - 2 * HOUR }), // 3h
      ];
      const result = computeWrapped(tasks, 'week');
      expect(result.fastestMs).toBe(HOUR);
      expect(result.avgMs).toBe(2 * HOUR);
    });
  });

  // ── completion rate ────────────────────────────────────────────────────
  describe('completion rate', () => {
    it('calculates rate as completed / (completed + active created in period)', () => {
      vi.setSystemTime(NOW);
      const done = task({ createdAt: NOW - 3 * DAY, completedAt: NOW - 1 * DAY });
      const active = task({ createdAt: NOW - 2 * DAY, completedAt: null });
      expect(computeWrapped([done, active], 'week').completionRate).toBe(50);
    });

    it('excludes active tasks created outside the period from the rate', () => {
      vi.setSystemTime(NOW);
      const done = task({ createdAt: NOW - 3 * DAY, completedAt: NOW - 1 * DAY });
      const oldActive = task({ createdAt: NOW - 30 * DAY, completedAt: null });
      expect(computeWrapped([done, oldActive], 'week').completionRate).toBe(100);
    });
  });

  // ── streak ─────────────────────────────────────────────────────────────
  describe('longest streak', () => {
    it('counts consecutive UTC days correctly', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ completedAt: NOW - 2 * DAY }),
        task({ completedAt: NOW - 1 * DAY }),
        task({ completedAt: NOW }),
      ];
      expect(computeWrapped(tasks, 'week').longestStreak).toBe(3);
    });

    it('resets streak on a day gap', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ completedAt: NOW - 4 * DAY }),
        task({ completedAt: NOW - 1 * DAY }),
        task({ completedAt: NOW }),
      ];
      expect(computeWrapped(tasks, 'week').longestStreak).toBe(2);
    });

    it('returns 1 when all completions are on the same day', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ completedAt: NOW - 1 * HOUR }),
        task({ completedAt: NOW - 2 * HOUR }),
      ];
      expect(computeWrapped(tasks, 'week').longestStreak).toBe(1);
    });
  });

  // ── best day / hour ────────────────────────────────────────────────────
  describe('most productive day and hour', () => {
    it('returns the day name with most completions', () => {
      vi.setSystemTime(NOW);
      // NOW = Thursday; two on Thursday, one on Wednesday
      const tasks = [
        task({ completedAt: NOW }),
        task({ completedAt: NOW - HOUR }),
        task({ completedAt: NOW - 1 * DAY }),
      ];
      expect(computeWrapped(tasks, 'week').bestDay).toBe('Thursday');
    });

    it('tiebreaker: earlier hour wins', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ completedAt: new Date('2026-01-15T09:00:00Z').getTime() }),
        task({ completedAt: new Date('2026-01-14T09:00:00Z').getTime() }),
        task({ completedAt: new Date('2026-01-13T14:00:00Z').getTime() }),
        task({ completedAt: new Date('2026-01-12T14:00:00Z').getTime() }),
      ];
      expect(computeWrapped(tasks, 'week').bestHour).toBe(9);
    });
  });

  // ── personality label ──────────────────────────────────────────────────
  describe('personality label', () => {
    it('returns null personality when fewer than 3 completions', () => {
      vi.setSystemTime(NOW);
      const tasks = [
        task({ completedAt: NOW - 1 * HOUR }),
        task({ completedAt: NOW - 2 * HOUR }),
      ];
      expect(computeWrapped(tasks, 'week').personality).toBeNull();
    });

    it('The Closer: completion rate ≥ 90%', () => {
      vi.setSystemTime(NOW);
      // 9 completed, 1 active in period → 90%
      const done = Array.from({ length: 9 }, (_, i) =>
        task({ createdAt: NOW - (i + 2) * HOUR, completedAt: NOW - (i + 1) * HOUR })
      );
      const active = task({ createdAt: NOW - HOUR, completedAt: null });
      const result = computeWrapped([...done, active], 'week');
      expect(result.completionRate).toBe(90);
      expect(result.personality).toBe('The Closer');
    });

    it('The Sprint King: avg completion < 2h', () => {
      vi.setSystemTime(NOW);
      const tasks = Array.from({ length: 3 }, () =>
        task({ createdAt: NOW - 90 * 60000, completedAt: NOW - 1000 })
      );
      // completionRate = 100% → The Closer wins if ≥90%
      // Force rate below 90%: add 2 active tasks
      const actives = Array.from({ length: 2 }, () =>
        task({ createdAt: NOW - HOUR, completedAt: null })
      );
      const result = computeWrapped([...tasks, ...actives], 'week');
      expect(result.personality).toBe('The Sprint King');
    });

    it('The Closer takes priority over The Sprint King', () => {
      vi.setSystemTime(NOW);
      // Fast tasks (avg < 2h) AND high completion rate (100%) → Closer wins
      const tasks = Array.from({ length: 3 }, () =>
        task({ createdAt: NOW - 90 * 60000, completedAt: NOW - 1000 })
      );
      const result = computeWrapped(tasks, 'week');
      expect(result.completionRate).toBe(100);
      expect(result.personality).toBe('The Closer');
    });

    it('The Steady Hand: default when no other rule matches', () => {
      vi.setSystemTime(NOW);
      // 3 tasks, avg ~3h (not fast), rate ~60% (not high), midday hour, short streak
      const tasks = [
        task({ createdAt: NOW - 4 * HOUR, completedAt: NOW - 1 * HOUR }),  // 3h, 11am UTC
        task({ createdAt: NOW - 4 * HOUR, completedAt: NOW - 2 * HOUR }),  // 2h
        task({ createdAt: NOW - 4 * HOUR, completedAt: NOW - 3 * HOUR }),  // 1h
      ];
      const active = task({ createdAt: NOW - HOUR, completedAt: null });
      const result = computeWrapped([...tasks, active], 'week');
      expect(result.personality).toBe('The Steady Hand');
    });
  });
});
