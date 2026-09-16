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
  RefreshCw,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Filter,
  X
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { AnalyticsSummary, VelocityMetric, ProducerPerformance, EditorPerformance, Production, Show, User } from '@/lib/types';
import { formatHours } from '@/lib/analytics';
import {
  exportAnalyticsToExcel,
  DateRangePreset,
  DateFilterBasis,
  AnalyticsExportSections,
  getDateRangeFromPreset,
  filterProductionsByDateRange,
} from '@/lib/excel-export';

export default function AnalyticsPage() {
  const { currentUser, allUsers } = useUser();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [productionsData, setProductionsData] = useState<Production[]>([]);
  const [showsData, setShowsData] = useState<Show[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'SHOWS' | 'PRODUCERS' | 'EDITORS' | 'CALLSHEET'>('SHOWS');

  // Call-sheet preview state
  const [previewUserId, setPreviewUserId] = useState<string>('usr_yuri_admin');
  const [callSheetPreview, setCallSheetPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);

  // Excel Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPreset, setExportPreset] = useState<DateRangePreset>('ALL');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportDateBasis, setExportDateBasis] = useState<DateFilterBasis>('PUBLISHED');
  const [exportSections, setExportSections] = useState<AnalyticsExportSections>({
    summary: true,
    shows: true,
    producers: true,
    editors: true,
    ledger: true,
  });
  const [isExporting, setIsExporting] = useState(false);

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
      if (data.productions) setProductionsData(data.productions);
      if (data.shows) setShowsData(data.shows);
      if (data.users) setUsersData(data.users);
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

  const handlePresetSelect = (preset: DateRangePreset) => {
    setExportPreset(preset);
    if (preset !== 'CUSTOM') {
      const { start, end } = getDateRangeFromPreset(preset);
      setExportStartDate(start);
      setExportEndDate(end);
    }
  };

  const handleToggleSection = (key: keyof AnalyticsExportSections) => {
    setExportSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllSections = (val: boolean) => {
    setExportSections({
      summary: val,
      shows: val,
      producers: val,
      editors: val,
      ledger: val,
    });
  };

  const matchingEpisodes = filterProductionsByDateRange(
    productionsData,
    exportStartDate,
    exportEndDate,
    exportDateBasis
  );

  const handleRunExport = async () => {
    if (!Object.values(exportSections).some(Boolean)) {
      alert('Please select at least one data section to include in the export.');
      return;
    }
    setIsExporting(true);
    try {
      await exportAnalyticsToExcel({
        preset: exportPreset,
        startDate: exportStartDate,
        endDate: exportEndDate,
        dateBasis: exportDateBasis,
        sections: exportSections,
        productions: productionsData,
        shows: showsData,
        users: usersData,
      });
      setIsExportModalOpen(false);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

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

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchAnalytics}
            title="Recalculate metrics"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Metrics</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsExportModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export Report to Excel</span>
          </button>
        </div>
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

      {/* EXCEL EXPORT MODAL */}
      {isExportModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsExportModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border-color, #1e293b)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '1.75rem',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Export Performance & Operations Report
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Generate a styled Excel workbook (.xlsx) with filtered velocity and throughput data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Time Window Filter */}
            <div style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color, #1e293b)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--jns-gold)" />
                  1. Choose Time Period
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {exportStartDate && exportEndDate ? `${exportStartDate} to ${exportEndDate}` : 'All historic data'}
                </span>
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                {(
                  [
                    { id: 'ALL', label: 'All Time' },
                    { id: '7D', label: 'Last 7 Days' },
                    { id: '30D', label: 'Last 30 Days' },
                    { id: '90D', label: 'Last 90 Days' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'LAST_MONTH', label: 'Last Month' },
                    { id: 'YTD', label: 'Year to Date' },
                    { id: 'CUSTOM', label: 'Custom' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: exportPreset === preset.id ? '1px solid var(--jns-blue, #3b82f6)' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: exportPreset === preset.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      color: exportPreset === preset.id ? '#60a5fa' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                    value={exportStartDate}
                    onChange={(e) => {
                      setExportStartDate(e.target.value);
                      setExportPreset('CUSTOM');
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    End Date (To)
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%', fontSize: '12px', padding: '6px 10px' }}
                    value={exportEndDate}
                    onChange={(e) => {
                      setExportEndDate(e.target.value);
                      setExportPreset('CUSTOM');
                    }}
                  />
                </div>
              </div>

              {/* Date Basis Radio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date Basis:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="dateBasis"
                    checked={exportDateBasis === 'PUBLISHED'}
                    onChange={() => setExportDateBasis('PUBLISHED')}
                  />
                  <span>Publication Date (Air / Delivery)</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="dateBasis"
                    checked={exportDateBasis === 'FILMING'}
                    onChange={() => setExportDateBasis('FILMING')}
                  />
                  <span>Filming Date (Shoot Day)</span>
                </label>
              </div>
            </div>

            {/* Step 2: Choose Data Sections (Checkboxes) */}
            <div style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color, #1e293b)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={14} color="var(--jns-gold)" />
                  2. Select Data Sections (Excel Sheets)
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '11px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectAllSections(true)}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllSections(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Section 1: Executive Summary */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: exportSections.summary ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: exportSections.summary ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections.summary}
                    onChange={() => handleToggleSection('summary')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Executive Summary & Key Velocity KPIs
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Includes completed episodes count, M1 producer sign-off, M2 edit turnaround, and M3 total velocity averages.
                    </div>
                  </div>
                </label>

                {/* Section 2: Shows Breakdown */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: exportSections.shows ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: exportSections.shows ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections.shows}
                    onChange={() => handleToggleSection('shows')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Show Velocity & Turnaround Breakdown
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Per-show episode volume, average hours from filming to air, and average editing speed.
                    </div>
                  </div>
                </label>

                {/* Section 3: Producer Performance */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: exportSections.producers ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: exportSections.producers ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections.producers}
                    onChange={() => handleToggleSection('producers')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Producer Performance Metrics
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Episode volume managed by each producer and average turnaround for producer package sign-offs.
                    </div>
                  </div>
                </label>

                {/* Section 4: Editor Performance */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: exportSections.editors ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: exportSections.editors ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections.editors}
                    onChange={() => handleToggleSection('editors')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Video Editor Throughput & Revision Quality
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Drafts completed, average edit speed, revision cycle rates, and first-pass approval health.
                    </div>
                  </div>
                </label>

                {/* Section 5: Episode Production Ledger */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: exportSections.ledger ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: exportSections.ledger ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={exportSections.ledger}
                    onChange={() => handleToggleSection('ledger')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Detailed Episode Production Ledger
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Row-by-row itemized sheet of every episode with dates, assigned crew, and exact stage turnaround hours.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Live Filter Count Pill */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} />
                {matchingEpisodes.length} episode{matchingEpisodes.length === 1 ? '' : 's'} match selected time window
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                {exportStartDate && exportEndDate ? `${exportStartDate} to ${exportEndDate}` : 'Full History'}
              </span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunExport}
                disabled={isExporting || matchingEpisodes.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                }}
              >
                <FileSpreadsheet size={14} />
                <span>{isExporting ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
