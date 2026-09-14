'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Film,
  Compass,
  Building2,
  Calendar,
  ChevronRight,
  UserCheck,
  CheckSquare,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Pencil
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production, ProductionTask } from '@/lib/types';
import BlockedTaskModal from '@/components/BlockedTaskModal';
import UpdateScheduleModal from '@/components/UpdateScheduleModal';

export default function DashboardPage() {
  const { currentUser, allUsers, settings } = useUser();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  // Blocked task modal state
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [selectedTaskForBlock, setSelectedTaskForBlock] = useState<{ id: string; title: string } | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/productions');
      const data = await res.json();
      if (data.productions) {
        setProductions(data.productions);
      }
    } catch (err) {
      console.error('Error fetching dashboard productions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (typeof window !== 'undefined' && window.location.search.includes('modal=schedule')) {
      setScheduleModalOpen(true);
    }
    if (typeof window !== 'undefined') {
      const matchScroll = window.location.search.match(/scrollY=(\d+)/);
      if (matchScroll) {
        setTimeout(() => {
          const wrapper = document.querySelector('.main-wrapper');
          if (wrapper) wrapper.scrollTo({ top: parseInt(matchScroll[1]) });
        }, 150);
      }
    }
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper to get user name
  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return allUsers.find((u) => u.id === id)?.name || id;
  };

  // 1. My Tasks Today
  const myTasks: { task: ProductionTask; production: Production }[] = [];
  // 2. Overdue Tasks
  const overdueTasks: { task: ProductionTask; production: Production }[] = [];
  // 3. Blocked Tasks
  const blockedTasks: { task: ProductionTask; production: Production }[] = [];
  // 4. Waiting for Review or Final Approval
  const waitingApprovalProds: Production[] = [];
  // 5. In Progress Productions
  const inProgressProds: Production[] = [];
  // 6. Upcoming Filming
  const upcomingFilming: Production[] = [];
  // 7. Recently Completed
  const recentlyCompleted: Production[] = [];

  productions.forEach((prod) => {
    if (prod.status === 'ACTIVE') {
      inProgressProds.push(prod);

      if (prod.currentStage === 'PRODUCER_REVIEW' || prod.currentStage === 'FINAL_APPROVAL') {
        waitingApprovalProds.push(prod);
      }

      if (prod.filmingDate && prod.filmingDate >= todayStr && prod.currentStage === 'FILMING') {
        upcomingFilming.push(prod);
      }

      prod.tasks.forEach((task) => {
        if (task.status !== 'COMPLETED') {
          // My Tasks
          if (currentUser && task.assignedUserId === currentUser.id) {
            myTasks.push({ task, production: prod });
          }
          // Overdue
          if (task.dueDate && task.dueDate < todayStr) {
            overdueTasks.push({ task, production: prod });
          }
          // Blocked
          if (task.status === 'BLOCKED') {
            blockedTasks.push({ task, production: prod });
          }
        }
      });
    } else if (prod.status === 'COMPLETED') {
      recentlyCompleted.push(prod);
    }
  });

  // Fast 1-click status updater for task
  const handleQuickStatusChange = async (taskId: string, newStatus: string, taskTitle: string) => {
    if (newStatus === 'BLOCKED') {
      setSelectedTaskForBlock({ id: taskId, title: taskTitle });
      setBlockedModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div>
      {/* Morning Orientation Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Production Morning Operations
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Daily live operations status for JNS Video Production • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged in as:</span>
          <span className="status-chip status-approved" style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.name} ({currentUser?.positionDisplay || currentUser?.role})
          </span>
        </div>
      </div>

      {/* 5-Second Morning Pulse Metrics */}
      <div className="metrics-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Active In Pipeline</span>
            <Film size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{inProgressProds.length}</div>
          <div className="metric-subtitle">Productions in progress</div>
        </div>

        <div className="metric-card alert-border">
          <div className="metric-header">
            <span className="metric-title">Overdue Tasks</span>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div className="metric-value" style={{ color: overdueTasks.length > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {overdueTasks.length}
          </div>
          <div className="metric-subtitle">{overdueTasks.length > 0 ? 'Requires immediate resolution' : 'All deadlines on track'}</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #be185d' }}>
          <div className="metric-header">
            <span className="metric-title">Blocked Tasks</span>
            <ShieldAlert size={16} color="#f472b6" />
          </div>
          <div className="metric-value" style={{ color: blockedTasks.length > 0 ? '#f472b6' : 'var(--text-main)' }}>
            {blockedTasks.length}
          </div>
          <div className="metric-subtitle">{blockedTasks.length > 0 ? 'Production blockers reported' : 'No active blockers'}</div>
        </div>

        <div className="metric-card blue-border">
          <div className="metric-header">
            <span className="metric-title">Waiting Approval</span>
            <Clock size={16} color="var(--jns-blue)" />
          </div>
          <div className="metric-value">{waitingApprovalProds.length}</div>
          <div className="metric-subtitle">Producer reviews / Final signs</div>
        </div>
      </div>

      {/* Overdue Warning Callout (if any) */}
      {overdueTasks.length > 0 && (
        <div className="alert-banner alert-banner-danger">
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <strong className="alert-banner-title" style={{ display: 'block', marginBottom: '2px' }}>
              Attention: {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''} Detected
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
              {overdueTasks.map(({ task, production }) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '12px' }}>
                  <span>
                    • <strong>{production.title}</strong>: {task.title} (Assigned to {getUserName(task.assignedUserId)})
                  </span>
                  <Link href={`/productions/${production.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '11px', flexShrink: 0 }}>
                    Open Production →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blocked Tasks Banner (Item 16 requirement) */}
      {blockedTasks.length > 0 && (
        <div className="alert-banner alert-banner-danger" style={{ border: '1px solid #dc2626' }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong className="alert-banner-title" style={{ display: 'block', marginBottom: '2px' }}>
              Active Blockers ({blockedTasks.length})
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
              {blockedTasks.map(({ task, production }) => (
                <div key={task.id} style={{ backgroundColor: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #7f1d1d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                      {production.title} — {task.title}
                    </span>
                    <Link href={`/productions/${production.id}`} style={{ fontSize: '11px', color: 'var(--jns-gold)' }}>
                      Resolve in Production →
                    </Link>
                  </div>
                  <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '4px' }}>
                    <strong>Blocker:</strong> {task.blockedReason}
                  </div>
                  {task.blockedHelper && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      <strong>Who can help:</strong> {task.blockedHelper}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: MY TASKS TODAY (with 1-2 click updates) */}
      <div className="section-panel">
        <div className="section-panel-header">
          <div className="section-panel-title">
            <CheckSquare size={17} color="var(--jns-gold)" />
            <span>My Tasks Today</span>
            <span className="status-chip status-in-progress" style={{ marginLeft: '0.5rem' }}>
              {myTasks.length} Assigned
            </span>
          </div>
          <Link href="/my-tasks" className="btn btn-secondary btn-sm">
            View All My Tasks →
          </Link>
        </div>

        <div className="section-panel-body" style={{ padding: 0 }}>
          {myTasks.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No open tasks currently assigned to you. You are all caught up!
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Production / Show</th>
                    <th>Task</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right' }}>Quick Update (1-Click)</th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map(({ task, production }) => (
                    <tr key={task.id}>
                      <td>
                        <Link href={`/productions/${production.id}`} style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {production.title}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Stage: {production.currentStage.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{task.title}</td>
                      <td>
                        <span style={{ color: task.dueDate && task.dueDate < todayStr ? '#ef4444' : 'var(--text-light)' }}>
                          {task.dueDate || 'Today'}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-chip ${
                            task.status === 'IN_PROGRESS'
                              ? 'status-in-progress'
                              : task.status === 'BLOCKED'
                              ? 'status-blocked'
                              : task.status === 'COMPLETED'
                              ? 'status-completed'
                              : 'status-not-started'
                          }`}
                        >
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {task.status !== 'IN_PROGRESS' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleQuickStatusChange(task.id, 'IN_PROGRESS', task.title)}
                              title="Set In Progress"
                            >
                              <Play size={12} fill="var(--text-muted)" />
                              <span>Start</span>
                            </button>
                          )}
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleQuickStatusChange(task.id, 'COMPLETED', task.title)}
                            title="Mark Completed"
                          >
                            <CheckCircle2 size={12} />
                            <span>Done</span>
                          </button>
                          {task.status !== 'BLOCKED' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleQuickStatusChange(task.id, 'BLOCKED', task.title)}
                              title="Flag as Blocked"
                            >
                              <AlertTriangle size={12} />
                              <span>Block</span>
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

      {/* 2-Column Section: WAITING FOR APPROVAL & UPCOMING FILMING */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* WAITING FOR APPROVAL (Item 5) */}
        <div className="section-panel" style={{ marginBottom: 0 }}>
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Clock size={16} color="#c4b5fd" />
              <span>Waiting For Review & Approval</span>
            </div>
            <span className="status-chip status-waiting">{waitingApprovalProds.length} Pending</span>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            {waitingApprovalProds.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No drafts awaiting review or final approval.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {waitingApprovalProds.map((prod) => (
                  <div
                    key={prod.id}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                        {prod.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Stage: <strong style={{ color: 'var(--jns-gold)' }}>{prod.currentStage.replace(/_/g, ' ')}</strong> • Editor: {getUserName(prod.editorId)}
                      </div>
                    </div>
                    <Link href={`/productions/${prod.id}`} className="btn btn-primary btn-sm">
                      Review & Approve →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING FILMING (Item 5) */}
        <div className="section-panel" style={{ marginBottom: 0 }}>
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Calendar size={16} color="var(--jns-gold)" />
              <span>Filming Schedule</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {(currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'var(--transition)'
                  }}
                  title="Update Schedule URL (Producer / Admin)"
                >
                  <Pencil size={11} color="var(--jns-gold)" />
                  <span>Edit Link</span>
                </button>
              )}
              <a
                href={settings?.scheduleUrl || 'https://calendar.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--jns-gold)', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Full Calendar <ExternalLink size={11} />
              </a>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            {upcomingFilming.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No filming shoots scheduled for today or tomorrow.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcomingFilming.map((prod) => (
                  <div
                    key={prod.id}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                        {prod.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Filming: <strong>{prod.filmingDate === todayStr ? 'TODAY' : prod.filmingDate}{prod.filmingTime ? ` @ ${prod.filmingTime}` : ''}</strong> • Producer: {getUserName(prod.producerId)}
                      </div>
                    </div>
                    <Link href={`/productions/${prod.id}`} className="btn btn-secondary btn-sm">
                      Open Shoot Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: IN PROGRESS ACTIVE PRODUCTIONS PIPELINE */}
      <div className="section-panel">
        <div className="section-panel-header">
          <div className="section-panel-title">
            <Film size={17} color="var(--jns-blue)" />
            <span>Active Productions in Progress</span>
          </div>
          <Link href="/productions" className="btn btn-secondary btn-sm">
            View All Productions ({productions.length}) →
          </Link>
        </div>

        <div className="section-panel-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Production</th>
                  <th>Type</th>
                  <th>Current Stage</th>
                  <th>Responsible Personnel</th>
                  <th>Deadlines</th>
                  <th>Priority</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inProgressProds.map((prod) => (
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
                      <span className="status-chip status-not-started">
                        {prod.type}
                      </span>
                    </td>
                    <td>
                      <span className="status-chip status-in-progress">
                        {prod.currentStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div><strong>Prod:</strong> {getUserName(prod.producerId)}</div>
                        {prod.editorId && <div><strong>Edit:</strong> {getUserName(prod.editorId)}</div>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        <div>Film: {prod.filmingDate || 'N/A'}{prod.filmingTime ? ` @ ${prod.filmingTime}` : ''}</div>
                        {prod.publicationDeadline && <div>Pub: {prod.publicationDeadline}</div>}
                      </div>
                    </td>
                    <td>
                      <span className={`priority-pill priority-${prod.priority.toLowerCase()}`}>
                        {prod.priority}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/productions/${prod.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={12} />
                        <span>Workflow</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: RECENTLY COMPLETED / PUBLISHED (Item 5) */}
      {recentlyCompleted.length > 0 && (
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <CheckCircle2 size={16} color="#86efac" />
              <span>Recently Published & Completed Productions</span>
            </div>
            <Link href="/archive" className="btn btn-secondary btn-sm">
              Search Archive →
            </Link>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '0.75rem' }}>
              {recentlyCompleted.slice(0, 4).map((prod) => (
                <div
                  key={prod.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                      {prod.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Completed on {new Date(prod.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {prod.youtubeUrl && (
                      <a
                        href={prod.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Watch on YouTube"
                      >
                        YouTube ↗
                      </a>
                    )}
                    <Link href={`/productions/${prod.id}`} className="btn btn-secondary btn-sm">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Blocked Task Modal */}
      {selectedTaskForBlock && (
        <BlockedTaskModal
          isOpen={blockedModalOpen}
          taskId={selectedTaskForBlock.id}
          taskTitle={selectedTaskForBlock.title}
          onClose={() => {
            setBlockedModalOpen(false);
            setSelectedTaskForBlock(null);
          }}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}

      {/* Update Schedule Modal for Producer & Admin */}
      <UpdateScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </div>
  );
}
