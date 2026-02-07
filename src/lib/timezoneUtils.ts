import { format } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Common US timezones for the event timezone selector
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time', abbr: 'ET' },
  { value: 'America/Chicago', label: 'Central Time', abbr: 'CT' },
  { value: 'America/Denver', label: 'Mountain Time', abbr: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', abbr: 'PT' },
  { value: 'America/Anchorage', label: 'Alaska Time', abbr: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time', abbr: 'HT' },
] as const;

/**
 * Get the user's browser/local timezone
 */
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  formatStr: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Get the timezone abbreviation (e.g., "EST", "PST")
 * Uses the actual abbreviation for the given date to handle DST
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Convert a UTC date to display in a specific timezone
 * Returns a new Date object representing the same instant in the target timezone
 */
export function toDisplayTimezone(date: Date | string, timezone: string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, timezone);
}

/**
 * Get the hour and minute values for a date in a specific timezone
 * Useful for calculating calendar positions
 */
export function getTimeInTimezone(
  date: Date | string,
  timezone: string
): { hours: number; minutes: number } {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toZonedTime(dateObj, timezone);
  return {
    hours: zonedDate.getHours(),
    minutes: zonedDate.getMinutes(),
  };
}

/**
 * Get the date portion (YYYY-MM-DD) of a date in a specific timezone
 */
export function getDateInTimezone(date: Date | string, timezone: string): string {
  return formatInTimezone(date, timezone, 'yyyy-MM-dd');
}

/**
 * Check if a date is "today" in a specific timezone
 */
export function isTodayInTimezone(date: Date | string, timezone: string): boolean {
  const dateStr = getDateInTimezone(date, timezone);
  const todayStr = getDateInTimezone(new Date(), timezone);
  return dateStr === todayStr;
}

/**
 * Create a Date from hours/minutes in a specific timezone
 * Used when creating agenda items in event timezone mode
 */
export function createDateInTimezone(
  baseDate: Date,
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Get the date string in the target timezone
  const dateStr = formatInTimezone(baseDate, timezone, 'yyyy-MM-dd');
  // Create a date string with the specified time in the target timezone
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  const dateTimeStr = `${dateStr}T${timeStr}`;
  // Convert from the timezone back to UTC
  return fromZonedTime(dateTimeStr, timezone);
}

/**
 * Get the display label for a timezone
 */
export function getTimezoneLabel(timezone: string): string {
  const found = COMMON_TIMEZONES.find(tz => tz.value === timezone);
  if (found) {
    return `${found.label} (${getTimezoneAbbreviation(timezone)})`;
  }
  return timezone;
}
