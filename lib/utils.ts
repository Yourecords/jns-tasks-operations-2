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
 * Role permissions check for taxi ordering.
 * Only Admin, Studio Operator, and Producers can order or manage taxis.
 */
export function canManageTaxis(user?: { role?: string; jobFunction?: string; id?: string } | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.role === 'PRODUCER' ||
    user.jobFunction === 'STUDIO_OPERATOR' ||
    user.id === 'usr_ahron_studio' ||
    user.id === 'usr_yuri_admin' ||
    user.id === 'usr_zach_producer'
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

export interface TimeRangeMinutes {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Parses a time or time range string (e.g. "10:30", "14:00 - 16:30 IDT")
 * into minute bounds from midnight.
 */
export function parseTimeRangeToMinutes(
  timeStr?: string,
  defaultDurationMinutes: number = 60
): TimeRangeMinutes | null {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.trim()) {
    return null;
  }

  const clean = timeStr.trim();
  // Pattern: "14:00 - 16:30", "10:00-11:30 IDT", "10:00 to 11:30"
  const rangeMatch = clean.match(/(\d{1,2}):(\d{2})\s*(?:am|pm)?\s*[-–—to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1], 10);
    const startM = parseInt(rangeMatch[2], 10);
    let endH = parseInt(rangeMatch[3], 10);
    const endM = parseInt(rangeMatch[4], 10);
    const endAmPm = rangeMatch[5]?.toLowerCase();

    if (endAmPm === 'pm' && endH < 12) endH += 12;
    if (endAmPm === 'am' && endH === 12) endH = 0;
    if (endAmPm === 'pm' && startH < 12 && startH <= endH - 12) {
      startH += 12;
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return {
      startMinutes,
      endMinutes: Math.max(endMinutes, startMinutes + 15),
    };
  }

  const startMinutes = parseFilmingTimeToMinutes(timeStr);
  if (startMinutes === 99999) return null;
  return {
    startMinutes,
    endMinutes: startMinutes + defaultDurationMinutes,
  };
}

/**
 * Checks if two time intervals overlap.
 * Touching boundary intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function isTimeRangeOverlapping(rangeA: TimeRangeMinutes, rangeB: TimeRangeMinutes): boolean {
  return rangeA.startMinutes < rangeB.endMinutes && rangeA.endMinutes > rangeB.startMinutes;
}

/**
 * Checks if a recording location/type occupies the physical studio.
 * - Any RENTAL (Studio Rental) ALWAYS occupies the physical studio facility.
 * - 'IN_STUDIO' or 'STUDIO': Yes (Physical studio occupied)
 * - 'STUDIO_REMOTE_GUEST': Yes (Physical studio occupied by host/panel while guest is remote)
 * - 'FULLY_REMOTE' or 'REMOTE' or 'FIELD': No (Zero physical studio occupation)
 */
export function requiresStudio(loc?: string, type?: string): boolean {
  if (type === 'RENTAL') return true;
  if (!loc) return true; // Default for studio productions
  const normalized = String(loc).trim().toUpperCase();
  if (normalized === 'FULLY_REMOTE' || normalized === 'REMOTE' || normalized === 'FIELD') {
    return false;
  }
  return (
    normalized === 'IN_STUDIO' ||
    normalized === 'STUDIO_REMOTE_GUEST' ||
    normalized === 'STUDIO' ||
    normalized.includes('STUDIO') ||
    normalized.includes('RENTAL') ||
    normalized.includes('DESK')
  );
}

export function isStudioProduction(p?: { type?: string; location?: string; recordingType?: string }): boolean {
  if (!p) return true;
  if (p.type === 'RENTAL') return true;
  return requiresStudio(p.location || p.recordingType, p.type);
}

export function isRemoteProduction(p?: { type?: string; location?: string; recordingType?: string }): boolean {
  return !isStudioProduction(p);
}

/**
 * Validates whether booking the main studio at the given date and time conflicts
 * with any existing studio filming or studio rental.
 * Fully remote recordings (FULLY_REMOTE / REMOTE) are completely exempt.
 */
export function findStudioConflict<
  T extends {
    id: string;
    title: string;
    filmingDate?: string;
    filmingTime?: string;
    location?: any;
    recordingType?: any;
    status?: string;
    type?: string;
    rentalDetails?: { recordingDate?: string; recordingTime?: string };
  }
>(
  productions: T[],
  date: string,
  timeStr: string | undefined,
  location: any = 'IN_STUDIO',
  excludeProductionId?: string
): { hasConflict: boolean; conflictingProduction?: T; reason?: string } {
  // If target does not occupy the physical studio, no conflict possible
  if (!requiresStudio(location)) {
    return { hasConflict: false };
  }

  if (!date || !timeStr) {
    return { hasConflict: false };
  }

  const targetRange = parseTimeRangeToMinutes(timeStr);
  if (!targetRange) {
    return { hasConflict: false };
  }

  for (const p of productions) {
    if (excludeProductionId && p.id === excludeProductionId) continue;
    if (p.status === 'ARCHIVED') continue;

    // Determine filming date of existing production
    const existingDate = p.filmingDate || p.rentalDetails?.recordingDate;
    if (existingDate !== date) continue;

    // Check if existing production occupies the physical studio
    const existingLocation = p.location || p.recordingType || (p.type === 'RENTAL' ? 'STUDIO' : 'STUDIO');
    if (!requiresStudio(existingLocation, p.type)) continue; // Fully remote shoots do not occupy the studio

    // Determine time of existing shoot
    const existingTimeStr = p.filmingTime || p.rentalDetails?.recordingTime;
    if (!existingTimeStr) continue;

    const existingRange = parseTimeRangeToMinutes(existingTimeStr);
    if (!existingRange) continue;

    if (isTimeRangeOverlapping(targetRange, existingRange)) {
      return {
        hasConflict: true,
        conflictingProduction: p,
        reason: `Studio is already booked on ${date} at ${existingTimeStr} for "${p.title}". Two productions cannot be booked in the studio at the same time. Please choose another hour or set location to Fully Remote recording.`,
      };
    }
  }

  return { hasConflict: false };
}

