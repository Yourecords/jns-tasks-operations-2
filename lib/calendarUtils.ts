// Production Calendar Utilities & Color Palettes

export interface ShowTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  border: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
  badgeBg: string;
}

export const SHOW_THEMES: Record<string, ShowTheme> = {
  the_quad: {
    id: 'the_quad',
    name: 'The Quad',
    primary: '#2563eb',
    accent: '#60a5fa',
    border: '#3b82f6',
    bgDark: 'rgba(37, 99, 235, 0.18)',
    bgLight: 'rgba(219, 234, 254, 0.9)',
    textDark: '#bfdbfe',
    textLight: '#1e40af',
    badgeBg: '#1d4ed8',
  },
  axis_of_truth: {
    id: 'axis_of_truth',
    name: 'Axis Of Truth',
    primary: '#991b1b',
    accent: '#f87171',
    border: '#b91c1c',
    bgDark: 'rgba(153, 27, 27, 0.22)',
    bgLight: 'rgba(254, 226, 226, 0.9)',
    textDark: '#fecaca',
    textLight: '#991b1b',
    badgeBg: '#7f1d1d',
  },
  think_twice: {
    id: 'think_twice',
    name: 'Think Twice',
    primary: '#16a34a',
    accent: '#4ade80',
    border: '#22c55e',
    bgDark: 'rgba(22, 163, 74, 0.18)',
    bgLight: 'rgba(220, 252, 231, 0.9)',
    textDark: '#bbf7d0',
    textLight: '#15803d',
    badgeBg: '#166534',
  },
  meira_k: {
    id: 'meira_k',
    name: 'Meira K',
    primary: '#c026d3',
    accent: '#f472b6',
    border: '#d946ef',
    bgDark: 'rgba(192, 38, 211, 0.18)',
    bgLight: 'rgba(250, 232, 255, 0.9)',
    textDark: '#f5d0fe',
    textLight: '#86198f',
    badgeBg: '#a21caf',
  },
  straight_up: {
    id: 'straight_up',
    name: 'Straight Up',
    primary: '#0891b2',
    accent: '#22d3ee',
    border: '#06b6d4',
    bgDark: 'rgba(8, 145, 178, 0.18)',
    bgLight: 'rgba(207, 250, 254, 0.9)',
    textDark: '#a5f3fc',
    textLight: '#0e7490',
    badgeBg: '#0e7490',
  },
  jerusalem_minute: {
    id: 'jerusalem_minute',
    name: 'Jerusalem Minute',
    primary: '#dc2626',
    accent: '#f87171',
    border: '#ef4444',
    bgDark: 'rgba(220, 38, 38, 0.20)',
    bgLight: 'rgba(254, 226, 226, 0.9)',
    textDark: '#fca5a5',
    textLight: '#b91c1c',
    badgeBg: '#b91c1c',
  },
  judeacation: {
    id: 'judeacation',
    name: 'Judeacation',
    primary: '#ea580c',
    accent: '#fb923c',
    border: '#f97316',
    bgDark: 'rgba(234, 88, 12, 0.18)',
    bgLight: 'rgba(255, 237, 213, 0.9)',
    textDark: '#fed7aa',
    textLight: '#c2410c',
    badgeBg: '#9a3412',
  },
  basic_law: {
    id: 'basic_law',
    name: 'Basic Law',
    primary: '#4f46e5',
    accent: '#818cf8',
    border: '#6366f1',
    bgDark: 'rgba(79, 70, 229, 0.18)',
    bgLight: 'rgba(224, 231, 255, 0.9)',
    textDark: '#c7d2fe',
    textLight: '#4338ca',
    badgeBg: '#3730a3',
  },
  sin_filtro: {
    id: 'sin_filtro',
    name: 'Sin Filtro',
    primary: '#d97706',
    accent: '#fbbf24',
    border: '#f59e0b',
    bgDark: 'rgba(217, 119, 6, 0.18)',
    bgLight: 'rgba(254, 243, 199, 0.9)',
    textDark: '#fde68a',
    textLight: '#b45309',
    badgeBg: '#92400e',
  },
  roundtable: {
    id: 'roundtable',
    name: 'JNS Roundtable',
    primary: '#0284c7',
    accent: '#38bdf8',
    border: '#0ea5e9',
    bgDark: 'rgba(2, 132, 199, 0.18)',
    bgLight: 'rgba(224, 242, 254, 0.9)',
    textDark: '#bae6fd',
    textLight: '#0369a1',
    badgeBg: '#0369a1',
  },
  rental: {
    id: 'rental',
    name: 'Studio Rental',
    primary: '#7c3aed',
    accent: '#a78bfa',
    border: '#8b5cf6',
    bgDark: 'rgba(124, 58, 237, 0.20)',
    bgLight: 'rgba(237, 233, 254, 0.9)',
    textDark: '#ddd6fe',
    textLight: '#6d28d9',
    badgeBg: '#5b21b6',
  },
  pilot: {
    id: 'pilot',
    name: 'Pilot Show',
    primary: '#9333ea',
    accent: '#c084fc',
    border: '#a855f7',
    bgDark: 'rgba(147, 51, 234, 0.18)',
    bgLight: 'rgba(243, 232, 255, 0.9)',
    textDark: '#e9d5ff',
    textLight: '#7e22ce',
    badgeBg: '#6b21a8',
  },
  meeting: {
    id: 'meeting',
    name: 'Editorial Meeting',
    primary: '#475569',
    accent: '#94a3b8',
    border: '#64748b',
    bgDark: 'rgba(71, 85, 105, 0.28)',
    bgLight: 'rgba(241, 245, 249, 0.95)',
    textDark: '#e2e8f0',
    textLight: '#334155',
    badgeBg: '#334155',
  },
  default: {
    id: 'default',
    name: 'Production',
    primary: '#3b82f6',
    accent: '#60a5fa',
    border: '#60a5fa',
    bgDark: 'rgba(59, 130, 246, 0.16)',
    bgLight: 'rgba(239, 246, 255, 0.9)',
    textDark: '#dbeafe',
    textLight: '#1e40af',
    badgeBg: '#2563eb',
  },
};

