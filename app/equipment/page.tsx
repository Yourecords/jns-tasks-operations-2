'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Plus, ExternalLink, ShieldCheck, Check, DollarSign } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { EquipmentRequest, EquipmentStatus } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

export default function EquipmentPage() {
  const { currentUser } = useUser();
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      if (data.equipmentRequests) setRequests(data.equipmentRequests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('modal') === 'equipment') {
        setModalOpen(true);
      }
    }
  }, []);

  const isProducerOrAdmin = currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  const handleUpdateStatus = async (id: string, status: EquipmentStatus) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchEquipment();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Equipment & Studio Hardware Requests
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Operational gear requisition, approval pipeline, and tracking
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={15} />
          <span>Request Equipment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <button
          className={`filter-tab ${filterStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterStatus('ALL')}
        >
          All Requests ({requests.length})
        </button>
        <button
          className={`filter-tab ${filterStatus === 'REQUESTED' ? 'active' : ''}`}
          onClick={() => setFilterStatus('REQUESTED')}
        >
          Requested
        </button>
        <button
          className={`filter-tab ${filterStatus === 'UNDER_REVIEW' ? 'active' : ''}`}
          onClick={() => setFilterStatus('UNDER_REVIEW')}
        >
          Under Review
        </button>
        <button
          className={`filter-tab ${filterStatus === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setFilterStatus('APPROVED')}
        >
          Approved
        </button>
        <button
          className={`filter-tab ${filterStatus === 'ORDERED' ? 'active' : ''}`}
          onClick={() => setFilterStatus('ORDERED')}
        >
          Ordered
        </button>
        <button
          className={`filter-tab ${filterStatus === 'RECEIVED' ? 'active' : ''}`}
          onClick={() => setFilterStatus('RECEIVED')}
        >
          Received
        </button>
      </div>

      <div className="section-panel">
        <div className="section-panel-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No equipment requests found for this filter.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table" style={{ minWidth: '1120px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%', minWidth: '200px' }}>Item Name & Product Links</th>
                    <th style={{ width: '10%', minWidth: '100px' }}>Category</th>
                    <th style={{ width: '26%', minWidth: '250px' }}>Why Needed</th>
                    <th style={{ width: '10%', minWidth: '110px' }}>Qty / Est. Price</th>
                    <th style={{ width: '8%', minWidth: '85px' }}>Urgency</th>
                    <th style={{ width: '11%', minWidth: '110px' }}>Requested By</th>
                    <th style={{ width: '9%', minWidth: '95px' }}>Status</th>
                    {isProducerOrAdmin && <th style={{ width: '12%', minWidth: '120px', textAlign: 'right' }}>Admin Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req) => (
                    <tr key={req.id}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{req.itemName}</div>
                        {req.productUrl && (
                          <div style={{ marginTop: '2px' }}>
                            <a
                              href={req.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '11px', color: 'var(--jns-blue)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            >
                              Product Link <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className="status-chip status-not-started" style={{ fontSize: '10px' }}>
                          {req.category}
                        </span>
                      </td>
                      <td style={{ minWidth: '250px', maxWidth: '340px', fontSize: '12px', color: 'var(--text-light)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.45', padding: '0.85rem 1rem' }}>
                        {req.whyNeeded}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', minWidth: '125px', padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '12px' }}>
                          <div>Qty: <strong>{req.quantity}</strong></div>
                          {req.estimatedPrice && <div style={{ color: 'var(--jns-gold)', fontWeight: 600 }}>{req.estimatedPrice}</div>}
                          {req.purchaseType && (
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                              {req.purchaseType}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.85rem 1rem' }}>
                        <span className={`priority-pill priority-${req.urgency.toLowerCase()}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{req.requestedByName}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', padding: '0.85rem 1rem' }}>
                        <span
                          className={`status-chip ${
                            req.status === 'APPROVED' || req.status === 'RECEIVED'
                              ? 'status-approved'
                              : req.status === 'REJECTED'
                              ? 'status-blocked'
                              : req.status === 'ORDERED'
                              ? 'status-in-progress'
                              : 'status-waiting'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      {isProducerOrAdmin && (
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '0.85rem 1rem' }}>
                          <select
                            className="form-select"
                            value={req.status}
                            onChange={(e) => handleUpdateStatus(req.id, e.target.value as EquipmentStatus)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
                          >
                            <option value="REQUESTED">Requested</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="APPROVED">Approved</option>
                            <option value="ORDERED">Ordered</option>
                            <option value="RECEIVED">Received</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DEFERRED">Deferred</option>
                          </select>
                        </td>
                      )}
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
        defaultTab="EQUIPMENT"
        onSuccess={() => fetchEquipment()}
      />
    </div>
  );
}
