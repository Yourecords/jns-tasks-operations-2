'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Video,
  Users,
  Building2,
  Sparkles,
  MapPin,
  ExternalLink,
  Plus,
  LayoutGrid,
  CalendarDays,
  ListOrdered,
  Search,
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Radio,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production, Meeting, Show, User } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';
import { requiresStudio } from '@/lib/utils';
import {
  SHOW_THEMES,
  getShowTheme,
  getIsraeliWeekDays,
  formatDateToYYYYMMDD,
  TIME_SLOTS,
  parseMinutesFromMidnight,
  CalendarDay,
} from '@/lib/calendarUtils';

type ViewMode = 'board' | 'day' | 'month';

export default function ProductionCalendarPage() {
  const router = useRouter();
  const { currentUser, allUsers } = useUser();

  // State
  const [currentAnchorDate, setCurrentAnchorDate] = useState<Date>(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [dayViewMode, setDayViewMode] = useState<'grid' | 'cards'>('grid');
  const [fullWeek, setFullWeek] = useState<boolean>(false); // 5 days (Sun-Thu) default
  const [loading, setLoading] = useState<boolean>(true);

  // Data from API
  const [productions, setProductions] = useState<Production[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [editors, setEditors] = useState<User[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedShowFilter, setSelectedShowFilter] = useState<string>('ALL');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Modals
  const [quickActionOpen, setQuickActionOpen] = useState<boolean>(false);
  const [quickActionTab, setQuickActionTab] = useState<string>('EPISODE');
  const [selectedEvent, setSelectedEvent] = useState<{
    type: 'PRODUCTION' | 'MEETING';
    data: Production | Meeting;
  } | null>(null);

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/calendar');
      if (!res.ok) throw new Error('Failed to load calendar data');
      const data = await res.json();
      setProductions(data.productions || []);
      setMeetings(data.meetings || []);
      setShows(data.shows || []);
      setEditors(data.editors || []);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Compute Israeli week days
  const weekDays = useMemo(() => {
    return getIsraeliWeekDays(currentAnchorDate, fullWeek);
  }, [currentAnchorDate, fullWeek]);

  // Distinct Editors for the editing columns (fallback to Ryan, Olga, Ksenia if empty)
  const activeEditors = useMemo(() => {
    if (editors.length > 0) {
      // Prioritize Ryan, Olga, Ksenia in order, then others
      const priorityOrder = ['usr_ryan_editor', 'usr_olga_editor', 'usr_ksenia_editor'];
      return [...editors].sort((a, b) => {
        const idxA = priorityOrder.indexOf(a.id);
        const idxB = priorityOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    // Default fallback personas
    return [
      { id: 'usr_ryan_editor', name: 'Ryan', fullName: 'Ryan Lifchitz', role: 'TEAM_MEMBER', jobFunction: 'VIDEO_EDITOR' },
      { id: 'usr_olga_editor', name: 'Olga', fullName: 'Olga Editor', role: 'TEAM_MEMBER', jobFunction: 'VIDEO_EDITOR' },
      { id: 'usr_ksenia_editor', name: 'Ksenia', fullName: 'Ksenia Editor', role: 'TEAM_MEMBER', jobFunction: 'VIDEO_EDITOR' },
    ] as User[];
  }, [editors]);

  // Date Navigation handlers
  const handlePrevWeek = () => {
    const d = new Date(currentAnchorDate);
    d.setDate(d.getDate() - 7);
    setCurrentAnchorDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentAnchorDate);
    d.setDate(d.getDate() + 7);
    setCurrentAnchorDate(d);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentAnchorDate(today);
    setSelectedDayDate(today);
  };

  // Filtered productions
  const filteredProductions = useMemo(() => {
    return productions.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesEp = p.episodeNumber?.toLowerCase().includes(q);
        const matchesShow = shows.find((s) => s.id === p.showId)?.name.toLowerCase().includes(q);
        const matchesClient = p.rentalDetails?.clientName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesEp && !matchesShow && !matchesClient) return false;
      }
      // Show filter
      if (selectedShowFilter !== 'ALL' && p.showId !== selectedShowFilter) {
        return false;
      }
      // Type filter
      if (selectedTypeFilter !== 'ALL' && p.type !== selectedTypeFilter) {
        return false;
      }
      // Person filter
      if (selectedPersonFilter !== 'ALL') {
        const matchesProducer = p.producerId === selectedPersonFilter;
        const matchesEditor = p.editorId === selectedPersonFilter;
        if (!matchesProducer && !matchesEditor) return false;
      }
      return true;
    });
  }, [productions, searchQuery, selectedShowFilter, selectedTypeFilter, selectedPersonFilter, shows]);

  // Group events by day and slot
  // Helper to extract hour string like "10:00" from time string
  const getEventHour = (timeStr?: string): string => {
    if (!timeStr) return '10:00';
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return '10:00';
    const hour = parseInt(match[1], 10);
    return `${String(hour).padStart(2, '0')}:00`;
  };

  // Weekly date range title
  const weekRangeTitle = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    return `${first.dayName}, ${first.monthName} ${first.dayNumber} – ${last.dayName}, ${last.monthName} ${last.dayNumber}, ${first.date.getFullYear()}`;
  }, [weekDays]);

  // Find daily deliverables for the bottom yellow bar
  const getDeliverablesForDay = (dateString: string) => {
    return filteredProductions.filter((p) => {
      // If publicationDeadline matches date OR publishedAt matches date
      const pubDate = p.publicationDeadline?.split('T')[0] || p.publishedAt?.split('T')[0];
      return pubDate === dateString;
    });
  };

  // Find tasks an editor needs to work on during their shift on a given date (NO time dedicated)
  const getEditorShiftTasks = (editorId: string, dateString: string) => {
    return filteredProductions.filter((p) => {
      // Must be assigned to this editor (or default editor for The Quad)
      const isAssignedEditor =
        p.editorId === editorId ||
        (!p.editorId && editorId === 'usr_ryan_editor' && p.showId?.includes('quad'));
      if (!isAssignedEditor) return false;

      // Matches shift date:
      if (p.editingDate === dateString) return true;
      if (!p.editingDate && p.filmingDate === dateString) return true;
      if (p.tasks && p.tasks.some((t) => t.assignedUserId === editorId && t.dueDate === dateString)) return true;

      return false;
    });
  };

  // Find meetings for a day
  const getMeetingsForDay = (dateString: string) => {
    return meetings.filter((m) => m.date === dateString);
  };

  const getUserName = (id?: string) => {
    if (!id) return '';
    const u = allUsers.find((user) => user.id === id);
    return u ? u.name : id;
  };

  const handleOpenProduction = (id: string) => {
    router.push(`/productions/${id}`);
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Top Header & Operations Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(212, 160, 23, 0.15)',
                color: 'var(--jns-gold)',
              }}
            >
              <CalendarIcon size={18} />
            </span>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Production Calendar
            </h1>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                letterSpacing: '0.04em',
              }}
            >
              ISRAEL WORKWEEK (SUN–THU)
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Unified schedule for studio filming, remote field production, editing suites & daily broadcast releases.
          </p>
        </div>

        {/* Action Controls & New Production */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* View mode switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--card-bg, #1e293b)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #334155)',
            }}
          >
            <button
              onClick={() => setViewMode('board')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'board' ? 'var(--jns-gold)' : 'transparent',
                color: viewMode === 'board' ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              title="Production Board (Studio, Remote & Editor Columns)"
            >
              <LayoutGrid size={14} />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'day' ? 'var(--jns-gold)' : 'transparent',
                color: viewMode === 'day' ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              title="Day Timeline View"
            >
              <ListOrdered size={14} />
              <span>Day</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'month' ? 'var(--jns-gold)' : 'transparent',
                color: viewMode === 'month' ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              title="Month Overview"
            >
              <CalendarDays size={14} />
              <span>Month</span>
            </button>
          </div>

          {/* Israeli 5-Day vs 7-Day Toggle */}
          <button
            onClick={() => setFullWeek(!fullWeek)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', padding: '6px 10px', border: '1px solid var(--border-color, #334155)' }}
            title="Toggle between Israeli workweek (Sun-Thu) and full 7-day week"
          >
            {fullWeek ? '7 Days (Sun–Sat)' : '5 Days (Sun–Thu)'}
          </button>

          {/* Quick Add Button */}
          {(currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN') && (
            <button
              onClick={() => {
                setQuickActionTab('EPISODE');
                setQuickActionOpen(true);
              }}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontWeight: 700,
              }}
            >
              <Plus size={15} />
              <span>Schedule Production</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.15rem',
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #334155)',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handlePrevWeek}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 9px', borderRadius: '6px' }}
            title="Previous Week"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleToday}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700, padding: '6px 12px' }}
            title="Jump to Current Week"
          >
            Today
          </button>
          <button
            onClick={handleNextWeek}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 9px', borderRadius: '6px' }}
            title="Next Week"
          >
            <ChevronRight size={16} />
          </button>

          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
            }}
          >
            {weekRangeTitle}
          </span>
        </div>

        {/* Date Jump Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Jump to:</span>
          <input
            type="date"
            value={formatDateToYYYYMMDD(currentAnchorDate)}
            onChange={(e) => {
              if (e.target.value) {
                const parts = e.target.value.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                setCurrentAnchorDate(d);
                setSelectedDayDate(d);
              }
            }}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              background: 'var(--bg-main, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              color: 'var(--text-main)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          />
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Print Schedule"
          >
            <Printer size={14} />
            <span style={{ fontSize: '11px' }}>Print</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #334155)',
          marginBottom: '1.25rem',
        }}
      >
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-main, #0f172a)',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #334155)',
            flex: '1 1 200px',
          }}
        >
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search shoot, episode, client, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '12px',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Show Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Show:</span>
          <select
            value={selectedShowFilter}
            onChange={(e) => setSelectedShowFilter(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              background: 'var(--bg-main, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Shows</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Person / Team Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Team:</span>
          <select
            value={selectedPersonFilter}
            onChange={(e) => setSelectedPersonFilter(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              background: 'var(--bg-main, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Team Members</option>
            {allUsers
              .filter((u) => u.isActive !== false)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.jobFunction || u.role})
                </option>
              ))}
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Type:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              background: 'var(--bg-main, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <option value="ALL">All Formats</option>
            <option value="EPISODE">Studio Shows</option>
            <option value="PILOT">Pilots</option>
            <option value="RENTAL">Studio Rentals</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedShowFilter !== 'ALL' || selectedPersonFilter !== 'ALL' || selectedTypeFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedShowFilter('ALL');
              setSelectedPersonFilter('ALL');
              setSelectedTypeFilter('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* VIEW MODE 1: PRODUCTION BOARD (The Upgraded Google Sheet Grid) */}
      {viewMode === 'board' && (
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #334155)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Scrollable board container with sticky time axis */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: fullWeek ? '1600px' : '1250px',
                tableLayout: 'fixed',
              }}
            >
              {/* TOP HEADER: Days of the week */}
              <thead>
                <tr>
                  <th
                    style={{
                      width: '80px',
                      padding: '10px 6px',
                      background: 'var(--bg-main, #0f172a)',
                      borderRight: '2px solid var(--border-color, #334155)',
                      borderBottom: '2px solid var(--border-color, #334155)',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                    }}
                  >
                    TIME
                  </th>

                  {weekDays.map((day) => {
                    // Total sub-columns per day = 2 (Filming: Studio, Remote) + number of active editors (e.g. 3: Ryan, Olga, Ksenia) = 5
                    const colSpan = 2 + activeEditors.length;

                    return (
                      <th
                        key={day.dateString}
                        colSpan={colSpan}
                        onClick={() => {
                          setSelectedDayDate(day.date);
                          setViewMode('day');
                        }}
                        style={{
                          padding: '10px 8px',
                          background: day.isToday
                            ? 'linear-gradient(180deg, rgba(212, 160, 23, 0.22) 0%, rgba(30, 41, 59, 0.95) 100%)'
                            : 'var(--bg-main, #0f172a)',
                          borderRight: '2px solid var(--border-color, #334155)',
                          borderBottom: '1px solid var(--border-color, #334155)',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Click to open full ${day.dayName} Production Calendar`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: day.isToday ? 'var(--jns-gold)' : 'var(--text-main)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {day.dayName}
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: day.isToday ? 'var(--jns-gold)' : 'var(--text-secondary)',
                            }}
                          >
                            {day.monthName} {day.dayNumber}
                          </span>
                          {day.isToday && (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: 'var(--jns-gold)',
                                color: '#000',
                                letterSpacing: '0.03em',
                              }}
                            >
                              TODAY
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(212, 160, 23, 0.18)',
                              color: 'var(--jns-gold)',
                              border: '1px solid rgba(212, 160, 23, 0.35)',
                              marginLeft: '3px',
                            }}
                          >
                            Day View ↗
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* SUB-HEADER: FILMING (Studio, Remote) & EDITING (Ryan, Olga, Ksenia) */}
                <tr style={{ background: 'rgba(15, 23, 42, 0.75)' }}>
                  <th
                    style={{
                      padding: '6px',
                      borderRight: '2px solid var(--border-color, #334155)',
                      borderBottom: '2px solid var(--border-color, #334155)',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: 'var(--bg-main, #0f172a)',
                    }}
                  >
                    IDT (GMT+3)
                  </th>

                  {weekDays.map((day) => (
                    <React.Fragment key={`sub-${day.dateString}`}>
                      {/* FILMING: Studio */}
                      <th
                        style={{
                          padding: '6px 4px',
                          borderRight: '1px solid var(--border-color, #334155)',
                          borderBottom: '2px solid var(--border-color, #334155)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#60a5fa',
                          background: 'rgba(37, 99, 235, 0.08)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          <Video size={11} />
                          <span>Studio</span>
                        </div>
                      </th>

                      {/* FILMING: Remote / Field */}
                      <th
                        style={{
                          padding: '6px 4px',
                          borderRight: '1px solid var(--border-color, #334155)',
                          borderBottom: '2px solid var(--border-color, #334155)',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#34d399',
                          background: 'rgba(16, 185, 129, 0.08)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          <MapPin size={11} />
                          <span>Remote</span>
                        </div>
                      </th>

                      {/* EDITING COLUMNS FOR EACH ACTIVE EDITOR */}
                      {activeEditors.map((ed, idx) => (
                        <th
                          key={`${day.dateString}-${ed.id}`}
                          style={{
                            padding: '6px 4px',
                            borderRight:
                              idx === activeEditors.length - 1
                                ? '2px solid var(--border-color, #334155)'
                                : '1px solid var(--border-color, #334155)',
                            borderBottom: '2px solid var(--border-color, #334155)',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#e879f9',
                            background: 'rgba(192, 38, 211, 0.08)',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <Scissors size={10} />
                            <span>{ed.name}</span>
                          </div>
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              {/* BODY: Hourly Time Slots */}
              <tbody>
                {TIME_SLOTS.map((slotHour, slotIndex) => {
                  const slotHourInt = parseInt(slotHour.split(':')[0], 10);

                  return (
                    <tr
                      key={slotHour}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                        height: '62px',
                      }}
                    >
                      {/* Left Sticky Time Label */}
                      <td
                        style={{
                          padding: '6px',
                          background: 'var(--bg-main, #0f172a)',
                          borderRight: '2px solid var(--border-color, #334155)',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 9,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          <span>{slotHour}</span>
                        </div>
                      </td>

                      {/* Day Columns */}
                      {weekDays.map((day) => {
                        // Check if a meeting happens at this hour
                        const dayMeetings = getMeetingsForDay(day.dateString);
                        const meetingAtThisHour = dayMeetings.find((m) => {
                          const h = m.time ? getEventHour(m.time) : '10:00';
                          return h === slotHour;
                        });

                        // Filming: Studio shoots on this day and hour (IN_STUDIO or STUDIO_REMOTE_GUEST)
                        const studioShoots = filteredProductions.filter((p) => {
                          if (p.filmingDate !== day.dateString) return false;
                          if (!requiresStudio(p.location)) return false;
                          const h = getEventHour(p.filmingTime);
                          return h === slotHour;
                        });

                        // Filming: Remote shoots on this day and hour (FULLY_REMOTE or REMOTE)
                        const remoteShoots = filteredProductions.filter((p) => {
                          if (p.filmingDate !== day.dateString) return false;
                          if (requiresStudio(p.location)) return false;
                          const h = getEventHour(p.filmingTime);
                          return h === slotHour;
                        });

                        return (
                          <React.Fragment key={`${day.dateString}-${slotHour}`}>
                            {/* If there's an editorial meeting spanning the filming slots */}
                            {meetingAtThisHour ? (
                              <td
                                colSpan={2}
                                style={{
                                  padding: '3px',
                                  borderRight: '1px solid var(--border-color, #334155)',
                                  verticalAlign: 'top',
                                  background: 'rgba(71, 85, 105, 0.15)',
                                }}
                              >
                                <div
                                  onClick={() => setSelectedEvent({ type: 'MEETING', data: meetingAtThisHour })}
                                  style={{
                                    height: '100%',
                                    minHeight: '52px',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    background: 'rgba(71, 85, 105, 0.45)',
                                    border: '1px solid #64748b',
                                    color: '#e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                  }}
                                  title="Editorial Meeting — Click to view summary"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: '#334155',
                                        color: '#cbd5e1',
                                      }}
                                    >
                                      {meetingAtThisHour.time || '10:00 - 11:30'}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Sync</span>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      marginTop: '2px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {meetingAtThisHour.title}
                                  </div>
                                </div>
                              </td>
                            ) : (
                              <>
                                {/* FILMING: STUDIO CELL */}
                                <td
                                  style={{
                                    padding: '3px',
                                    borderRight: '1px solid var(--border-color, #334155)',
                                    verticalAlign: 'top',
                                    background: day.isToday ? 'rgba(212, 160, 23, 0.02)' : 'transparent',
                                    position: 'relative',
                                  }}
                                >
                                  {studioShoots.map((p) => {
                                    const theme = getShowTheme(p.title, p.type);
                                    return (
                                      <div
                                        key={p.id}
                                        onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '5px 7px',
                                          marginBottom: '3px',
                                          background: theme.bgDark,
                                          border: `1px solid ${theme.border}`,
                                          cursor: 'pointer',
                                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        }}
                                        title={`${p.title}\nTime: ${p.filmingTime || '10:00'}\nSetup: ${
                                          p.location === 'STUDIO_REMOTE_GUEST'
                                            ? 'Studio + Remote Interviewee'
                                            : 'In Studio'
                                        }\nProducer: ${getUserName(p.producerId)}`}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px', flexWrap: 'wrap' }}>
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              fontWeight: 800,
                                              padding: '1px 4px',
                                              borderRadius: '3px',
                                              background: theme.badgeBg,
                                              color: '#fff',
                                            }}
                                          >
                                            {p.filmingTime || slotHour}
                                          </span>
                                          {p.type === 'RENTAL' ? (
                                            <span style={{ fontSize: '9px', color: '#c084fc', fontWeight: 700 }}>
                                              RENTAL
                                            </span>
                                          ) : p.location === 'STUDIO_REMOTE_GUEST' ? (
                                            <span
                                              style={{
                                                fontSize: '8.5px',
                                                color: '#38bdf8',
                                                background: 'rgba(14, 165, 233, 0.2)',
                                                padding: '1px 4px',
                                                borderRadius: '3px',
                                                fontWeight: 700,
                                                border: '1px solid rgba(14, 165, 233, 0.4)',
                                              }}
                                              title="Studio + Remote Interviewee"
                                            >
                                              + Remote Guest
                                            </span>
                                          ) : null}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: theme.textDark,
                                            marginTop: '3px',
                                            lineHeight: 1.2,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                          }}
                                        >
                                          {p.title}
                                        </div>
                                        {p.producerId && (
                                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                            Prod: {getUserName(p.producerId)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </td>

                                {/* FILMING: REMOTE / FIELD CELL */}
                                <td
                                  style={{
                                    padding: '3px',
                                    borderRight: '1px solid var(--border-color, #334155)',
                                    verticalAlign: 'top',
                                    background: day.isToday ? 'rgba(212, 160, 23, 0.02)' : 'transparent',
                                  }}
                                >
                                  {remoteShoots.map((p) => {
                                    const theme = getShowTheme(p.title, p.type);
                                    return (
                                      <div
                                        key={p.id}
                                        onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '5px 7px',
                                          marginBottom: '3px',
                                          background: 'rgba(16, 185, 129, 0.18)',
                                          border: '1px solid #10b981',
                                          cursor: 'pointer',
                                          transition: 'transform 0.15s ease',
                                        }}
                                        title={`Remote Shoot: ${p.title}\nTime: ${p.filmingTime || '10:00'}\nProducer: ${getUserName(p.producerId)}`}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span
                                            style={{
                                              fontSize: '9px',
                                              fontWeight: 800,
                                              padding: '1px 4px',
                                              borderRadius: '3px',
                                              background: '#059669',
                                              color: '#fff',
                                            }}
                                          >
                                            {p.filmingTime || slotHour}
                                          </span>
                                          <span style={{ fontSize: '9px', color: '#6ee7b7', fontWeight: 700 }}>
                                            FIELD
                                          </span>
                                        </div>
                                        <div
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#a7f3d0',
                                            marginTop: '3px',
                                            lineHeight: 1.2,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                          }}
                                        >
                                          {p.title}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </td>
                              </>
                            )}

                            {/* EDITING SUB-COLUMNS FOR EACH EDITOR: Shift Task Queue (NO time dedicated) */}
                            {slotIndex === 0 &&
                              activeEditors.map((ed, idx) => {
                                const shiftTasks = getEditorShiftTasks(ed.id, day.dateString);

                                return (
                                  <td
                                    key={`${day.dateString}-${ed.id}-shift`}
                                    rowSpan={TIME_SLOTS.length}
                                    style={{
                                      padding: '6px 5px',
                                      borderRight:
                                        idx === activeEditors.length - 1
                                          ? '2px solid var(--border-color, #334155)'
                                          : '1px solid var(--border-color, #334155)',
                                      verticalAlign: 'top',
                                      background: day.isToday ? 'rgba(212, 160, 23, 0.02)' : 'rgba(15, 23, 42, 0.22)',
                                      width: '180px',
                                      minWidth: '150px',
                                    }}
                                  >
                                    {/* Shift Queue Header */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '4px 6px',
                                        borderRadius: '5px',
                                        background: 'rgba(192, 38, 211, 0.1)',
                                        border: '1px solid rgba(192, 38, 211, 0.25)',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e879f9' }} />
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#e879f9', letterSpacing: '0.03em' }}>
                                          SHIFT QUEUE
                                        </span>
                                      </div>
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          fontWeight: 800,
                                          background: 'rgba(192, 38, 211, 0.25)',
                                          color: '#f5d0fe',
                                          padding: '1px 5px',
                                          borderRadius: '10px',
                                        }}
                                      >
                                        {shiftTasks.length} {shiftTasks.length === 1 ? 'task' : 'tasks'}
                                      </span>
                                    </div>

                                    {/* Task list without any time durations */}
                                    {shiftTasks.length === 0 ? (
                                      <div
                                        style={{
                                          padding: '14px 6px',
                                          textAlign: 'center',
                                          borderRadius: '6px',
                                          border: '1px dashed rgba(51, 65, 85, 0.6)',
                                          color: 'var(--text-secondary)',
                                          fontSize: '10px',
                                          background: 'rgba(15, 23, 42, 0.2)',
                                        }}
                                      >
                                        No tasks on shift
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {shiftTasks.map((p, pIdx) => {
                                          const theme = getShowTheme(p.title, p.type);
                                          const specificTask =
                                            p.tasks?.find((t) => t.assignedUserId === ed.id && t.status !== 'COMPLETED') ||
                                            p.tasks?.find((t) => t.stageName.includes('EDIT') || t.stageName.includes('ROUGH') || t.stageName.includes('DRAFT'));

                                          return (
                                            <div
                                              key={`shift-task-${p.id}`}
                                              onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                              style={{
                                                borderRadius: '7px',
                                                padding: '8px 8px',
                                                background: theme.bgDark,
                                                border: `1px solid ${theme.border}`,
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                                              }}
                                              title={`Shift Task #${pIdx + 1}: ${p.title}\nStage: ${p.currentStage}\nPriority: ${p.priority}\nClick to view production`}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '3px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <span
                                                    style={{
                                                      fontSize: '9px',
                                                      fontWeight: 800,
                                                      padding: '1px 5px',
                                                      borderRadius: '3px',
                                                      background: '#e879f9',
                                                      color: '#000',
                                                    }}
                                                  >
                                                    #{pIdx + 1}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: '9px',
                                                      fontWeight: 800,
                                                      padding: '1px 4px',
                                                      borderRadius: '3px',
                                                      background: theme.badgeBg,
                                                      color: '#fff',
                                                    }}
                                                  >
                                                    {p.type}
                                                  </span>
                                                </div>
                                                {p.priority === 'HIGH' || p.priority === 'URGENT' ? (
                                                  <span
                                                    style={{
                                                      fontSize: '8.5px',
                                                      fontWeight: 800,
                                                      padding: '1px 4px',
                                                      borderRadius: '3px',
                                                      background: 'rgba(239, 68, 68, 0.2)',
                                                      color: '#f87171',
                                                      border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    }}
                                                  >
                                                    {p.priority}
                                                  </span>
                                                ) : null}
                                              </div>

                                              <div
                                                style={{
                                                  fontSize: '11px',
                                                  fontWeight: 700,
                                                  color: theme.textDark,
                                                  lineHeight: 1.25,
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  display: '-webkit-box',
                                                  WebkitLineClamp: 2,
                                                  WebkitBoxOrient: 'vertical',
                                                }}
                                              >
                                                {p.title}
                                              </div>

                                              {specificTask && specificTask.title && (
                                                <div
                                                  style={{
                                                    fontSize: '10px',
                                                    color: 'var(--text-secondary)',
                                                    marginTop: '3px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                  }}
                                                >
                                                  {specificTask.title}
                                                </div>
                                              )}

                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  marginTop: '6px',
                                                  paddingTop: '4px',
                                                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: '9px',
                                                    fontWeight: 700,
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    color: 'var(--text-secondary)',
                                                  }}
                                                >
                                                  {p.currentStage}
                                                </span>
                                                <span style={{ fontSize: '9px', color: '#e879f9', fontWeight: 700 }}>
                                                  Shift
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* BOTTOM ROW: DAILY PUBLICATIONS & DELIVERABLES (The Sheet's Yellow Row) */}
              <tfoot>
                <tr
                  style={{
                    background: 'linear-gradient(180deg, rgba(212, 160, 23, 0.22) 0%, rgba(212, 160, 23, 0.14) 100%)',
                    borderTop: '3px solid var(--jns-gold)',
                  }}
                >
                  <td
                    style={{
                      padding: '10px 6px',
                      background: 'var(--bg-main, #0f172a)',
                      borderRight: '2px solid var(--border-color, #334155)',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <Sparkles size={16} color="var(--jns-gold)" />
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: 'var(--jns-gold)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          lineHeight: 1.1,
                        }}
                      >
                        DAILY RELEASES
                      </span>
                    </div>
                  </td>

                  {weekDays.map((day) => {
                    const colSpan = 2 + activeEditors.length;
                    const deliverables = getDeliverablesForDay(day.dateString);

                    return (
                      <td
                        key={`deliv-${day.dateString}`}
                        colSpan={colSpan}
                        style={{
                          padding: '8px 10px',
                          borderRight: '2px solid var(--border-color, #334155)',
                          verticalAlign: 'top',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {deliverables.length === 0 ? (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'rgba(212, 160, 23, 0.7)',
                                fontStyle: 'italic',
                                padding: '4px 0',
                              }}
                            >
                              No scheduled releases
                            </div>
                          ) : (
                            deliverables.map((item) => {
                              const isPublished = item.status === 'COMPLETED' || item.currentStage === 'PUBLISHED';

                              return (
                                <div
                                  key={`deliv-item-${item.id}`}
                                  onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: item })}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(212, 160, 23, 0.45)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease',
                                  }}
                                  title={`Scheduled Release: ${item.title}\nStatus: ${item.currentStage}`}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    <span
                                      style={{
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: isPublished ? '#22c55e' : 'var(--jns-gold)',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#fef08a',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {item.title}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: isPublished ? 'rgba(34, 197, 94, 0.2)' : 'rgba(212, 160, 23, 0.25)',
                                        color: isPublished ? '#86efac' : 'var(--jns-gold)',
                                        border: `1px solid ${isPublished ? '#16a34a' : 'rgba(212, 160, 23, 0.5)'}`,
                                      }}
                                    >
                                      {isPublished ? 'PUBLISHED' : 'SCHEDULED'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULL-WINDOW SINGLE-DAY PRODUCTION CALENDAR */}
      {viewMode === 'day' && (() => {
        const dayStr = formatDateToYYYYMMDD(selectedDayDate);
        const dayProds = filteredProductions.filter((p) => p.filmingDate === dayStr || p.editingDate === dayStr);
        const dayMtgs = getMeetingsForDay(dayStr);
        const dayDeliverables = getDeliverablesForDay(dayStr);
        const dayStudioShoots = filteredProductions.filter((p) => p.filmingDate === dayStr && requiresStudio(p.location));
        const dayRemoteShoots = filteredProductions.filter((p) => p.filmingDate === dayStr && !requiresStudio(p.location));
        const isSelectedDayToday = dayStr === formatDateToYYYYMMDD(new Date());

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Day Header & Quick Navigation Bar */}
            <div
              style={{
                background: 'var(--card-bg, #1e293b)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #334155)',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('board')}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Week Board</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(selectedDayDate);
                        prev.setDate(prev.getDate() - 1);
                        setSelectedDayDate(prev);
                      }}
                      className="btn btn-secondary btn-xs"
                      title="Previous Day"
                      style={{ padding: '4px 8px' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDayDate(new Date())}
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px' }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(selectedDayDate);
                        next.setDate(next.getDate() + 1);
                        setSelectedDayDate(next);
                      }}
                      className="btn btn-secondary btn-xs"
                      title="Next Day"
                      style={{ padding: '4px 8px' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                    <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                      {selectedDayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h2>
                    {isSelectedDayToday && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background: 'var(--jns-gold)',
                          color: '#000',
                          letterSpacing: '0.04em',
                        }}
                      >
                        TODAY
                      </span>
                    )}
                  </div>
                </div>

                {/* Submode Switcher & Quick Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '3px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #334155)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setDayViewMode('grid')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: dayViewMode === 'grid' ? 'var(--jns-gold)' : 'transparent',
                        color: dayViewMode === 'grid' ? '#000' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <LayoutGrid size={13} />
                      <span>Full Schedule Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayViewMode('cards')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: dayViewMode === 'cards' ? 'var(--jns-gold)' : 'transparent',
                        color: dayViewMode === 'cards' ? '#000' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ListOrdered size={13} />
                      <span>Operations Cards</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekday Switcher Strip (Similar to Google Calendar day switching) */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>
                  Weekdays:
                </span>
                {weekDays.map((d) => {
                  const isSelected = formatDateToYYYYMMDD(selectedDayDate) === d.dateString;
                  const count = filteredProductions.filter((p) => p.filmingDate === d.dateString || p.editingDate === d.dateString).length;

                  return (
                    <button
                      key={d.dateString}
                      onClick={() => setSelectedDayDate(d.date)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--jns-gold)' : '1px solid var(--border-color, #334155)',
                        background: isSelected ? 'rgba(212, 160, 23, 0.2)' : 'rgba(15, 23, 42, 0.4)',
                        color: isSelected ? 'var(--jns-gold)' : 'var(--text-main)',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{d.dayName}</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{d.monthName} {d.dayNumber}</span>
                      {d.isToday && (
                        <span style={{ fontSize: '8.5px', background: 'var(--jns-gold)', color: '#000', padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>
                          TODAY
                        </span>
                      )}
                      {count > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            background: isSelected ? 'var(--jns-gold)' : 'rgba(255, 255, 255, 0.12)',
                            color: isSelected ? '#000' : 'var(--text-secondary)',
                            padding: '1px 5px',
                            borderRadius: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Day Summary Badges */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    🎬 Studio Shoots: {dayStudioShoots.length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    🌐 Remote Shoots: {dayRemoteShoots.length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#e879f9', background: 'rgba(232, 121, 249, 0.12)', border: '1px solid rgba(232, 121, 249, 0.25)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    ✂️ Editors on Shift: {activeEditors.length}
                  </span>
                  {dayDeliverables.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#fde047', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.35)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      📢 Releases: {dayDeliverables.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SUBMODE A: FULL-WINDOW SINGLE-DAY SCHEDULE GRID */}
            {dayViewMode === 'grid' && (
              <div
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #334155)',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    minWidth: '1100px',
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          width: '85px',
                          padding: '12px 8px',
                          background: 'var(--bg-main, #0f172a)',
                          borderRight: '2px solid var(--border-color, #334155)',
                          borderBottom: '2px solid var(--border-color, #334155)',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--text-secondary)',
                          textAlign: 'center',
                          letterSpacing: '0.04em',
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        TIME
                      </th>

                      {/* PHYSICAL STUDIO COLUMN */}
                      <th
                        style={{
                          width: '320px',
                          padding: '12px 10px',
                          background: 'rgba(30, 41, 59, 0.95)',
                          borderRight: '1px solid var(--border-color, #334155)',
                          borderBottom: '2px solid var(--border-color, #334155)',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Video size={14} color="#60a5fa" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.04em' }}>
                            PHYSICAL STUDIO (Jerusalem Studio A)
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          In-Studio & Hybrid Guests (Exclusive physical facility access)
                        </div>
                      </th>

                      {/* REMOTE FILMING COLUMN */}
                      <th
                        style={{
                          width: '260px',
                          padding: '12px 10px',
                          background: 'rgba(30, 41, 59, 0.85)',
                          borderRight: '2px solid var(--border-color, #334155)',
                          borderBottom: '2px solid var(--border-color, #334155)',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Radio size={14} color="#34d399" />
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#86efac', letterSpacing: '0.04em' }}>
                            REMOTE & FIELD RECORDINGS
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Zoom, StreamYard & Field Crews (Concurrent shoots permitted)
                        </div>
                      </th>

                      {/* VIDEO EDITORS COLUMNS */}
                      {activeEditors.map((ed, idx) => (
                        <th
                          key={`day-header-ed-${ed.id}`}
                          style={{
                            width: '230px',
                            padding: '12px 8px',
                            background: 'rgba(30, 41, 59, 0.75)',
                            borderRight:
                              idx === activeEditors.length - 1
                                ? 'none'
                                : '1px solid var(--border-color, #334155)',
                            borderBottom: '2px solid var(--border-color, #334155)',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Scissors size={13} color="#e879f9" />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f0abfc' }}>
                              {ed.fullName || ed.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px', fontWeight: 600 }}>
                            SHIFT QUEUE (Tasks to work on)
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {TIME_SLOTS.map((slotHour, slotIndex) => {
                      // Check meeting
                      const meetingAtHour = dayMtgs.find((m) => {
                        const h = m.time ? getEventHour(m.time) : '10:00';
                        return h === slotHour;
                      });

                      // Studio shoots at this hour
                      const studioShootsAtHour = dayStudioShoots.filter((p) => {
                        const h = getEventHour(p.filmingTime);
                        return h === slotHour;
                      });

                      // Remote shoots at this hour
                      const remoteShootsAtHour = dayRemoteShoots.filter((p) => {
                        const h = getEventHour(p.filmingTime);
                        return h === slotHour;
                      });

                      const hasStudioConflict = studioShootsAtHour.length > 1;

                      return (
                        <tr
                          key={`single-day-slot-${slotHour}`}
                          style={{
                            borderBottom: '1px solid var(--border-color, #334155)',
                            height: '62px',
                          }}
                        >
                          {/* Time Column */}
                          <td
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              background: 'var(--bg-main, #0f172a)',
                              borderRight: '2px solid var(--border-color, #334155)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              position: 'sticky',
                              left: 0,
                              zIndex: 9,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <Clock size={11} />
                              <span>{slotHour}</span>
                            </div>
                          </td>

                          {/* Studio Filming Cell */}
                          {meetingAtHour ? (
                            <td
                              colSpan={2}
                              style={{
                                padding: '4px 8px',
                                borderRight: '2px solid var(--border-color, #334155)',
                                verticalAlign: 'middle',
                                background: 'rgba(71, 85, 105, 0.2)',
                              }}
                            >
                              <div
                                onClick={() => setSelectedEvent({ type: 'MEETING', data: meetingAtHour })}
                                style={{
                                  borderRadius: '6px',
                                  padding: '7px 10px',
                                  background: 'rgba(71, 85, 105, 0.45)',
                                  border: '1px solid #64748b',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#334155', color: '#cbd5e1', marginRight: '6px' }}>
                                    {meetingAtHour.time || '10:00 - 11:30'}
                                  </span>
                                  <strong style={{ fontSize: '12px', color: '#f8fafc' }}>{meetingAtHour.title}</strong>
                                </div>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Studio Operations Sync</span>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td
                                style={{
                                  padding: '4px 6px',
                                  borderRight: '1px solid var(--border-color, #334155)',
                                  verticalAlign: 'top',
                                  background: hasStudioConflict ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                                }}
                              >
                                {hasStudioConflict && (
                                  <div
                                    style={{
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.25)',
                                      border: '1px solid #ef4444',
                                      color: '#fca5a5',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      marginBottom: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <AlertCircle size={12} color="#ef4444" />
                                    <span>STUDIO DOUBLE-BOOKING CONFLICT!</span>
                                  </div>
                                )}

                                {studioShootsAtHour.length === 0 ? (
                                  <div style={{ height: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', color: 'rgba(148, 163, 184, 0.3)', fontSize: '11px', fontStyle: 'italic', paddingLeft: '6px' }}>
                                    Available
                                  </div>
                                ) : (
                                  studioShootsAtHour.map((p) => {
                                    const theme = getShowTheme(p.title, p.type);
                                    return (
                                      <div
                                        key={`single-studio-${p.id}`}
                                        onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '6px 8px',
                                          marginBottom: '4px',
                                          background: theme.bgDark,
                                          border: `1px solid ${hasStudioConflict ? '#ef4444' : theme.border}`,
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: theme.badgeBg, color: '#fff' }}>
                                            {p.filmingTime || slotHour}
                                          </span>
                                          {p.location === 'STUDIO_REMOTE_GUEST' && (
                                            <span style={{ fontSize: '8.5px', color: '#38bdf8', background: 'rgba(14, 165, 233, 0.2)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, border: '1px solid rgba(14, 165, 233, 0.4)' }}>
                                              + Remote Guest
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textDark, marginTop: '2px' }}>
                                          {p.title}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                          <span>Prod: {getUserName(p.producerId)}</span>
                                          {p.editorId && (
                                            <span style={{ color: '#c084fc' }}>Ed: {getUserName(p.editorId)}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </td>

                              {/* Remote Filming Cell */}
                              <td
                                style={{
                                  padding: '4px 6px',
                                  borderRight: '2px solid var(--border-color, #334155)',
                                  verticalAlign: 'top',
                                }}
                              >
                                {remoteShootsAtHour.length === 0 ? (
                                  <div style={{ height: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', color: 'rgba(148, 163, 184, 0.25)', fontSize: '11px', fontStyle: 'italic', paddingLeft: '6px' }}>
                                    No remote shoot
                                  </div>
                                ) : (
                                  remoteShootsAtHour.map((p) => {
                                    const theme = getShowTheme(p.title, p.type);
                                    return (
                                      <div
                                        key={`single-remote-${p.id}`}
                                        onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '5px 8px',
                                          marginBottom: '4px',
                                          background: theme.bgDark,
                                          border: `1px solid ${theme.border}`,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: '#059669', color: '#fff' }}>
                                            {p.filmingTime || slotHour} (REMOTE)
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textDark, marginTop: '2px' }}>
                                          {p.title}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </td>
                            </>
                          )}

                          {/* Video Editors Shift Workload Queue (One full-height column per editor, NO time dedicated) */}
                          {slotIndex === 0 &&
                            activeEditors.map((ed, idx) => {
                              const shiftTasks = getEditorShiftTasks(ed.id, dayStr);

                              return (
                                <td
                                  key={`single-day-ed-${ed.id}`}
                                  rowSpan={TIME_SLOTS.length}
                                  style={{
                                    padding: '8px 6px',
                                    borderRight:
                                      idx === activeEditors.length - 1
                                        ? 'none'
                                        : '1px solid var(--border-color, #334155)',
                                    verticalAlign: 'top',
                                    background: 'rgba(15, 23, 42, 0.25)',
                                    width: '230px',
                                  }}
                                >
                                  {/* Shift Queue Header */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(192, 38, 211, 0.12)',
                                      border: '1px solid rgba(192, 38, 211, 0.3)',
                                      marginBottom: '8px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e879f9' }} />
                                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#e879f9', letterSpacing: '0.04em' }}>
                                        SHIFT QUEUE
                                      </span>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        background: 'rgba(192, 38, 211, 0.25)',
                                        color: '#f5d0fe',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                      }}
                                    >
                                      {shiftTasks.length} {shiftTasks.length === 1 ? 'task' : 'tasks'}
                                    </span>
                                  </div>

                                  {/* Task list without any dedicated hour slots */}
                                  {shiftTasks.length === 0 ? (
                                    <div
                                      style={{
                                        padding: '24px 8px',
                                        textAlign: 'center',
                                        borderRadius: '6px',
                                        border: '1px dashed rgba(51, 65, 85, 0.6)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '11px',
                                        background: 'rgba(15, 23, 42, 0.2)',
                                      }}
                                    >
                                      No editing tasks on shift for {ed.name}
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {shiftTasks.map((p, pIdx) => {
                                        const theme = getShowTheme(p.title, p.type);
                                        return (
                                          <div
                                            key={`day-task-${p.id}`}
                                            onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                            style={{
                                              borderRadius: '8px',
                                              padding: '8px 10px',
                                              background: theme.bgDark,
                                              border: `1px solid ${theme.border}`,
                                              cursor: 'pointer',
                                              transition: 'all 0.15s ease',
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '4px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span
                                                  style={{
                                                    fontSize: '9.5px',
                                                    fontWeight: 800,
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: '#e879f9',
                                                    color: '#000',
                                                  }}
                                                >
                                                  #{pIdx + 1}
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: theme.badgeBg,
                                                    color: '#fff',
                                                  }}
                                                >
                                                  {p.type}
                                                </span>
                                              </div>
                                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                {p.currentStage}
                                              </span>
                                            </div>

                                            <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textDark, lineHeight: 1.25 }}>
                                              {p.title}
                                            </div>

                                            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span
                                                className={`priority-pill priority-${p.priority.toLowerCase()}`}
                                                style={{ fontSize: '9px', padding: '1px 5px' }}
                                              >
                                                {p.priority}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenProduction(p.id);
                                                }}
                                                className="btn btn-secondary btn-xs"
                                                style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
                                              >
                                                <span>Tasks</span>
                                                <ExternalLink size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* BOTTOM ROW: DELIVERABLES & RELEASES FOR THIS DAY */}
                  <tfoot>
                    <tr>
                      <td
                        style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                          background: 'linear-gradient(180deg, #ca8a04 0%, #a16207 100%)',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 900,
                          letterSpacing: '0.04em',
                          borderRight: '2px solid rgba(0, 0, 0, 0.2)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                        }}
                      >
                        DELIVERABLES
                      </td>
                      <td
                        colSpan={2 + activeEditors.length}
                        style={{
                          padding: '8px 12px',
                          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.18) 0%, rgba(30, 41, 59, 0.95) 100%)',
                          borderTop: '2px solid #ca8a04',
                        }}
                      >
                        {dayDeliverables.length === 0 ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            No broadcast releases or YouTube publications scheduled for {selectedDayDate.toLocaleDateString('en-US', { weekday: 'long' })}.
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fde047' }}>
                              📢 Scheduled Publications ({dayDeliverables.length}):
                            </span>
                            {dayDeliverables.map((item) => {
                              const theme = getShowTheme(item.title, item.type);
                              const isPublished = item.status === 'COMPLETED' || item.currentStage === 'PUBLISHED';
                              return (
                                <div
                                  key={`single-deliverable-${item.id}`}
                                  onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: item })}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: `1px solid ${isPublished ? '#22c55e' : '#eab308'}`,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                                    {item.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      background: isPublished ? '#22c55e' : '#eab308',
                                      color: '#000',
                                    }}
                                  >
                                    {isPublished ? 'PUBLISHED' : 'SCHEDULED'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* SUBMODE B: DETAILED OPERATIONS CARDS & LISTS */}
            {dayViewMode === 'cards' && (
              <div
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #334155)',
                  padding: '1.25rem',
                }}
              >
                {dayProds.length === 0 && dayMtgs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <CalendarIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>No filming or editing sessions scheduled for this date.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {/* Meetings */}
                      {dayMtgs.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedEvent({ type: 'MEETING', data: m })}
                          style={{
                            padding: '1rem',
                            borderRadius: '10px',
                            background: 'rgba(71, 85, 105, 0.25)',
                            border: '1px solid #64748b',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#334155',
                                color: '#cbd5e1',
                              }}
                            >
                              {m.time || '10:00 - 11:30'} • EDITORIAL MEETING
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Studio Operations Sync</span>
                          </div>
                          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', margin: '4px 0' }}>{m.title}</h4>
                          <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0 }}>{m.summary}</p>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            Participants: {m.participants}
                          </div>
                        </div>
                      ))}

                      {/* Productions */}
                      {dayProds.map((p) => {
                        const theme = getShowTheme(p.title, p.type);
                        const isFilmingToday = p.filmingDate === dayStr;

                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                            style={{
                              padding: '1rem',
                              borderRadius: '10px',
                              background: theme.bgDark,
                              border: `1px solid ${theme.border}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      background: theme.badgeBg,
                                      color: '#fff',
                                    }}
                                  >
                                    {p.type}
                                  </span>
                                  {p.location && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: !requiresStudio(p.location)
                                          ? '#34d399'
                                          : p.location === 'STUDIO_REMOTE_GUEST'
                                          ? '#38bdf8'
                                          : '#60a5fa',
                                      }}
                                    >
                                      {p.location === 'STUDIO_REMOTE_GUEST'
                                        ? 'STUDIO + REMOTE GUEST'
                                        : !requiresStudio(p.location)
                                        ? 'FULLY REMOTE'
                                        : 'IN STUDIO'}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Stage: <strong>{p.currentStage}</strong>
                                  </span>
                                </div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: theme.textDark, margin: '4px 0' }}>
                                  {p.title}
                                </h4>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProduction(p.id);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                              >
                                <span>Open Tasks</span>
                                <ExternalLink size={12} />
                              </button>
                            </div>

                            {/* Timing and crew details */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '0.6rem',
                                marginTop: '0.75rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {isFilmingToday && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong style={{ color: 'var(--text-main)' }}>Filming Time:</strong>{' '}
                                  {p.filmingTime || '10:00 IDT'}
                                </div>
                              )}
                              {p.editorId && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong style={{ color: 'var(--text-main)' }}>Editor:</strong> {getUserName(p.editorId)}{' '}
                                  <span style={{ fontSize: '11px', color: '#e879f9', fontWeight: 600 }}>({p.currentStage})</span>
                                </div>
                              )}
                              {p.producerId && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong style={{ color: 'var(--text-main)' }}>Producer:</strong> {getUserName(p.producerId)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dedicated Video Editor Shift Workload section in Cards View */}
                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid var(--border-color, #334155)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(192, 38, 211, 0.15)',
                            color: '#e879f9',
                          }}
                        >
                          <Scissors size={15} />
                        </span>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                            Video Editors — Tasks on Shift ({dayStr})
                          </h3>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                            Task queues assigned for completion during today&apos;s editing shift (pure shift queue, no rigid hour slots)
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '1rem',
                        }}
                      >
                        {activeEditors.map((ed) => {
                          const shiftTasks = getEditorShiftTasks(ed.id, dayStr);

                          return (
                            <div
                              key={`day-ed-card-${ed.id}`}
                              style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color, #334155)',
                                padding: '0.85rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingBottom: '0.6rem',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                  marginBottom: '0.75rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f0abfc' }}>
                                    {ed.fullName || ed.name}
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                    ({ed.jobFunction?.replace(/_/g, ' ')})
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    background: 'rgba(192, 38, 211, 0.25)',
                                    color: '#f5d0fe',
                                  }}
                                >
                                  {shiftTasks.length} {shiftTasks.length === 1 ? 'task' : 'tasks'}
                                </span>
                              </div>

                              {shiftTasks.length === 0 ? (
                                <div
                                  style={{
                                    padding: '16px 10px',
                                    textAlign: 'center',
                                    borderRadius: '6px',
                                    border: '1px dashed rgba(51, 65, 85, 0.6)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '11px',
                                    background: 'rgba(15, 23, 42, 0.3)',
                                  }}
                                >
                                  No tasks scheduled on shift
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {shiftTasks.map((p, pIdx) => {
                                    const theme = getShowTheme(p.title, p.type);
                                    return (
                                      <div
                                        key={`day-ed-task-card-${p.id}`}
                                        onClick={() => setSelectedEvent({ type: 'PRODUCTION', data: p })}
                                        style={{
                                          borderRadius: '8px',
                                          padding: '9px 10px',
                                          background: theme.bgDark,
                                          border: `1px solid ${theme.border}`,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span
                                              style={{
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                padding: '1px 5px',
                                                borderRadius: '3px',
                                                background: '#e879f9',
                                                color: '#000',
                                              }}
                                            >
                                              #{pIdx + 1}
                                            </span>
                                            <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: theme.badgeBg, color: '#fff' }}>
                                              {p.type}
                                            </span>
                                          </div>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                            {p.currentStage}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: theme.textDark }}>
                                          {p.title}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW MODE 3: MONTH OVERVIEW */}
      {viewMode === 'month' && (
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #334155)',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {currentAnchorDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Click any date to view shoots and edit commitments
            </div>
          </div>

          {/* Month grid days */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
            }}
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName) => (
              <div
                key={dayName}
                style={{
                  padding: '8px 4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                {dayName.slice(0, 3)}
              </div>
            ))}

            {/* Simple 35 day grid generator */}
            {(() => {
              const year = currentAnchorDate.getFullYear();
              const month = currentAnchorDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
              const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

              const cells = [];
              // leading blanks
              for (let i = 0; i < firstDay; i++) {
                cells.push(null);
              }
              for (let d = 1; d <= totalDaysInMonth; d++) {
                cells.push(new Date(year, month, d));
              }

              return cells.map((d, index) => {
                if (!d) {
                  return (
                    <div
                      key={`empty-${index}`}
                      style={{
                        minHeight: '85px',
                        background: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: '8px',
                      }}
                    />
                  );
                }

                const dStr = formatDateToYYYYMMDD(d);
                const dayProds = filteredProductions.filter((p) => p.filmingDate === dStr || p.editingDate === dStr);
                const isToday = dStr === formatDateToYYYYMMDD(new Date());

                return (
                  <div
                    key={dStr}
                    onClick={() => {
                      setSelectedDayDate(d);
                      setViewMode('day');
                    }}
                    style={{
                      minHeight: '85px',
                      padding: '6px',
                      borderRadius: '8px',
                      background: isToday ? 'rgba(212, 160, 23, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      border: isToday ? '1px solid var(--jns-gold)' : '1px solid var(--border-color, #334155)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          color: isToday ? 'var(--jns-gold)' : 'var(--text-main)',
                        }}
                      >
                        {d.getDate()}
                      </span>
                      {dayProds.length > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '6px',
                            background: 'rgba(37, 99, 235, 0.3)',
                            color: '#93c5fd',
                          }}
                        >
                          {dayProds.length}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dayProds.slice(0, 2).map((item) => {
                        const theme = getShowTheme(item.title, item.type);
                        return (
                          <div
                            key={item.id}
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2px 4px',
                              borderRadius: '4px',
                              background: theme.bgDark,
                              color: theme.textDark,
                              border: `1px solid ${theme.border}`,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                        );
                      })}
                      {dayProds.length > 2 && (
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                          +{dayProds.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* EVENT DETAILS MODAL / DRAWER */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--card-bg, #1e293b)',
              borderRadius: '14px',
              border: '1px solid var(--border-color, #334155)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedEvent.type === 'PRODUCTION' && (() => {
              const p = selectedEvent.data as Production;
              const theme = getShowTheme(p.title, p.type);

              return (
                <div>
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: '1.25rem',
                      background: theme.bgDark,
                      borderBottom: `2px solid ${theme.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: theme.badgeBg,
                            color: '#fff',
                          }}
                        >
                          {p.type}
                        </span>
                        {p.location && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: !requiresStudio(p.location)
                                ? 'rgba(16, 185, 129, 0.15)'
                                : p.location === 'STUDIO_REMOTE_GUEST'
                                ? 'rgba(14, 165, 233, 0.15)'
                                : 'rgba(37, 99, 235, 0.15)',
                              color: !requiresStudio(p.location)
                                ? '#34d399'
                                : p.location === 'STUDIO_REMOTE_GUEST'
                                ? '#38bdf8'
                                : '#60a5fa',
                              border: `1px solid ${
                                !requiresStudio(p.location)
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : p.location === 'STUDIO_REMOTE_GUEST'
                                  ? 'rgba(14, 165, 233, 0.3)'
                                  : 'rgba(37, 99, 235, 0.3)'
                              }`,
                            }}
                          >
                            {p.location === 'STUDIO_REMOTE_GUEST'
                              ? 'Studio + Remote Interviewee'
                              : !requiresStudio(p.location)
                              ? 'Fully Remote Recording'
                              : 'In Studio Recording'}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme.textDark, margin: 0 }}>{p.title}</h3>
                    </div>

                    <button
                      onClick={() => setSelectedEvent(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Key Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          border: '1px solid var(--border-color, #334155)',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          FILMING SCHEDULE
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          {p.filmingDate || 'Not set'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--jns-gold)', fontWeight: 700 }}>
                          {p.filmingTime || '10:00 IDT'}
                        </div>
                        {p.location && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Setup:{' '}
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                              {p.location === 'STUDIO_REMOTE_GUEST'
                                ? 'Studio + Remote Interviewee'
                                : !requiresStudio(p.location)
                                ? 'Fully Remote Recording'
                                : 'In Studio Recording'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          border: '1px solid var(--border-color, #334155)',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ASSIGNED VIDEO EDITOR
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                          {p.editorId ? getUserName(p.editorId) : 'Unassigned Editor'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#e879f9', fontWeight: 700 }}>
                          Shift Queue: {p.currentStage}
                        </div>
                      </div>
                    </div>

                    {/* Producer & Stage */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Producer: </span>
                        <strong style={{ color: 'var(--text-main)' }}>{getUserName(p.producerId)}</strong>
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Current Stage: </span>
                        <strong style={{ color: 'var(--text-main)' }}>{p.currentStage}</strong>
                      </div>
                    </div>

                    {/* Rental specific info */}
                    {p.rentalDetails && (
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(124, 58, 237, 0.1)',
                          border: '1px solid #7c3aed',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700 }}>CLIENT & SETUP</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                          {p.rentalDetails.clientName} — {p.rentalDetails.projectName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Setup: {p.rentalDetails.studioSetup}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.6rem',
                        marginTop: '0.5rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-color, #334155)',
                      }}
                    >
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 14px' }}
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(null);
                          handleOpenProduction(p.id);
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontWeight: 700 }}
                      >
                        <span>Open Tasks & Production</span>
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {selectedEvent.type === 'MEETING' && (() => {
              const m = selectedEvent.data as Meeting;
              return (
                <div>
                  <div
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(71, 85, 105, 0.3)',
                      borderBottom: '2px solid #64748b',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#334155',
                          color: '#cbd5e1',
                        }}
                      >
                        EDITORIAL MEETING
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', margin: '4px 0 0 0' }}>
                        {m.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>Time:</strong> {m.time || '10:00 - 11:30 IDT'} on {m.date}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>Participants:</strong> {m.participants}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Summary:</strong>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{m.summary}</p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.6rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-color, #334155)',
                      }}
                    >
                      <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">
                        Close
                      </button>
                      <Link href="/meetings" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                        View All Meetings
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Quick Action Modal for Scheduling new episodes/pilots/rentals */}
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        defaultTab={quickActionTab}
        onSuccess={() => {
          fetchCalendarData();
          setQuickActionOpen(false);
        }}
      />
    </div>
  );
}
