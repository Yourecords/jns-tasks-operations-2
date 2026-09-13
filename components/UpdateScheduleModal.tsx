'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, X, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useUser } from './UserContext';

interface UpdateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateScheduleModal({ isOpen, onClose }: UpdateScheduleModalProps) {
  const { currentUser, settings, refreshSettings } = useUser();
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canEdit = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (settings?.scheduleUrl) {
      setScheduleUrl(settings.scheduleUrl);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!canEdit) {
      setErrorMsg('Unauthorized: Only Producers and the Head of Video Production can update the schedule link.');
      return;
    }

    const trimmed = scheduleUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleUrl: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule link');

      await refreshSettings();
      setSuccessMsg('Production Schedule link updated successfully!');
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating the schedule link');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (url: string) => {
    setScheduleUrl(url);
    setErrorMsg('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} color="var(--jns-gold)" />
            </div>
            <div>
              <div className="modal-title">Update Production Schedule Link</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Authorized for Producers and Head of Video Production
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          {errorMsg && (
            <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-banner alert-banner-info" style={{ marginBottom: '1rem' }}>
              <Check size={15} color="#86efac" />
              <span style={{ color: '#86efac' }}>{successMsg}</span>
            </div>
          )}

          <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '1rem' }}>
            This link is displayed in the sidebar and top navigation for all team members to open the live JNS Video Production shooting schedule (Google Sheet, Google Calendar, Notion, or Airtable).
          </p>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Production Schedule URL <span className="req">*</span>
            </label>
            <input
              type="url"
              className="form-input"
              value={scheduleUrl}
              onChange={(e) => setScheduleUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... or Google Calendar link"
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              QUICK PRESETS:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <button
                type="button"
                className="filter-tab"
                onClick={() => applyPreset('https://docs.google.com/spreadsheets')}
              >
                Google Sheets
              </button>
              <button
                type="button"
                className="filter-tab"
                onClick={() => applyPreset('https://calendar.google.com/calendar')}
              >
                Google Calendar
              </button>
              <button
                type="button"
                className="filter-tab"
                onClick={() => applyPreset('https://notion.so/jns/production-schedule')}
              >
                Notion Schedule
              </button>
              <button
                type="button"
                className="filter-tab"
                onClick={() => applyPreset('https://airtable.com/appJNSProduction/tblSchedule')}
              >
                Airtable Base
              </button>
            </div>
          </div>

          {/* Current Target Preview */}
          {scheduleUrl && (
            <div
              style={{
                backgroundColor: 'var(--bg-card-subtle)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Test Target: {scheduleUrl}
              </span>
              <a
                href={scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--jns-gold)', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
              >
                <span>Test</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !canEdit}
            >
              {loading ? 'Saving...' : 'Save Schedule Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
