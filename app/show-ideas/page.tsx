'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, ExternalLink, Check, ChevronDown } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { ShowIdea, ShowIdeaStatus } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

export default function ShowIdeasPage() {
  const { currentUser } = useUser();
  const [ideas, setIdeas] = useState<ShowIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('ALL');

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/show-ideas');
      const data = await res.json();
      if (data.showIdeas) setIdeas(data.showIdeas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  const isProducerOrAdmin = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  const handleStatusChange = async (id: string, newStatus: ShowIdeaStatus) => {
    try {
      const res = await fetch('/api/show-ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchIdeas();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = ideas.filter((i) => {
    if (filterCat !== 'ALL' && i.category !== filterCat) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            New Show & Content Ideas
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Editorial pitch deck and pilot pipeline for new programming
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={15} />
          <span>Pitch New Show Idea</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem' }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No show ideas submitted yet.
          </div>
        ) : (
          filtered.map((idea) => (
            <div
              key={idea.id}
              className="section-panel"
              style={{
                marginBottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="section-panel-header">
                  <div className="section-panel-title" style={{ fontSize: '14px' }}>
                    <Sparkles size={16} color="var(--jns-gold)" />
                    <span>{idea.showName}</span>
                  </div>
                  <span className="status-chip status-waiting" style={{ fontSize: '10px' }}>
                    {idea.category}
                  </span>
                </div>

                <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px' }}>Concept:</strong>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px' }}>{idea.concept}</p>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--jns-gold)', textTransform: 'uppercase', fontSize: '10px' }}>Why JNS Should Make It:</strong>
                    <p style={{ color: 'var(--text-main)', marginTop: '2px' }}>{idea.whyJnsShouldMakeIt}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', backgroundColor: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Format:</span> {idea.suggestedFormat}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Length:</span> {idea.suggestedLength}
                    </div>
                    {idea.suggestedHost && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Host:</span> {idea.suggestedHost}
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Audience:</span> {idea.targetAudience}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Pitched by <strong>{idea.submittedByName}</strong> on {new Date(idea.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Status Manager for Producers/Admin */}
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)' }}>
                  Status: <span style={{ color: 'var(--jns-gold)' }}>{idea.status.replace(/_/g, ' ')}</span>
                </div>

                {isProducerOrAdmin && (
                  <select
                    className="form-select"
                    value={idea.status}
                    onChange={(e) => handleStatusChange(idea.id, e.target.value as ShowIdeaStatus)}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
                  >
                    <option value="NEW">New</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="INTERESTING">Interesting</option>
                    <option value="PILOT_CONSIDERED">Pilot Considered</option>
                    <option value="APPROVED_FOR_PILOT">Approved for Pilot</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab="IDEA"
        onSuccess={() => fetchIdeas()}
      />
    </div>
  );
}
