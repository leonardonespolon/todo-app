// src/utils/computeWrapped.js

const PERIOD_MS = {
  week: 7 * 86400000,
  month: 30 * 86400000,
  year: 365 * 86400000,
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Returns the key (number) that appears most often in items.
// Tiebreaker: smallest numeric key wins.
function modeBy(items, keyFn) {
  if (!items.length) return null;
  const counts = {};
  for (const item of items) {
    const k = keyFn(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  let best = null, bestCount = 0;
  for (const [k, count] of Object.entries(counts)) {
    const num = Number(k);
    if (count > bestCount || (count === bestCount && num < Number(best))) {
      best = k;
      bestCount = count;
    }
  }
  return best === null ? null : Number(best);
}

// Streak = longest run of consecutive UTC calendar days with ≥1 completion.
function longestStreak(completions) {
  if (!completions.length) return 0;
  const dayNums = [...new Set(
    completions.map(t => Math.floor(t.completedAt / 86400000))
  )].sort((a, b) => a - b);
  let max = 1, cur = 1;
  for (let i = 1; i < dayNums.length; i++) {
    cur = dayNums[i] === dayNums[i - 1] + 1 ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

function getPersonality(completions, avgMs, completionRate, bestHour, streak) {
  if (completions.length < 3) return { personality: null, personalityDesc: null };
  const avgHours = avgMs / 3600000;
  if (completionRate !== null && completionRate >= 90) {
    return { personality: 'The Closer', personalityDesc: 'You finish almost everything you start.' };
  }
  if (avgHours < 2) {
    return { personality: 'The Sprint King', personalityDesc: 'You blast through tasks fast.' };
  }
  if (bestHour !== null && (bestHour >= 22 || bestHour < 5)) {
    return { personality: 'The Night Owl', personalityDesc: 'You do your best work after dark.' };
  }
  if (bestHour !== null && bestHour >= 5 && bestHour < 9) {
    return { personality: 'The Early Bird', personalityDesc: 'You hit the ground running every morning.' };
  }
  if (streak >= 5) {
    return { personality: 'The Consistent One', personalityDesc: 'Showing up every day is your superpower.' };
  }
  if (avgHours > 24) {
    return { personality: 'The Deep Thinker', personalityDesc: 'You take your time and do it right.' };
  }
  return { personality: 'The Steady Hand', personalityDesc: 'Reliable, methodical, always moving forward.' };
}

/**
 * Computes Wrapped stats from the task array for the given period.
 *
 * @param {Array} tasks - full task array from useTasks
 * @param {'week'|'month'|'year'} period - rolling window
 * @returns {object} stats object (all fields null/0 if no completions in period)
 */
export function computeWrapped(tasks, period) {
  const now = Date.now();
  const windowStart = now - PERIOD_MS[period];

  const completions = tasks.filter(t => t.completedAt !== null && t.completedAt >= windowStart);
  const activeInPeriod = tasks.filter(t => t.completedAt === null && t.createdAt >= windowStart);

  if (completions.length === 0) {
    return {
      completed: 0,
      fastestMs: null,
      avgMs: null,
      longestStreak: 0,
      completionRate: null,
      bestDay: null,
      bestHour: null,
      personality: null,
      personalityDesc: null,
    };
  }

  const durations = completions.map(t => t.completedAt - t.createdAt);
  const fastestMs = Math.min(...durations);
  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;

  const totalForRate = completions.length + activeInPeriod.length;
  const completionRate = totalForRate > 0 ? Math.round((completions.length / totalForRate) * 100) : null;

  const bestHour = modeBy(completions, t => new Date(t.completedAt).getUTCHours());
  const bestDayIndex = modeBy(completions, t => new Date(t.completedAt).getUTCDay());
  const bestDay = bestDayIndex !== null ? DAYS[bestDayIndex] : null;

  const streak = longestStreak(completions);
  const { personality, personalityDesc } = getPersonality(completions, avgMs, completionRate, bestHour, streak);

  return {
    completed: completions.length,
    fastestMs,
    avgMs,
    longestStreak: streak,
    completionRate,
    bestDay,
    bestHour,
    personality,
    personalityDesc,
  };
}