export function getShowTheme(showIdOrTitle?: string, type?: string): ShowTheme {
  if (type === 'RENTAL') return SHOW_THEMES.rental;
  if (type === 'PILOT') return SHOW_THEMES.pilot;
  if (!showIdOrTitle) return SHOW_THEMES.default;

  const lower = showIdOrTitle.toLowerCase();
  if (lower.includes('quad')) return SHOW_THEMES.the_quad;
  if (lower.includes('axis')) return SHOW_THEMES.axis_of_truth;
  if (lower.includes('think twice')) return SHOW_THEMES.think_twice;
  if (lower.includes('meira')) return SHOW_THEMES.meira_k;
  if (lower.includes('straight up')) return SHOW_THEMES.straight_up;
  if (lower.includes('jerusalem minute') || lower.includes('minute')) return SHOW_THEMES.jerusalem_minute;
  if (lower.includes('judea') || lower.includes('judeacation')) return SHOW_THEMES.judeacation;
  if (lower.includes('basic law')) return SHOW_THEMES.basic_law;
  if (lower.includes('sin filtro') || lower.includes('spanish')) return SHOW_THEMES.sin_filtro;
  if (lower.includes('roundtable') || lower.includes('weekly')) return SHOW_THEMES.roundtable;
  if (lower.includes('rental') || lower.includes('bloomberg')) return SHOW_THEMES.rental;
  if (lower.includes('pilot')) return SHOW_THEMES.pilot;
  if (lower.includes('meeting') || lower.includes('sync')) return SHOW_THEMES.meeting;

  return SHOW_THEMES.default;
}

export interface CalendarDay {
  date: Date;
  dateString: string; // 'YYYY-MM-DD'
  dayName: string; // 'Sunday'
  shortDayName: string; // 'Sun'
  dayNumber: number; // 13
  monthName: string; // 'Sep'
  isToday: boolean;
  isPast: boolean;
}

export function getStartOfWeekSunday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getIsraeliWeekDays(baseDate: Date, fullWeek: boolean = false): CalendarDay[] {
  const sunday = getStartOfWeekSunday(baseDate);
  const daysCount = fullWeek ? 7 : 5; // Sun-Thu (5) or Sun-Sat (7)
  const todayStr = formatDateToYYYYMMDD(new Date());

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const days: CalendarDay[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateString = formatDateToYYYYMMDD(d);
    const dayOfWeek = d.getDay();

    days.push({
      date: d,
      dateString,
      dayName: dayNames[dayOfWeek],
      shortDayName: shortDayNames[dayOfWeek],
      dayNumber: d.getDate(),
      monthName: monthNames[d.getMonth()],
      isToday: dateString === todayStr,
      isPast: dateString < todayStr,
    });
  }

  return days;
}

// Generates time slot hours from 08:00 to 21:00
export const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export function parseMinutesFromMidnight(timeStr?: string): number {
  if (!timeStr) return 9 * 60; // default 09:00
  // Clean string like "10:30" or "10:00 - 12:00"
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9 * 60;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr;
}
