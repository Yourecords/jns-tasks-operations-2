'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  Users,
  Film,
  Calendar,
  Send,
  Sparkles,
  AlertCircle,
  Eye,
  Mail,
  Zap,
  Check,
  RefreshCw
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { AnalyticsSummary, VelocityMetric, ProducerPerformance, EditorPerformance } from '@/lib/types';
import { formatHours } from '@/lib/analytics';

export default function AnalyticsPage() {
  const { currentUser, allUsers } = useUser();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'SHOWS' | 'PRODUCERS' | 'EDITORS' | 'CALLSHEET'>('SHOWS');

  // Call-sheet preview state
  const [previewUserId, setPreviewUserId] = useState<string>('usr_yuri_admin');
  const [callSheetPreview, setCallSheetPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchAnalytics = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analytics', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.status === 403) {
        setErrorMsg('Access denied: Production Analytics & Turnaround Velocity are confidential and restricted strictly to Yuri (Administrator).');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCallSheetPreview = async (userId: string) => {
    if (!currentUser) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/call-sheet/preview?userId=${userId}`, {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCallSheetPreview(data.callSheet);
    } catch (err: any) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDispatchCallSheets = async () => {
    if (!currentUser) return;
    setDispatchLoading(true);
    setDispatchResult(null);
    try {
      const res = await fetch('/api/call-sheet/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDispatchResult(`Successfully dispatched daily morning call-sheets to ${data.dispatchedCount} active team members via production@jns.org!`);
    } catch (err: any) {
      setDispatchResult(`Error: ${err.message}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'CALLSHEET') {
      fetchCallSheetPreview(previewUserId || currentUser?.id || 'usr_yuri_admin');
    }
  }, [activeTab, previewUserId]);

  if (!isAdmin) {
    return (
      <div className="empty-state-box" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1.25rem' }}>
          <Lock size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Confidential Executive Section
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem auto', fontSize: '14px', lineHeight: 1.5 }}>
          Production Analytics & Turnaround Velocity are confidential and accessible only to Yuri (Administrator).
        </p>
        <Link href="/" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const overall = summary?.overallVelocity;

  return (
    <div className="analytics-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <Lock size={11} /> Admin Only • Confidential Executive Data
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Authorized: {currentUser?.name}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={26} color="var(--jns-gold)" />
            <span>Production Analytics & Turnaround Velocity</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Objective measurements of file ingest, producer package turnaround, editor delivery speed, and overall episode approvals.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchAnalytics}
          title="Recalculate metrics"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3 CORE VELOCITY METRICS (Top Hero Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* METRIC 1 */}
        <div
          className="metric-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #3b82f6',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              Metric 1 • Producer Turnaround
            </span>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              Ingest &rarr; Notes
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            {formatHours(overall?.metric1HoursAvg)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-light)', marginTop: '4px' }}>
            Footage Ingest &rarr; Editor Notes Ready
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            Time between control room uploaded files and producer delivering editing rundown & B-roll package.
          </div>
        </div>

        {/* METRIC 2 */}
        <div
          className="metric-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #10b981',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              Metric 2 • Editor Speed
            </span>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              Notes &rarr; Draft 1
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            {formatHours(overall?.metric2HoursAvg)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-light)', marginTop: '4px' }}>
            Notes Received &rarr; First Draft Submitted
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            Time between video editor receiving producer notes and uploading Draft 1 for review.
          </div>
        </div>

        {/* METRIC 3 */}
        <div
          className="metric-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--jns-gold)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '11px', color: 'var(--jns-gold)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              Metric 3 • Complete Velocity
            </span>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(217, 119, 6, 0.15)', color: 'var(--jns-gold)' }}>
              Ingest &rarr; Approval
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            {formatHours(overall?.metric3HoursAvg)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-light)', marginTop: '4px' }}>
            Footage Ingest &rarr; Final Approval
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            Total end-to-end turnaround time from raw footage upload until the episode receives final approval.
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`filter-tab ${activeTab === 'SHOWS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SHOWS')}
        >
          Per-Show Turnaround Breakdown ({summary?.showBreakdown.length || 0})
        </button>
        <button
          className={`filter-tab ${activeTab === 'PRODUCERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PRODUCERS')}
        >
          Producer Performance Scorecard ({summary?.producers.length || 0})
        </button>
        <button
          className={`filter-tab ${activeTab === 'EDITORS' ? 'active' : ''}`}
          onClick={() => setActiveTab('EDITORS')}
        >
          Video Editor Speed Scorecard ({summary?.editors.length || 0})
        </button>
        <button
          className={`filter-tab ${activeTab === 'CALLSHEET' ? 'active' : ''}`}
          onClick={() => setActiveTab('CALLSHEET')}
        >
          Daily Call-Sheet Dispatch & Preview
        </button>
      </div>

      {/* TAB 1: PER-SHOW BREAKDOWN */}
      {activeTab === 'SHOWS' && (
        <div className="section-panel">
          <div className="section-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-panel-title">
              <Film size={16} color="var(--jns-gold)" />
              <span>Show Turnaround Velocity Table</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Based on {overall?.completedEpisodesCount || 0} completed episodes
            </span>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Show Name</th>
                    <th>Metric 1: Ingest &rarr; Notes</th>
                    <th>Metric 2: Notes &rarr; Draft 1</th>
                    <th>Metric 3: Full Turnaround</th>
                    <th>Analyzed Episodes</th>
                    <th>Turnaround Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.showBreakdown || []).map((s) => {
                    const m3 = s.metric3Hours;
                    const rating =
                      m3 === null ? 'Pending' : m3 <= 36 ? 'Rapid Turnaround' : m3 <= 72 ? 'Standard Pipeline' : 'Long Turnaround';
                    const ratingColor =
                      m3 === null ? '#94a3b8' : m3 <= 36 ? '#10b981' : m3 <= 72 ? '#3b82f6' : '#f59e0b';

                    return (
                      <tr key={s.showId}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {s.showName}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#60a5fa' }}>
                            {formatHours(s.metric1Hours)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#34d399' }}>
                            {formatHours(s.metric2Hours)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--jns-gold)' }}>
                            {formatHours(s.metric3Hours)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {s.sampleCount} episode{s.sampleCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: `${ratingColor}22`,
                              color: ratingColor,
                              border: `1px solid ${ratingColor}44`,
                            }}
                          >
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCER PERFORMANCE */}
      {activeTab === 'PRODUCERS' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Users size={16} color="var(--jns-blue)" />
              <span>Producer Performance Breakdown</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producer</th>
                    <th>Metric 1: Avg Time to Complete Notes</th>
                    <th>Packages Written</th>
                    <th>Episodes Produced</th>
                    <th>Efficiency Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.producers || []).map((p) => {
                    const avgHours = p.avgHoursToEditorNotes;
                    const efficiency =
                      avgHours === null
                        ? 'No data'
                        : avgHours <= 12
                        ? 'High Speed (<12h)'
                        : avgHours <= 24
                        ? 'Standard (<24h)'
                        : 'Review Required (>24h)';
                    const effColor =
                      avgHours === null ? '#94a3b8' : avgHours <= 12 ? '#10b981' : avgHours <= 24 ? '#3b82f6' : '#f59e0b';

                    return (
                      <tr key={p.producerId}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {p.producerName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID: {p.producerId}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '15px' }}>
                            {formatHours(p.avgHoursToEditorNotes)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            From footage upload to notes delivery
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                            {p.completedPackagesCount} packages
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {p.episodesProducedCount} episodes
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: `${effColor}20`,
                              color: effColor,
                              border: `1px solid ${effColor}40`,
                            }}
                          >
                            {efficiency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO EDITOR PERFORMANCE */}
      {activeTab === 'EDITORS' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Zap size={16} color="#10b981" />
              <span>Video Editor Performance Breakdown</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Video Editor</th>
                    <th>Metric 2: Avg Time to First Draft</th>
                    <th>Drafts Delivered</th>
                    <th>Avg Revision Cycles</th>
                    <th>Editor Turnaround Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.editors || []).map((e) => {
                    const avgHours = e.avgHoursToFirstDraft;
                    const status =
                      avgHours === null
                        ? 'No data'
                        : avgHours <= 20
                        ? 'Fast Turnaround (<20h)'
                        : avgHours <= 36
                        ? 'Standard Pace (<36h)'
                        : 'Extended Turnaround (>36h)';
                    const statColor =
                      avgHours === null ? '#94a3b8' : avgHours <= 20 ? '#10b981' : avgHours <= 36 ? '#3b82f6' : '#f59e0b';

                    return (
                      <tr key={e.editorId}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {e.editorName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID: {e.editorId}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#34d399', fontSize: '15px' }}>
                            {formatHours(e.avgHoursToFirstDraft)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            From notes received to Draft 1 upload
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                            {e.draftsDeliveredCount} drafts
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {e.totalRevisionCyclesAvg !== null ? `${e.totalRevisionCyclesAvg} cycles / ep` : '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: `${statColor}20`,
                              color: statColor,
                              border: `1px solid ${statColor}40`,
                            }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CALL-SHEET DISPATCH & PREVIEW */}
      {activeTab === 'CALLSHEET' && (
        <div>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>
                Automated 08:30 AM Daily Morning Call-Sheet
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Personalized email briefing delivered every morning to Director, Producers, Editors, and Studio.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Preview persona:</span>
                <select
                  className="form-select"
                  value={previewUserId}
                  onChange={(e) => setPreviewUserId(e.target.value)}
                  style={{ fontSize: '12px', padding: '0.4rem 0.75rem' }}
                >
                  <option value="usr_yuri_admin">Yuri (Director / Admin)</option>
                  <option value="usr_zach_producer">Zach (Producer)</option>
                  <option value="usr_barbara_producer">Barbara (Producer)</option>
                  <option value="usr_ryan_editor">Ryan (Video Editor)</option>
                  <option value="usr_olga_editor">Olga (Video Editor)</option>
                  <option value="usr_ksenia_editor">Ksenia (Video Editor)</option>
                  <option value="usr_ahron_studio">Ahron (Studio Operator)</option>
                  <option value="usr_ilia_graphics">Ilia (Graphics)</option>
                </select>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={handleDispatchCallSheets}
                disabled={dispatchLoading}
              >
                <Send size={13} className={dispatchLoading ? 'animate-spin' : ''} />
                <span>{dispatchLoading ? 'Dispatching...' : "Send Today's Call-Sheet Now"}</span>
              </button>
            </div>
          </div>

          {dispatchResult && (
            <div
              className={`alert-banner ${dispatchResult.startsWith('Error') ? 'alert-banner-danger' : 'alert-banner-info'}`}
              style={{ marginBottom: '1.25rem' }}
            >
              <CheckCircle2 size={16} />
              <span>{dispatchResult}</span>
            </div>
          )}

          {/* Live Preview Container */}
          <div className="section-panel">
            <div className="section-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-panel-title">
                <Eye size={16} color="var(--jns-gold)" />
                <span>Live Call-Sheet Email Preview: {callSheetPreview?.recipient?.name} ({callSheetPreview?.recipient?.positionDisplay || callSheetPreview?.recipient?.role})</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {callSheetPreview?.totalActionItems || 0} items on call-sheet
              </span>
            </div>
            <div className="section-panel-body" style={{ padding: '1rem', backgroundColor: '#030712' }}>
              {previewLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading call-sheet preview...
                </div>
              ) : callSheetPreview?.html ? (
                <div
                  style={{
                    maxWidth: '650px',
                    margin: '0 auto',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                  dangerouslySetInnerHTML={{ __html: callSheetPreview.html }}
                />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No preview available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
