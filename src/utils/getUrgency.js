/**
 * Returns urgency level for an incomplete task based on age.
 * Only call this for incomplete tasks.
 *
 * @param {number} createdAt - task creation timestamp
 * @param {number} [warningHours=24] - hours before warning (yellow)
 * @param {number} [criticalHours=48] - hours before critical (red)
 */
export function getUrgency(createdAt, warningHours = 24, criticalHours = 48) {
  if (!createdAt) return null;
  const age = Date.now() - createdAt;
  const warn = warningHours * 3600000;
  const crit = criticalHours * 3600000;
  if (age >= crit) return 'red';
  if (age >= warn) return 'yellow';
  return null;
}
