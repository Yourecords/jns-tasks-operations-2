'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, Plus, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

export default function PilotsPage() {
  const { currentUser, allUsers } = useUser();
  const [pilots, setPilots] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPilots = async () => {
    try {
      const res = await fetch('/api/productions?type=PILOT');
      const data = await res.json();
      if (data.productions) setPilots(data.productions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilots();
  }, []);

  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return allUsers.find((u) => u.id === id)?.name || id;
  };

  const canCreate = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Pilot Productions
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Pre-production, shoot, and revision cycles for new concept show pilots
          </div>
        </div>

        {canCreate && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={15} />
            <span>Schedule New Pilot</span>
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.25rem' }}>
        {pilots.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pilot productions found.
          </div>
        ) : (
          pilots.map((pilot) => (
            <div
              key={pilot.id}
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
                    <Compass size={16} color="var(--jns-gold)" />
                    <span>{pilot.title}</span>
                  </div>
                  <span
                    className={`status-chip ${
                      pilot.status === 'COMPLETED' ? 'status-completed' : 'status-in-progress'
                    }`}
                  >
                    {pilot.status}
                  </span>
                </div>

                <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {pilot.pilotDetails?.conceptSummary && (
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', backgroundColor: 'var(--bg-card-subtle)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Concept:</strong> {pilot.pilotDetails.conceptSummary}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
                      <div style={{ fontWeight: 600, color: 'var(--jns-gold)' }}>
                        {pilot.currentStage.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Filming Date:</span>
                      <div style={{ fontWeight: 600 }}>{pilot.filmingDate || 'Scheduled'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Producer:</span>
                      <div>{getUserName(pilot.producerId)}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Editor:</span>
                      <div>{getUserName(pilot.editorId)}</div>
                    </div>
                  </div>

                  {pilot.pilotDetails?.convertedToShowId && (
                    <div
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid #16a34a',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: '#86efac',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Converted into Regular Show ({pilot.pilotDetails.convertedToShowId})</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Link href={`/productions/${pilot.id}`} className="btn btn-secondary btn-sm">
                  View Pilot Workflow →
                </Link>
                {pilot.status === 'COMPLETED' && !pilot.pilotDetails?.convertedToShowId && (
                  <Link href={`/productions/${pilot.id}`} className="btn btn-primary btn-sm">
                    <Sparkles size={13} />
                    <span>Convert to Show</span>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab="PILOT"
        onSuccess={() => fetchPilots()}
      />
    </div>
  );
}
