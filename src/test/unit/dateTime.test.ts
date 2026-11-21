import {
  COMPANY_TIMEZONE,
  addDays,
  combineDateAndTime,
  formatCompanyRange,
  getDayBounds,
  getTimezoneOffsetMinutes,
  isValidDateString,
  isValidIso,
  isValidTimeString,
  parseIso,
  toCompanyDate,
  toCompanyIso,
  toCompanyTime,
} from '@/shared/utils/dateTime';

describe('dateTime utilities', () => {
  it('uses the Ho Chi Minh company timezone (UTC+7)', () => {
    expect(COMPANY_TIMEZONE).toBe('Asia/Ho_Chi_Minh');
    expect(getTimezoneOffsetMinutes(Date.parse('2026-11-21T00:00:00Z'))).toBe(420);
  });

  it('combines a company date and time into an ISO-8601 value with offset', () => {
    expect(combineDateAndTime('2026-11-21', '09:30')).toBe('2026-11-21T09:30:00+07:00');
  });

  it('rejects malformed dates and times', () => {
    expect(() => combineDateAndTime('2026-13-01', '09:30')).toThrow(RangeError);
    expect(() => combineDateAndTime('2026-11-21', '25:00')).toThrow(RangeError);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidTimeString('9:30')).toBe(false);
  });

  it('only accepts ISO-8601 values that carry an offset', () => {
    expect(isValidIso('2026-11-21T09:30:00+07:00')).toBe(true);
    expect(isValidIso('2026-11-21T02:30:00Z')).toBe(true);
    expect(isValidIso('2026-11-21T09:30:00')).toBe(false);
    expect(isValidIso('2026-11-21 09:30')).toBe(false);
    expect(isValidIso('not-a-date')).toBe(false);
  });

  it('converts any offset into the company timezone for display', () => {
    const utc = '2026-11-21T02:30:00Z';
    expect(toCompanyIso(utc)).toBe('2026-11-21T09:30:00+07:00');
    expect(toCompanyTime(utc)).toBe('09:30');
    expect(toCompanyDate('2026-11-20T20:00:00Z')).toBe('2026-11-21');
  });

  it('keeps the same instant regardless of the offset used to express it', () => {
    expect(parseIso('2026-11-21T09:30:00+07:00')).toBe(parseIso('2026-11-21T02:30:00Z'));
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes company-day bounds of 24 hours', () => {
    const { startMs, endMs } = getDayBounds('2026-11-21');
    expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
    expect(toCompanyIso(startMs)).toBe('2026-11-21T00:00:00+07:00');
  });

  it('formats a range using company time', () => {
    expect(formatCompanyRange('2026-11-21T02:00:00Z', '2026-11-21T03:00:00Z')).toContain('09:00–10:00');
  });
});
