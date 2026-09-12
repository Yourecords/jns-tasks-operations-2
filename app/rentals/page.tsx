'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Plus, Calendar, DollarSign, CheckCircle2, Eye } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

export default function RentalsPage() {
  const { currentUser, allUsers } = useUser();
  const [rentals, setRentals] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRentals = async () => {
    try {
      const res = await fetch('/api/productions?type=RENTAL');
      const data = await res.json();
      if (data.productions) setRentals(data.productions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
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
            Studio Rentals & External Clients
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Studio bookings, live feeds, transmission, client delivery, and Finance handoff
          </div>
        </div>

        {canCreate && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={15} />
            <span>New Studio Rental</span>
          </button>
        )}
      </div>

      <div className="section-panel">
        <div className="section-panel-body" style={{ padding: 0 }}>
          {rentals.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No studio rentals found.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table" style={{ minWidth: '1080px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '20%', minWidth: '180px' }}>Client & Project</th>
                    <th style={{ width: '15%', minWidth: '150px' }}>Contact Info</th>
                    <th style={{ width: '14%', minWidth: '130px' }}>Session Schedule</th>
                    <th style={{ width: '23%', minWidth: '220px' }}>Studio Setup</th>
                    <th style={{ width: '10%', minWidth: '110px' }}>Agreed Price</th>
                    <th style={{ width: '12%', minWidth: '130px' }}>Current Step</th>
                    <th style={{ width: '8%', minWidth: '90px' }}>Status</th>
                    <th style={{ width: '8%', minWidth: '110px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Link href={`/productions/${r.id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {r.rentalDetails?.clientName || r.title}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {r.rentalDetails?.projectName}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.rentalDetails?.contactName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {r.rentalDetails?.contactInfo}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600 }}>{r.rentalDetails?.recordingDate}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {r.rentalDetails?.recordingTime}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', minWidth: '220px', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.45', padding: '0.85rem 1rem' }}>
                        {r.rentalDetails?.studioSetup}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--jns-gold)', whiteSpace: 'nowrap', padding: '0.85rem 1rem' }}>
                        {r.rentalDetails?.agreedPrice || 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className="status-chip status-in-progress" style={{ fontSize: '10px' }}>
                          {r.currentStage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          className={`status-chip ${
                            r.status === 'COMPLETED' ? 'status-completed' : 'status-not-started'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <Link href={`/productions/${r.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={12} />
                          <span>Rental Ops</span>
                        </Link>
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
        defaultTab="RENTAL"
        onSuccess={() => fetchRentals()}
      />
    </div>
  );
}
