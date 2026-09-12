'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, CheckCircle2, Clock, Calendar, ExternalLink, User } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Meeting } from '@/lib/types';

export default function MeetingsPage() {
  const { currentUser, allUsers } = useUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New meeting form
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mParticipants, setMParticipants] = useState('');
  const [mSummary, setMSummary] = useState('');
  const [mTopics, setMTopics] = useState('');
  const [mDecisions, setMDecisions] = useState('');
  const [mWhatChanged, setMWhatChanged] = useState('');
  const [mNextSteps, setMNextSteps] = useState('');
  const [mActionTask, setMActionTask] = useState('');
  const [mActionOwner, setMActionOwner] = useState('');
  const [mActionDeadline, setMActionDeadline] = useState(new Date().toISOString().split('T')[0]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      if (data.meetings) setMeetings(data.meetings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const isProducerOrAdmin = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const actionItems = mActionTask
        ? [
            {
              task: mActionTask,
              ownerId: mActionOwner || currentUser?.id,
              ownerName: allUsers.find((u) => u.id === mActionOwner)?.name || currentUser?.name,
              deadline: mActionDeadline,
              status: 'PENDING',
            },
          ]
        : [];

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mTitle,
          date: mDate,
          participants: mParticipants,
          summary: mSummary,
          topicsDiscussed: mTopics,
          decisionsMade: mDecisions,
          whatChanged: mWhatChanged,
          nextSteps: mNextSteps,
          actionItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateModalOpen(false);
      setMTitle('');
      setMSummary('');
      setMTopics('');
      setMDecisions('');
      fetchMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActionItem = async (meetingId: string, actionItemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          actionItemId,
          status: nextStatus,
        }),
      });
      fetchMeetings();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = meetings.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.topicsDiscussed.toLowerCase().includes(q) ||
      m.participants.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Production Meetings & Decisions
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Meeting summaries, operational decisions, and actionable follow-up items
          </div>
        </div>

        {isProducerOrAdmin && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={15} />
            <span>New Meeting Summary</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.25rem', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search meeting topics, decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', backgroundColor: 'transparent', padding: 0 }}
          />
        </div>
      </div>

      {/* Meetings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No meeting records found.
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="section-panel" style={{ marginBottom: 0 }}>
              <div className="section-panel-header">
                <div className="section-panel-title">
                  <Calendar size={16} color="var(--jns-gold)" />
                  <span>{m.title}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Date: <strong style={{ color: 'var(--text-main)' }}>{m.date}</strong> • Written by: {m.writtenByName}
                </div>
              </div>

              <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '13px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>Participants:</strong> {m.participants}
                </div>

                <div>
                  <strong style={{ color: 'var(--jns-gold)', textTransform: 'uppercase', fontSize: '11px' }}>
                    Meeting Summary:
                  </strong>
                  <p style={{ color: 'var(--text-main)', marginTop: '2px' }}>{m.summary}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '0.75rem', backgroundColor: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>
                      Topics Discussed:
                    </strong>
                    <div style={{ color: 'var(--text-light)', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                      {m.topicsDiscussed}
                    </div>
                  </div>

                  <div>
                    <strong style={{ color: '#86efac', textTransform: 'uppercase', fontSize: '11px' }}>
                      Decisions Made:
                    </strong>
                    <div style={{ color: 'var(--text-light)', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                      {m.decisionsMade}
                    </div>
                  </div>
                </div>

                {m.whatChanged && (
                  <div>
                    <strong style={{ color: '#f472b6', textTransform: 'uppercase', fontSize: '11px' }}>
                      What Changed in Operations:
                    </strong>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px' }}>{m.whatChanged}</p>
                  </div>
                )}

                {/* Linked Action Items */}
                {m.actionItems && m.actionItems.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <strong style={{ color: 'var(--jns-gold)', textTransform: 'uppercase', fontSize: '11px', display: 'block', marginBottom: '0.4rem' }}>
                      Action Items & Deadlines:
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {m.actionItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--bg-input)',
                            padding: '0.4rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleToggleActionItem(m.id, item.id, item.status)}
                              style={{ color: item.status === 'COMPLETED' ? '#86efac' : 'var(--text-muted)' }}
                              title="Toggle completed"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <span
                              style={{
                                color: item.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--text-main)',
                                textDecoration: item.status === 'COMPLETED' ? 'line-through' : 'none',
                                fontWeight: 500,
                              }}
                            >
                              {item.task}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Owner: <strong>{item.ownerName}</strong> • Due: {item.deadline}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MEETING MODAL */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Meeting Record & Action Items</div>
              <button onClick={() => setCreateModalOpen(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleCreateMeeting}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Meeting Title <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Weekly Production Rundown Sync"
                      value={mTitle}
                      onChange={(e) => setMTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={mDate}
                      onChange={(e) => setMDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Participants</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Yuri, Zach, Ryan, Sarah, David"
                    value={mParticipants}
                    onChange={(e) => setMParticipants(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Executive Summary <span className="req">*</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Concise overview so someone who missed the meeting knows what happened..."
                    value={mSummary}
                    onChange={(e) => setMSummary(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Topics Discussed</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Key rundown items..."
                      value={mTopics}
                      onChange={(e) => setMTopics(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Decisions Made</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Agreed operational rules..."
                      value={mDecisions}
                      onChange={(e) => setMDecisions(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">What Changed (Schedules, Workflows, Deadlines)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Shifted Friday delivery cutoff to 13:00"
                    value={mWhatChanged}
                    onChange={(e) => setMWhatChanged(e.target.value)}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jns-gold)' }}>Initial Action Item</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Action task title..."
                      value={mActionTask}
                      onChange={(e) => setMActionTask(e.target.value)}
                    />
                    <select
                      className="form-select"
                      value={mActionOwner}
                      onChange={(e) => setMActionOwner(e.target.value)}
                    >
                      <option value="">Owner</option>
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="form-input"
                      value={mActionDeadline}
                      onChange={(e) => setMActionDeadline(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Meeting Summary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
