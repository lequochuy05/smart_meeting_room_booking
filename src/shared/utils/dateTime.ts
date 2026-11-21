/**
 * Company-wide ISO-8601 and timezone policy.
 *
 * - Transmitted/stored values are ISO-8601 date-times WITH an explicit offset
 *   (for example `2026-11-21T09:00:00+07:00`). They are unambiguous instants.
 * - Dates are `YYYY-MM-DD` and times are `HH:mm`, always interpreted in the
 *   company timezone, never in the device timezone.
 * - Display always converts instants into the company timezone.
 */
export const COMPANY_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const COMPANY_TIMEZONE_LABEL = 'Asia/Ho_Chi_Minh (UTC+07:00)';

export const SLOT_MINUTES = 30;
export const MINUTE_MS = 60_000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_WITH_OFFSET_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day
  );
}

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Parses an ISO-8601 date-time that carries an offset. Returns epoch ms or null. */
export function parseIso(value: string): number | null {
  if (typeof value !== 'string') return null;
  const match = ISO_WITH_OFFSET_PATTERN.exec(value);
  if (!match) return null;
  if (!isValidDateString(`${match[1]}-${match[2]}-${match[3]}`)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function isValidIso(value: string): boolean {
  return parseIso(value) !== null;
}

/** Offset (minutes east of UTC) of `timeZone` at the given instant. */
export function getTimezoneOffsetMinutes(instantMs: number, timeZone: string = COMPANY_TIMEZONE): number {
  const parts = getZonedParts(instantMs, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / MINUTE_MS);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const COMPANY_FIXED_OFFSET_MINUTES = 7 * 60;
const formatterCache = new Map<string, Intl.DateTimeFormat | null>();

function getFormatter(timeZone: string): Intl.DateTimeFormat | null {
  if (formatterCache.has(timeZone)) return formatterCache.get(timeZone) ?? null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
  } catch {
    formatterCache.set(timeZone, null);
    return null;
  }
}

function getZonedParts(instantMs: number, timeZone: string): ZonedParts {
  const formatter = getFormatter(timeZone);
  if (!formatter) {
    // Hermes fallback when ICU timezone tables are unavailable (UTC+07:00 has no DST).
    const shifted = new Date(instantMs + COMPANY_FIXED_OFFSET_MINUTES * MINUTE_MS);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
    };
  }
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Converts an instant into the canonical ISO-8601 string in the company timezone. */
export function toCompanyIso(instant: Date | number | string, timeZone: string = COMPANY_TIMEZONE): string {
  const ms = typeof instant === 'string' ? (parseIso(instant) as number) : +instant;
  const offset = getTimezoneOffsetMinutes(ms, timeZone);
  const local = getZonedParts(ms, timeZone);
  return (
    `${local.year}-${pad(local.month)}-${pad(local.day)}` +
    `T${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)}${formatOffset(offset)}`
  );
}

/** Builds an ISO-8601 instant from a company-timezone date and time. */
export function combineDateAndTime(
  date: string,
  time: string,
  timeZone: string = COMPANY_TIMEZONE,
): string {
  if (!isValidDateString(date) || !isValidTimeString(time)) {
    throw new RangeError(`Invalid date/time: ${date} ${time}`);
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Resolve the offset for the wall-clock time (two passes handle DST edges).
  let offset = getTimezoneOffsetMinutes(wallClockAsUtc, timeZone);
  let instant = wallClockAsUtc - offset * MINUTE_MS;
  const refined = getTimezoneOffsetMinutes(instant, timeZone);
  if (refined !== offset) {
    offset = refined;
    instant = wallClockAsUtc - offset * MINUTE_MS;
  }
  return `${date}T${time}:00${formatOffset(offset)}`;
}

/** `YYYY-MM-DD` of the instant in the company timezone. */
export function toCompanyDate(instant: Date | number | string, timeZone: string = COMPANY_TIMEZONE): string {
  return toCompanyIso(instant, timeZone).slice(0, 10);
}

/** `HH:mm` of the instant in the company timezone. */
export function toCompanyTime(instant: Date | number | string, timeZone: string = COMPANY_TIMEZONE): string {
  return toCompanyIso(instant, timeZone).slice(11, 16);
}

export function todayInCompanyTimezone(now: Date = new Date()): string {
  return toCompanyDate(now);
}

export function addDays(date: string, days: number): string {
  if (!isValidDateString(date)) throw new RangeError(`Invalid date: ${date}`);
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Epoch-ms bounds [start, end) of a company-timezone calendar day. */
export function getDayBounds(date: string): { startMs: number; endMs: number } {
  return {
    startMs: parseIso(combineDateAndTime(date, '00:00')) as number,
    endMs: parseIso(combineDateAndTime(addDays(date, 1), '00:00')) as number,
  };
}

export function formatCompanyTime(instant: Date | number | string): string {
  return toCompanyTime(instant);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatCompanyDate(instant: Date | number | string, timeZone: string = COMPANY_TIMEZONE): string {
  const ms = typeof instant === 'string' ? (parseIso(instant) as number) : +instant;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    const parts = getZonedParts(ms, timeZone);
    const weekday = WEEKDAYS[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
    return `${weekday}, ${pad(parts.day)} ${MONTHS[parts.month - 1]} ${parts.year}`;
  }
}

export function formatCompanyRange(startIso: string, endIso: string): string {
  return `${formatCompanyDate(startIso)} · ${toCompanyTime(startIso)}–${toCompanyTime(endIso)}`;
}

export function minutesBetween(startMs: number, endMs: number): number {
  return Math.round((endMs - startMs) / MINUTE_MS);
}
