'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, Film, Compass, Building2, Users, Wrench, Lightbulb, Sparkles, CheckSquare } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    productions: any[];
    meetings: any[];
    equipment: any[];
    improvements: any[];
    ideas: any[];
    shows: any[];
  }>({
    productions: [],
    meetings: [],
    equipment: [],
    improvements: [],
    ideas: [],
    shows: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ productions: [], meetings: [], equipment: [], improvements: [], ideas: [], shows: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via parent
          const btn = document.querySelector('.global-search-trigger') as HTMLButtonElement;
          btn?.click();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ productions: [], meetings: [], equipment: [], improvements: [], ideas: [], shows: [] });
      return;
    }

    const q = query.toLowerCase();
    setLoading(true);

    const performSearch = async () => {
      try {
        const [prodsRes, mtgRes, eqRes, impRes, ideasRes, showsRes] = await Promise.all([
          fetch('/api/productions'),
          fetch('/api/meetings'),
          fetch('/api/equipment'),
          fetch('/api/improvements'),
          fetch('/api/show-ideas'),
          fetch('/api/shows'),
        ]);

        const [prods, mtgs, eq, imp, ideas, shows] = await Promise.all([
          prodsRes.json(),
          mtgRes.json(),
          eqRes.json(),
          impRes.json(),
          ideasRes.json(),
          showsRes.json(),
        ]);

        setResults({
          productions: (prods.productions || []).filter(
            (p: any) =>
              p.title.toLowerCase().includes(q) ||
              (p.rentalDetails?.clientName && p.rentalDetails.clientName.toLowerCase().includes(q)) ||
              p.tasks?.some((t: any) => t.title.toLowerCase().includes(q))
          ),
          meetings: (mtgs.meetings || []).filter(
            (m: any) =>
              m.title.toLowerCase().includes(q) ||
              m.summary.toLowerCase().includes(q) ||
              m.topicsDiscussed?.toLowerCase().includes(q)
          ),
          equipment: (eq.equipmentRequests || []).filter(
            (e: any) =>
              e.itemName.toLowerCase().includes(q) ||
              e.category.toLowerCase().includes(q) ||
              e.whyNeeded.toLowerCase().includes(q)
          ),
          improvements: (imp.improvements || []).filter(
            (i: any) =>
              i.title.toLowerCase().includes(q) ||
              i.currentSituation.toLowerCase().includes(q) ||
              i.suggestedImprovement.toLowerCase().includes(q)
          ),
          ideas: (ideas.showIdeas || []).filter(
            (id: any) =>
              id.showName.toLowerCase().includes(q) ||
              id.concept.toLowerCase().includes(q)
          ),
          shows: (shows.shows || []).filter(
            (s: any) =>
              s.name.toLowerCase().includes(q) ||
              s.hosts.toLowerCase().includes(q)
          ),
        });
      } catch (err) {
        console.error('Universal search error', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(performSearch, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const hasAnyResults =
    results.productions.length > 0 ||
    results.meetings.length > 0 ||
    results.equipment.length > 0 ||
    results.improvements.length > 0 ||
    results.ideas.length > 0 ||
    results.shows.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', gap: '0.75rem' }}>
          <img
            src="/jns-logo-red.png"
            alt="JNS"
            style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
          />
          <Search size={18} color="var(--jns-gold)" />
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            style={{ flex: 1, border: 'none', backgroundColor: 'transparent', fontSize: '15px' }}
            placeholder="Search across all shows, episodes, pilots, rentals, meetings, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          )}
          <span className="kbd-shortcut">ESC</span>
        </div>

        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              Searching operations records...
            </div>
          )}

          {!loading && query.length >= 2 && !hasAnyResults && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No matching records found for "{query}".
            </div>
          )}

          {!loading && query.length < 2 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '1.5rem' }}>
              Type at least 2 characters to search across JNS Video Production.
            </div>
          )}

          {!loading && hasAnyResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Shows */}
              {results.shows.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jns-gold)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Shows ({results.shows.length})
                  </div>
                  {results.shows.map((s) => (
                    <Link
                      key={s.id}
                      href={`/productions?showId=${s.id}`}
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Film size={14} color="var(--jns-gold)" />
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• Hosts: {s.hosts}</span>
                      </div>
                      <span className="status-chip status-approved">{s.status}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Productions / Episodes */}
              {results.productions.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jns-blue)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Productions & Episodes ({results.productions.length})
                  </div>
                  {results.productions.map((p) => (
                    <Link
                      key={p.id}
                      href={`/productions/${p.id}`}
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {p.type === 'PILOT' ? (
                          <Compass size={14} color="#f59e0b" />
                        ) : p.type === 'RENTAL' ? (
                          <Building2 size={14} color="#38bdf8" />
                        ) : (
                          <Film size={14} color="var(--jns-gold)" />
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="status-chip status-in-progress" style={{ fontSize: '10px' }}>
                          {p.currentStage.replace(/_/g, ' ')}
                        </span>
                        <span className={`priority-pill priority-${p.priority.toLowerCase()}`}>
                          {p.priority}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Meetings */}
              {results.meetings.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#86efac', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Meetings ({results.meetings.length})
                  </div>
                  {results.meetings.map((m) => (
                    <Link
                      key={m.id}
                      href="/meetings"
                      onClick={onClose}
                      style={{
                        display: 'block',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {m.date} • {m.participants}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Equipment */}
              {results.equipment.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Equipment Requests ({results.equipment.length})
                  </div>
                  {results.equipment.map((e) => (
                    <Link
                      key={e.id}
                      href="/equipment"
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card-subtle)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{e.itemName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {e.category} • Requested by {e.requestedByName}
                        </div>
                      </div>
                      <span className="status-chip status-waiting">{e.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
