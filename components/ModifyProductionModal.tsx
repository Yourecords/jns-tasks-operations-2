'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Calendar,
  Clock,
  Video,
  Radio,
  Scissors,
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Compass,
  Film,
  Sparkles,
} from 'lucide-react';
import { Production, User, Show, Priority } from '@/lib/types';
import { useUser } from './UserContext';
import { findStudioConflict, isEligibleEditor, requiresStudio } from '@/lib/utils';

function addMinutesToTimeStr(timeStr: string, minutesToAdd: number): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '11:30';
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const total = h * 60 + m + minutesToAdd;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function getMinutesDiff(startStr: string, endStr: string): number {
  const matchA = startStr.match(/^(\d{1,2}):(\d{2})/);
  const matchB = endStr.match(/^(\d{1,2}):(\d{2})/);
  if (!matchA || !matchB) return 90;
  const minA = parseInt(matchA[1], 10) * 60 + parseInt(matchA[2], 10);
  const minB = parseInt(matchB[1], 10) * 60 + parseInt(matchB[2], 10);
  return minB - minA;
}

function calculateDurationDisplay(startTime: string, endTime: string): string {
  const diff = getMinutesDiff(startTime, endTime);
  if (diff <= 0) return 'Invalid (end after start)';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

interface ModifyProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: Production | null;
  onSuccess?: (updated: Production) => void;
}

