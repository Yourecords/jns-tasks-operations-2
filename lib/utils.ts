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
