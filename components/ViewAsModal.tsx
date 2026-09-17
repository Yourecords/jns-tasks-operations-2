'use client';

import React, { useState } from 'react';
import { Eye, X, Search, ShieldCheck, Check, UserCheck, ArrowLeft } from 'lucide-react';
import { useUser } from './UserContext';
import { User } from '@/lib/types';

interface ViewAsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewAsModal({ isOpen, onClose }: ViewAsModalProps) {
  const { currentUser, realUser, allUsers, isImpersonating, switchUser, exitImpersonation } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRODUCER' | 'EDITOR' | 'STUDIO' | 'DESIGNER'>('ALL');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = async (user: User) => {
    setSwitchingId(user.id);
    try {
      if (realUser && user.id === realUser.id) {
        await exitImpersonation();
      } else {
        await switchUser(user.id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to view as user', err);
      setSwitchingId(null);
    }
  };

  const handleResetToAdmin = async () => {
    setSwitchingId('RESET');
    try {
      await exitImpersonation();
      onClose();
    } catch (err) {
      console.error('Failed to reset to admin', err);
      setSwitchingId(null);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (u.isActive === false) return false;

    // Search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(search) ||
      (u.fullName && u.fullName.toLowerCase().includes(search)) ||
      u.email.toLowerCase().includes(search) ||
      (u.positionDisplay && u.positionDisplay.toLowerCase().includes(search));

    if (!matchesSearch) return false;

    // Role filter
    if (roleFilter === 'PRODUCER') {
      return u.role === 'PRODUCER' || u.jobFunction === 'PRODUCER';
    }
    if (roleFilter === 'EDITOR') {
      return u.jobFunction === 'VIDEO_EDITOR';
    }
    if (roleFilter === 'STUDIO') {
      return u.jobFunction === 'STUDIO_OPERATOR' || u.jobFunction === 'CAMERAMAN';
    }
    if (roleFilter === 'DESIGNER') {
      return u.jobFunction === 'MOTION_GRAPHICS_DESIGNER' || u.jobFunction === 'GRAPHIC_DESIGNER';
    }

    return true;
  });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
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
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--jns-gold)',
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                View Site As Team Member
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Simulate the exact dashboard, tasks, and permissions of any team member
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current status bar if already viewing as someone */}
        {isImpersonating && realUser && (
          <div
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--text-light)' }}>
              Currently viewing as: <strong style={{ color: 'var(--jns-gold)' }}>{currentUser?.name}</strong>
            </span>
            <button
              type="button"
              onClick={handleResetToAdmin}
              disabled={switchingId !== null}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-main)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={11} />
              <span>Back to Admin View</span>
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search team member by name, role, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12.5px' }}
              autoFocus
            />
          </div>

          {/* Quick role filter pills */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {(
              [
                { key: 'ALL', label: 'All Users' },
                { key: 'PRODUCER', label: 'Producers' },
                { key: 'EDITOR', label: 'Video Editors' },
                { key: 'STUDIO', label: 'Studio Ops' },
                { key: 'DESIGNER', label: 'Designers' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setRoleFilter(filter.key)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: roleFilter === filter.key ? '1px solid var(--jns-gold)' : '1px solid var(--border-subtle)',
                  backgroundColor: roleFilter === filter.key ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
                  color: roleFilter === filter.key ? 'var(--jns-gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No team members match &quot;{searchTerm}&quot;
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = currentUser?.id === user.id;
              const isRealAdmin = realUser?.id === user.id;
              const isSwitching = switchingId === user.id;

              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.12)' : 'var(--bg-card-subtle)',
                    border: isSelected ? '1px solid var(--jns-gold)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-subtle)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      className="user-avatar"
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '13px',
                        backgroundColor: isRealAdmin ? 'var(--jns-blue)' : undefined,
                      }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                          {user.name}
                        </span>
                        {isRealAdmin && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(37, 99, 235, 0.2)',
                              color: '#38bdf8',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            MAIN ADMIN
                          </span>
                        )}
                        {isSelected && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(229, 169, 60, 0.2)',
                              color: 'var(--jns-gold)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Check size={10} /> CURRENT PERSPECTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {user.positionDisplay || user.role} • {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSwitching}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--jns-gold)' : '1px solid var(--border-medium)',
                      backgroundColor: isSelected ? 'var(--jns-gold)' : 'transparent',
                      color: isSelected ? '#000000' : 'var(--text-light)',
                    }}
                  >
                    {isSwitching ? 'Switching...' : isSelected ? 'Viewing' : 'View As →'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
          }}
        >
          <span>Safe mode: You can exit back to Admin at any time.</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
