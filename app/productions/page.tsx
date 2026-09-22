'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Film, Plus, Filter, Search, Compass, Building2, Eye, Trash2, AlertTriangle, X, CheckCircle2, Edit3 } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production, Show } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';
import ModifyProductionModal from '@/components/ModifyProductionModal';

export default function ProductionsPage() {
  const { currentUser, allUsers } = useUser();
  const [productions, setProductions] = useState<Production[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  // Modify production state
  const [modifyTarget, setModifyTarget] = useState<Production | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Production | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterShow, setFilterShow] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('EPISODE');

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/productions'),
        fetch('/api/shows'),
      ]);
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
      if (pData.productions) setProductions(pData.productions);
      if (sData.shows) setShows(sData.shows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return allUsers.find((u) => u.id === id)?.name || id;
  };

  const filtered = productions.filter((p) => {
    if (filterType !== 'ALL' && p.type !== filterType) return false;
    if (filterShow !== 'ALL' && p.showId !== filterShow) return false;
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && p.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchEp = p.episodeNumber?.toLowerCase().includes(q);
      const matchClient = p.rentalDetails?.clientName.toLowerCase().includes(q);
      if (!matchTitle && !matchEp && !matchClient) return false;
    }
    return true;
  });

  const canCreate = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/productions/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove production task');
      setDeleteSuccess(`Production task "${deleteTarget.title}" was removed successfully.`);
      setTimeout(() => setDeleteSuccess(''), 4000);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Productions & Episodes
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Complete pipeline of recurring JNS shows, episodes, and broadcast jobs
          </div>
        </div>

        {canCreate && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setModalTab('EPISODE');
                setModalOpen(true);
              }}
            >
              <Plus size={15} />
              <span>New Episode</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setModalTab('PILOT');
                setModalOpen(true);
              }}
            >
              <Compass size={14} />
              <span>New Pilot</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar (Item 31) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Filter by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '12px', width: '180px' }}
          />
        </div>

        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', fontSize: '12px' }}
        >
          <option value="ALL">All Types</option>
          <option value="EPISODE">Episodes</option>
          <option value="PILOT">Pilots</option>
          <option value="RENTAL">Rentals</option>
        </select>

        <select
          className="form-select"
          value={filterShow}
          onChange={(e) => setFilterShow(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', fontSize: '12px' }}
        >
          <option value="ALL">All Shows</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', fontSize: '12px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active (In Pipeline)</option>
          <option value="COMPLETED">Completed / Published</option>
        </select>

        <select
          className="form-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', fontSize: '12px' }}
        >
          <option value="ALL">All Priorities</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing <strong>{filtered.length}</strong> production{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Success Notification Banner */}
      {deleteSuccess && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '1rem',
          borderRadius: '8px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#86efac',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={16} />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {/* Productions Table */}
      <div className="section-panel">
        <div className="section-panel-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No productions match the selected filters.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '27%', padding: '0.65rem 0.5rem' }}>Title & Project</th>
                    <th style={{ width: '8%', padding: '0.65rem 0.4rem' }}>Type</th>
                    <th style={{ width: '13%', padding: '0.65rem 0.4rem' }}>Current Stage</th>
                    <th style={{ width: '13%', padding: '0.65rem 0.4rem' }}>Personnel</th>
                    <th style={{ width: '13%', padding: '0.65rem 0.4rem' }}>Schedule</th>
                    <th style={{ width: '7%', padding: '0.65rem 0.4rem' }}>Priority</th>
                    <th style={{ width: '7%', padding: '0.65rem 0.4rem' }}>Status</th>
                    <th style={{ width: '12%', textAlign: 'right', padding: '0.65rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prod) => (
                    <tr key={prod.id}>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <Link href={`/productions/${prod.id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {prod.title}
                        </Link>
                        {prod.rentalDetails && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Client: {prod.rentalDetails.clientName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span className="status-chip status-not-started" style={{ fontSize: '10px' }}>
                          {prod.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span className="status-chip status-in-progress" style={{ fontSize: '10px' }}>
                          {prod.currentStage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontSize: '11px' }}>
                          <div><strong>Prod:</strong> {getUserName(prod.producerId)}</div>
                          {prod.editorId && <div><strong>Edit:</strong> {getUserName(prod.editorId)}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                          <div>Film: {prod.filmingDate || 'N/A'}{prod.filmingTime ? ` @ ${prod.filmingTime}` : ''}</div>
                          {prod.publicationDeadline && <div>Pub: {prod.publicationDeadline}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span className={`priority-pill priority-${prod.priority.toLowerCase()}`}>
                          {prod.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          className={`status-chip ${
                            prod.status === 'COMPLETED' ? 'status-completed' : 'status-in-progress'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {prod.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Link href={`/productions/${prod.id}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>
                            <Eye size={12} />
                            <span>Open</span>
                          </Link>
                          {canCreate && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setModifyTarget(prod)}
                              title={`Modify scheduled production "${prod.title}"`}
                              style={{
                                borderColor: 'rgba(59, 130, 246, 0.4)',
                                color: '#60a5fa',
                                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <Edit3 size={12} />
                              <span>Modify</span>
                            </button>
                          )}
                          {canCreate && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setDeleteError('');
                                setDeleteTarget(prod);
                              }}
                              title={`Remove task ${prod.title}`}
                              style={{
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        onSuccess={() => fetchData()}
      />

      <ModifyProductionModal
        isOpen={Boolean(modifyTarget)}
        onClose={() => setModifyTarget(null)}
        production={modifyTarget}
        onSuccess={() => {
          fetchData();
          setDeleteSuccess('Production modified successfully.');
          setTimeout(() => setDeleteSuccess(''), 4000);
        }}
      />

      {/* REMOVE TASK / PRODUCTION CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <AlertTriangle size={18} />
                <span>Remove Production Task</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {deleteError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--jns-gold)' }}>{deleteTarget.title}</strong> from the production pipeline?
              </p>

              <div style={{
                background: '#0b1120',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '100px 1fr',
                rowGap: '6px',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Project:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{deleteTarget.title}</span>

                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span style={{ color: '#93c5fd' }}>{deleteTarget.type}</span>

                <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
                <span style={{ color: 'var(--jns-gold)' }}>{deleteTarget.currentStage.replace(/_/g, ' ')}</span>

                <span style={{ color: 'var(--text-muted)' }}>Producer:</span>
                <span style={{ color: 'var(--text-main)' }}>{getUserName(deleteTarget.producerId)}</span>

                {deleteTarget.editorId && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>Editor:</span>
                    <span style={{ color: 'var(--text-main)' }}>{getUserName(deleteTarget.editorId)}</span>
                  </>
                )}

                <span style={{ color: 'var(--text-muted)' }}>Subtasks:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{deleteTarget.tasks?.length || 0} associated tasks</span>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                padding: '8px 10px',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '6px',
              }}>
                <strong>Notice:</strong> Removing this production task will remove it from the active pipeline and team members' daily task lists. An audit log entry will be saved.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
