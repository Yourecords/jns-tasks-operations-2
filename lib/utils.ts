import { User } from './types';

// Helper to count words for validation rules (>= 100 substantive words)
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Checks if a user is eligible to be assigned as a video editor:
 * Video editors by definition (jobFunction === 'VIDEO_EDITOR' or position 'Video Editor')
 * and Yuri (Director of Video Production / Admin).
 */
export function isEligibleEditor(u: User): boolean {
  if (!u || u.isActive === false) return false;
  return (
    u.jobFunction === 'VIDEO_EDITOR' ||
    u.positionDisplay === 'Video Editor' ||
    u.id === 'usr_yuri_admin' ||
    u.name?.toLowerCase() === 'yuri'
  );
}

/**
 * Parses a filming time string (e.g. "10:30", "09:00 AM", "14:00 - 16:30 IDT", "2pm")
 * into total minutes from midnight for chronological sorting.
 * Shoots without a specified time return 99999 to be sorted at the end.
 */
export function parseFilmingTimeToMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.trim()) {
    return 99999;
  }

  const clean = timeStr.trim();

  // Pattern 1: Matches "HH:MM" with optional am/pm (e.g., "10:30", "14:00 - 16:30 IDT", "09:15 am")
  const matchColon = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (matchColon) {
    let hours = parseInt(matchColon[1], 10);
    const minutes = parseInt(matchColon[2], 10);
    const ampm = matchColon[3]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // Pattern 2: Matches single hour number with optional am/pm (e.g., "14", "2pm", "10 am")
  const matchHourOnly = clean.match(/^(\d{1,2})\s*(am|pm)?/i);
  if (matchHourOnly) {
    let hours = parseInt(matchHourOnly[1], 10);
    const ampm = matchHourOnly[2]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return hours * 60;
  }

  return 99999;
}

/**
 * Sorts productions by filming date ascending, and then by the hour of filming ascending
 * (the earliest hour of filming appears on top).
 */
export function sortProductionsByFilmingSchedule<T extends { filmingDate?: string; filmingTime?: string; title?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const dateA = a.filmingDate || '';
    const dateB = b.filmingDate || '';
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;

    const timeA = parseFilmingTimeToMinutes(a.filmingTime);
    const timeB = parseFilmingTimeToMinutes(b.filmingTime);
    if (timeA !== timeB) return timeA - timeB;

    return (a.title || '').localeCompare(b.title || '');
  });
}

