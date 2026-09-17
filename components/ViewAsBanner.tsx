'use client';

import React, { useState } from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import { useUser } from './UserContext';

export default function ViewAsBanner({ onOpenSelector }: { onOpenSelector?: () => void }) {
  const { currentUser, realUser, isImpersonating, exitImpersonation } = useUser();
  const [exiting, setExiting] = useState(false);

  if (!isImpersonating || !currentUser) {
    return null;
  }

  const handleExit = async () => {
    setExiting(true);
    try {
      await exitImpersonation();
    } catch (err) {
      console.error('Failed to exit view-as mode', err);
      setExiting(false);
    }
  };

  return (
    <aside
      aria-label="View-As Persona Notification"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        backgroundColor: '#78350f',
        background: 'linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%)',
        color: '#fef3c7',
        borderBottom: '2px solid #f59e0b',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
        padding: '0.45rem 1rem',
        fontSize: '12.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(245, 158, 11, 0.25)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fbbf24',
          }}
        >
          <Eye size={13} />
          <span>VIEW-AS MODE</span>
        </span>

        <span style={{ color: '#fef3c7' }}>
          You are viewing JNS Operations as{' '}
          <strong style={{ color: '#ffffff', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            {currentUser.name}
          </strong>{' '}
          <span style={{ opacity: 0.9 }}>({currentUser.positionDisplay || currentUser.role})</span>
        </span>

        {realUser && (
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(254, 243, 199, 0.75)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            • Admin: {realUser.name}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {onOpenSelector && (
          <button
            type="button"
            onClick={onOpenSelector}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              color: '#fef3c7',
              border: '1px solid rgba(254, 243, 199, 0.3)',
              borderRadius: '4px',
              padding: '3px 9px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={12} />
            <span>Switch User</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleExit}
          disabled={exiting}
          style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '4px',
            padding: '4px 12px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: exiting ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={13} />
          <span>{exiting ? 'Exiting...' : 'Exit View-As (Back to Admin)'}</span>
        </button>
      </div>
    </aside>
  );
}
