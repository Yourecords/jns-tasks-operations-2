'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface BlockedTaskModalProps {
  isOpen: boolean;
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BlockedTaskModal({
  isOpen,
  taskId,
  taskTitle,
  onClose,
  onSuccess,
}: BlockedTaskModalProps) {
  const [reason, setReason] = useState('');
  const [helper, setHelper] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for blocking this task.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'BLOCKED',
          blockedReason: reason,
          blockedHelper: helper,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>Mark Task as Blocked</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
              Task: <strong style={{ color: 'var(--text-main)' }}>{taskTitle}</strong>
            </div>

            {error && (
              <div className="alert-banner alert-banner-danger" style={{ padding: '0.5rem 0.75rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                What is blocking this task? <span className="req">*</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Missing guest camera ISO audio, corrupt card, awaiting script revision..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Who can help resolve this? (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. David (Studio) or Zach (Producer)"
                value={helper}
                onChange={(e) => setHelper(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Marking Blocked...' : 'Confirm Blocked Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