export default function ModifyProductionModal({
  isOpen,
  onClose,
  production,
  onSuccess,
}: ModifyProductionModalProps) {
  const { currentUser, allUsers } = useUser();
  const [shows, setShows] = useState<Show[]>([]);
  const [existingProductions, setExistingProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [showId, setShowId] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [filmingDate, setFilmingDate] = useState('');
  const [filmingStartTime, setFilmingStartTime] = useState('10:00');
  const [filmingEndTime, setFilmingEndTime] = useState('11:30');
  const [location, setLocation] = useState<'IN_STUDIO' | 'STUDIO_REMOTE_GUEST' | 'FULLY_REMOTE'>('IN_STUDIO');
  const [editingDate, setEditingDate] = useState('');
  const [editingDeadline, setEditingDeadline] = useState('');
  const [publicationDeadline, setPublicationDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [producerId, setProducerId] = useState('');
  const [editorId, setEditorId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');

  // Pilot specific
  const [conceptSummary, setConceptSummary] = useState('');

  // Rental specific
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [studioSetup, setStudioSetup] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [hoursCount, setHoursCount] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  // Pre-populate fields from production when opened
  useEffect(() => {
    if (production && isOpen) {
      setTitle(production.title || '');
      setShowId(production.showId || '');
      setEpisodeNumber(production.episodeNumber || '');
      
      const fDate = production.filmingDate || production.rentalDetails?.recordingDate || '';
      setFilmingDate(fDate);

      const fTime = production.filmingTime || production.rentalDetails?.recordingTime || '';
      if (fTime.includes('-')) {
        const parts = fTime.split('-').map((s) => s.trim().replace(/(IDT|AM|PM)/gi, '').trim());
        setFilmingStartTime(parts[0] || '10:00');
        setFilmingEndTime(parts[1] || '11:30');
      } else if (fTime) {
        setFilmingStartTime(fTime.trim());
        setFilmingEndTime(addMinutesToTimeStr(fTime.trim(), 90));
      } else {
        setFilmingStartTime('10:00');
        setFilmingEndTime('11:30');
      }

      const loc = (production.location as any) || (production.type === 'RENTAL' ? 'IN_STUDIO' : 'IN_STUDIO');
      setLocation(loc === 'STUDIO' ? 'IN_STUDIO' : loc);

      setEditingDate(production.editingDate || '');
      setEditingDeadline(production.editingDeadline || '');
      setPublicationDeadline(production.publicationDeadline || '');
      setPriority(production.priority || 'NORMAL');
      setProducerId(production.producerId || '');
      setEditorId(production.editorId || '');
      setStatus((production.status as any) || 'ACTIVE');

      if (production.pilotDetails) {
        setConceptSummary(production.pilotDetails.conceptSummary || '');
      }

      if (production.rentalDetails) {
        setClientName(production.rentalDetails.clientName || '');
        setProjectName(production.rentalDetails.projectName || '');
        setContactName(production.rentalDetails.contactName || '');
        setContactInfo(production.rentalDetails.contactInfo || '');
        setStudioSetup(production.rentalDetails.studioSetup || '');
        setAgreedPrice(production.rentalDetails.agreedPrice || '');
        setHoursCount(production.rentalDetails.hoursCount || '');
        setSpecialRequirements(production.rentalDetails.specialRequirements || '');
      }

      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [production, isOpen]);

  // Load shows and existing productions for conflict detection
  useEffect(() => {
    if (isOpen) {
      fetch('/api/shows')
        .then((r) => r.json())
        .then((data) => {
          if (data.shows) setShows(data.shows);
        })
        .catch(() => {});

      fetch('/api/productions')
        .then((r) => r.json())
        .then((data) => {
          if (data.productions) setExistingProductions(data.productions);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const filmingTimeRange = useMemo(() => {
    return filmingEndTime ? `${filmingStartTime} - ${filmingEndTime}` : filmingStartTime;
  }, [filmingStartTime, filmingEndTime]);

  // Real-time Studio Conflict Detection
  const studioConflict = useMemo(() => {
    if (!production || !filmingDate || !filmingTimeRange) return { hasConflict: false };
    const loc = production.type === 'RENTAL' ? 'STUDIO' : location;
    return findStudioConflict(existingProductions, filmingDate, filmingTimeRange, loc, production.id);
  }, [existingProductions, filmingDate, filmingTimeRange, location, production]);

  if (!isOpen || !production) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (studioConflict.hasConflict && studioConflict.conflictingProduction) {
      setErrorMsg(
        `Studio Double-Booking Conflict: "${studioConflict.conflictingProduction.title}" is already scheduled in the studio at ${studioConflict.conflictingProduction.filmingDate} ${studioConflict.conflictingProduction.filmingTime}. Please choose another time or studio slot.`
      );
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title,
        filmingDate,
        filmingTime: filmingTimeRange,
        editingDate,
        editingDeadline,
        publicationDeadline,
        location: production.type === 'RENTAL' ? 'STUDIO' : location,
        priority,
        producerId,
        editorId,
        status,
      };

      if (production.type === 'EPISODE') {
        payload.showId = showId;
        payload.episodeNumber = episodeNumber;
      } else if (production.type === 'PILOT') {
        payload.conceptSummary = conceptSummary;
      } else if (production.type === 'RENTAL') {
        payload.rentalDetails = {
          clientName,
          projectName,
          contactName,
          contactInfo,
          studioSetup,
          agreedPrice,
          hoursCount,
          specialRequirements,
        };
      }

      const res = await fetch(`/api/productions/${production.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MODIFY_PRODUCTION',
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to modify production.');
      }

      setSuccessMsg(`✓ Successfully updated "${data.production.title}"!`);
      if (onSuccess) {
        onSuccess(data.production);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const eligibleEditors = allUsers.filter(isEligibleEditor);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '740px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #1e293b)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-color, #334155)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.15)',
                border: '1px solid rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Edit3 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #f8fafc)', margin: 0 }}>
                  Modify Scheduled Production
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background:
                      production.type === 'RENTAL'
                        ? 'rgba(168, 85, 247, 0.2)'
                        : production.type === 'PILOT'
                        ? 'rgba(234, 88, 12, 0.2)'
                        : 'rgba(37, 99, 235, 0.2)',
                    color:
                      production.type === 'RENTAL'
                        ? '#c084fc'
                        : production.type === 'PILOT'
                        ? '#fb923c'
                        : '#60a5fa',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {production.type}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                Update filming times, studio setup, editing dates, personnel, and deadlines
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#86efac',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Real-time Studio Conflict Banner */}
          {studioConflict.hasConflict && studioConflict.conflictingProduction && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <strong>Physical Studio Double-Booking Warning:</strong> "{studioConflict.conflictingProduction.title}" is already scheduled in the studio on {studioConflict.conflictingProduction.filmingDate} at {studioConflict.conflictingProduction.filmingTime}. Physical studio cannot be double-booked.
              </div>
            </div>
          )}

          {/* Section 1: Identity & Show/Client Info */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color, #334155)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--jns-gold, #d4a017)', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Film size={13} />
              <span>PRODUCTION IDENTIFICATION & DETAILS</span>
            </div>

            {production.type === 'EPISODE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Show</label>
                  <select
                    className="form-select"
                    value={showId}
                    onChange={(e) => setShowId(e.target.value)}
                    style={{ fontSize: '13px' }}
                  >
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Episode #</label>
                  <input
                    type="text"
                    className="form-input"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    placeholder="e.g. 892"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>
            )}

            {production.type === 'RENTAL' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Client / Organization</label>
                  <input
                    type="text"
                    className="form-input"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Fox News / Bloomberg"
                    style={{ fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Project / Broadcast Purpose</label>
                  <input
                    type="text"
                    className="form-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Live TVU Studio Booking"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Title / Subject</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Production Title"
                style={{ fontSize: '13px' }}
                required
              />
            </div>

            {production.type === 'PILOT' && (
              <div style={{ marginTop: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Pilot Concept Summary</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={conceptSummary}
                  onChange={(e) => setConceptSummary(e.target.value)}
                  placeholder="Outline the pilot format, target audience, and trial objectives..."
                  style={{ fontSize: '12px' }}
                />
              </div>
            )}
          </div>

          {/* Section 2: Filming Schedule & Studio Location */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color, #334155)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={13} />
              <span>FILMING SCHEDULE & RECORDING SETUP</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Filming Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filmingDate}
                  onChange={(e) => setFilmingDate(e.target.value)}
                  style={{ fontSize: '13px' }}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Start Time (IDT)</label>
                <input
                  type="time"
                  className="form-input"
                  value={filmingStartTime}
                  onChange={(e) => {
                    setFilmingStartTime(e.target.value);
                    if (!filmingEndTime || filmingEndTime <= e.target.value) {
                      setFilmingEndTime(addMinutesToTimeStr(e.target.value, 90));
                    }
                  }}
                  style={{ fontSize: '13px' }}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>End Time (IDT)</label>
                <input
                  type="time"
                  className="form-input"
                  value={filmingEndTime}
                  onChange={(e) => setFilmingEndTime(e.target.value)}
                  style={{ fontSize: '13px' }}
                  required
                />
              </div>
            </div>

            {/* Duration and quick presets */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Clock size={13} color="var(--jns-gold, #d4a017)" />
                <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>Duration:</span>
                <strong style={{ color: 'var(--text-main, #f8fafc)' }}>
                  {calculateDurationDisplay(filmingStartTime, filmingEndTime)}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                  ({filmingStartTime} – {filmingEndTime})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginRight: '2px' }}>
                  Quick:
                </span>
                {[
                  { label: '+30m', mins: 30 },
                  { label: '+45m', mins: 45 },
                  { label: '+1h', mins: 60 },
                  { label: '+1.5h', mins: 90 },
                  { label: '+2h', mins: 120 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFilmingEndTime(addMinutesToTimeStr(filmingStartTime, preset.mins))}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px', fontSize: '10.5px' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording Location / Type */}
            {production.type !== 'RENTAL' ? (
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Recording Location</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'IN_STUDIO', label: 'In Studio', desc: 'Full Studio Multi-Cam' },
                    { id: 'STUDIO_REMOTE_GUEST', label: 'Studio + Remote', desc: 'Host in Studio, Guest Remote' },
                    { id: 'FULLY_REMOTE', label: 'Fully Remote', desc: 'Virtual StreamYard / Zoom' },
                  ].map((locOption) => (
                    <button
                      key={locOption.id}
                      type="button"
                      onClick={() => setLocation(locOption.id as any)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${location === locOption.id ? '#3b82f6' : 'rgba(51, 65, 85, 0.6)'}`,
                        background: location === locOption.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(15, 23, 42, 0.3)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: location === locOption.id ? '#93c5fd' : 'var(--text-main)' }}>
                        {locOption.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {locOption.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Studio Setup & Capabilities</label>
                <input
                  type="text"
                  className="form-input"
                  value={studioSetup}
                  onChange={(e) => setStudioSetup(e.target.value)}
                  placeholder="Main Studio Multi-Cam & Live TVU transmission"
                  style={{ fontSize: '13px' }}
                />
              </div>
            )}
          </div>

          {/* Section 3: Editing Schedule & Deadlines */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color, #334155)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e879f9', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scissors size={13} />
              <span>POST-PRODUCTION & DEADLINES</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                  Editing Shift Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={editingDate}
                  onChange={(e) => setEditingDate(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Editing Deadline</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingDeadline}
                  onChange={(e) => setEditingDeadline(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Publication Deadline</label>
                <input
                  type="date"
                  className="form-input"
                  value={publicationDeadline}
                  onChange={(e) => setPublicationDeadline(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Quick editing date presets */}
            {filmingDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shift preset:</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px' }}
                  onClick={() => setEditingDate(filmingDate)}
                >
                  Same day
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px' }}
                  onClick={() => setEditingDate(addDaysToDateStr(filmingDate, 1))}
                >
                  +1 day
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px' }}
                  onClick={() => setEditingDate(addDaysToDateStr(filmingDate, 2))}
                >
                  +2 days
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '1px 6px', fontSize: '10px' }}
                  onClick={() => setEditingDate(addDaysToDateStr(filmingDate, 3))}
                >
                  +3 days
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Personnel, Priority & Status */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-color, #334155)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} />
              <span>ASSIGNMENT, PRIORITY & PIPELINE STATUS</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Assigned Producer</label>
                <select
                  className="form-select"
                  value={producerId}
                  onChange={(e) => setProducerId(e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="">Select Producer...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.jobFunction || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Assigned Editor</label>
                <select
                  className="form-select"
                  value={editorId}
                  onChange={(e) => setEditorId(e.target.value)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="">Unassigned Editor</option>
                  {eligibleEditors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Video Editor)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Pipeline Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="ACTIVE">Active (In Pipeline)</option>
                  <option value="COMPLETED">Completed / Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color, #334155)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={loading}
              style={{
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
              }}
            >
              {loading ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
