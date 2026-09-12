'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Archive, Search, Film, Compass, Building2, Users, Wrench, Lightbulb, ExternalLink } from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production } from '@/lib/types';

export default function ArchivePage() {
  const { allUsers } = useUser();
  const [completedProductions, setCompletedProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/productions?status=COMPLETED')
      .then((r) => r.json())
      .then((data) => {
        if (data.productions) setCompletedProductions(data.productions);
      })
      .finally(() => setLoading(false));
  }, []);

  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return allUsers.find((u) => u.id === id)?.name || id;
  };

  const filtered = completedProductions.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.rentalDetails?.clientName.toLowerCase().includes(q) ||
      p.episodeNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Historical Production Archive
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Searchable permanent repository of completed shows, published episodes, and finished studio rentals
        </div>
      </div>

      {/* Search Filter */}
      <div style={{ marginBottom: '1.25rem', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search completed archive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', backgroundColor: 'transparent', padding: 0 }}
          />
        </div>
      </div>

      <div className="section-panel">
        <div className="section-panel-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No completed productions found in archive.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title & Project</th>
                    <th>Type</th>
                    <th>Published / Completed Date</th>
                    <th>Producer</th>
                    <th>Editor</th>
                    <th>Delivery Assets</th>
                    <th style={{ textAlign: 'right' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        <Link href={`/productions/${prod.id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {prod.title}
                        </Link>
                        {prod.rentalDetails && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Client: {prod.rentalDetails.clientName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="status-chip status-completed" style={{ fontSize: '10px' }}>
                          {prod.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                          {prod.publishedAt
                            ? new Date(prod.publishedAt).toLocaleDateString()
                            : new Date(prod.updatedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>{getUserName(prod.producerId)}</td>
                      <td>{getUserName(prod.editorId)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {prod.youtubeUrl && (
                            <a
                              href={prod.youtubeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.45rem', fontSize: '11px' }}
                            >
                              YouTube ↗
                            </a>
                          )}
                          {prod.dropboxUrl && (
                            <a
                              href={prod.dropboxUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.45rem', fontSize: '11px' }}
                            >
                              Dropbox ↗
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/productions/${prod.id}`} className="btn btn-secondary btn-sm">
                          View History
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
    </div>
  );
}
