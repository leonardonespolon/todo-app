import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUrgency } from '../../src/utils/getUrgency';

const H24 = 86400000;
const H48 = 172800000;

describe('getUrgency', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns null for tasks created less than 24h ago', () => {
    const created = Date.now();
    vi.setSystemTime(created + H24 - 1);
    expect(getUrgency(created)).toBe(null);
  });

  it('returns yellow for a task created exactly 24h ago', () => {
    const created = Date.now();
    vi.setSystemTime(created + H24);
    expect(getUrgency(created)).toBe('yellow');
  });

  it('returns yellow for tasks between 24h and 48h old', () => {
    const created = Date.now();
    vi.setSystemTime(created + H24 + 1);
    expect(getUrgency(created)).toBe('yellow');

    vi.setSystemTime(created + H48 - 1);
    expect(getUrgency(created)).toBe('yellow');
  });

  it('returns red for a task created exactly 48h ago', () => {
    const created = Date.now();
    vi.setSystemTime(created + H48);
    expect(getUrgency(created)).toBe('red');
  });

  it('returns red for tasks older than 48h', () => {
    const created = Date.now();
    vi.setSystemTime(created + H48 + 1);
    expect(getUrgency(created)).toBe('red');
  });

  it('returns null for null createdAt', () => {
    expect(getUrgency(null)).toBe(null);
  });

  it('returns null for undefined createdAt', () => {
    expect(getUrgency(undefined)).toBe(null);
  });

  describe('custom thresholds', () => {
    it('respects custom warningHours', () => {
      const created = Date.now();
      // 12h threshold: task at 12h should be yellow
      vi.setSystemTime(created + 12 * 3600000);
      expect(getUrgency(created, 12, 24)).toBe('yellow');
    });

    it('respects custom criticalHours', () => {
      const created = Date.now();
      // 24h critical threshold: task at 24h should be red
      vi.setSystemTime(created + 24 * 3600000);
      expect(getUrgency(created, 12, 24)).toBe('red');
    });

    it('returns null when age is below custom warningHours', () => {
      const created = Date.now();
      vi.setSystemTime(created + 11 * 3600000);
      expect(getUrgency(created, 12, 24)).toBe(null);
    });

    it('custom thresholds do not affect default behavior when not passed', () => {
      const created = Date.now();
      // At 12h, default thresholds (24/48) should still return null
      vi.setSystemTime(created + 12 * 3600000);
      expect(getUrgency(created)).toBe(null);
    });
  });
});
