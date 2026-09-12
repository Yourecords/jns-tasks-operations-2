'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  AlertTriangle,
  Play,
  CheckCircle2,
  Filter,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production, ProductionTask } from '@/lib/types';
import BlockedTaskModal from '@/components/BlockedTaskModal';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

export default function MyTasksPage() {
  const { currentUser, allUsers } = useUser();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (Item 18)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'>('TODAY');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Blocked modal
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockTargetTask, setBlockTargetTask] = useState<{ id: string; title: string } | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/productions');
      const data = await res.json();
      if (data.productions) {
        setProductions(data.productions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().split('T')[0];
  const nextWeekStr = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const allAssignedTasks: { task: ProductionTask; production: Production }[] = [];

  productions.forEach((prod) => {
    prod.tasks.forEach((task) => {
      if (currentUser && task.assignedUserId === currentUser.id) {
        allAssignedTasks.push({ task, production: prod });
      }
    });
  });

  const filtered = allAssignedTasks.filter(({ task, production }) => {
    if (typeFilter !== 'ALL' && production.type !== typeFilter) return false;

    switch (activeFilter) {
      case 'TODAY':
        return task.status !== 'COMPLETED' && (!task.dueDate || task.dueDate <= todayStr);
      case 'TOMORROW':
        return task.status !== 'COMPLETED' && task.dueDate === tomorrowStr;
      case 'WEEK':
        return task.status !== 'COMPLETED' && task.dueDate && task.dueDate <= nextWeekStr;
      case 'OVERDUE':
        return task.status !== 'COMPLETED' && task.dueDate && task.dueDate < todayStr;
      case 'IN_PROGRESS':
        return task.status === 'IN_PROGRESS';
      case 'COMPLETED':
        return task.status === 'COMPLETED';
      case 'BLOCKED':
        return task.status === 'BLOCKED';
      case 'ALL':
      default:
        return true;
    }
  });

  const handleQuickStatus = async (taskId: string, newStatus: string, taskTitle: string) => {
    if (newStatus === 'BLOCKED') {
      setBlockTargetTask({ id: taskId, title: taskTitle });
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
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            My Assigned Tasks
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Showing work assigned to <strong>{currentUser?.name}</strong> ({currentUser?.jobFunction})
          </div>
        </div>

        <select
          className="form-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', fontSize: '12px' }}
        >
          <option value="ALL">All Production Types</option>
          <option value="EPISODE">Episodes Only</option>
          <option value="PILOT">Pilots Only</option>
          <option value="RENTAL">Rentals Only</option>
        </select>
      </div>

      {/* Filter Tabs (Item 18) */}
      <div className="filter-bar">
        <button
          className={`filter-tab ${activeFilter === 'TODAY' ? 'active' : ''}`}
          onClick={() => setActiveFilter('TODAY')}
        >
          Today's Tasks
        </button>
        <button
          className={`filter-tab ${activeFilter === 'TOMORROW' ? 'active' : ''}`}
          onClick={() => setActiveFilter('TOMORROW')}
        >
          Tomorrow
        </button>
        <button
          className={`filter-tab ${activeFilter === 'WEEK' ? 'active' : ''}`}
          onClick={() => setActiveFilter('WEEK')}
        >
          This Week
        </button>
        <button
          className={`filter-tab ${activeFilter === 'OVERDUE' ? 'active' : ''}`}
          onClick={() => setActiveFilter('OVERDUE')}
        >
          Overdue
        </button>
        <button
          className={`filter-tab ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          In Progress
        </button>
        <button
          className={`filter-tab ${activeFilter === 'BLOCKED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('BLOCKED')}
        >
          Blocked
        </button>
        <button
          className={`filter-tab ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          Completed
        </button>
        <button
          className={`filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          Show All
        </button>
      </div>

      {/* Tasks Table */}
      <div className="section-panel">
        <div className="section-panel-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks match this filter.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Production / Show</th>
                    <th>Stage</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Quick 1-Click Status Update</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ task, production }) => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {task.title}
                        {task.status === 'BLOCKED' && task.blockedReason && (
                          <div style={{ color: '#fca5a5', fontSize: '11px', marginTop: '2px' }}>
                            <strong>Blocker:</strong> {task.blockedReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <Link href={`/productions/${production.id}`} style={{ color: 'var(--jns-gold)' }}>
                          {production.title}
                        </Link>
                      </td>
                      <td>
                        <span className="status-chip status-not-started" style={{ fontSize: '10px' }}>
                          {task.stageName.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: task.dueDate && task.dueDate < todayStr && task.status !== 'COMPLETED' ? '#ef4444' : 'inherit' }}>
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
                          {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleQuickStatus(task.id, 'IN_PROGRESS', task.title)}
                              title="Start working"
                            >
                              <Play size={12} />
                              <span>Start</span>
                            </button>
                          )}
                          {task.status !== 'COMPLETED' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleQuickStatus(task.id, 'COMPLETED', task.title)}
                              title="Mark task done"
                            >
                              <CheckCircle2 size={12} />
                              <span>Done</span>
                            </button>
                          )}
                          {task.status !== 'BLOCKED' && task.status !== 'COMPLETED' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleQuickStatus(task.id, 'BLOCKED', task.title)}
                              title="Report Blocker"
                            >
                              <AlertTriangle size={12} />
                              <span>Block</span>
                            </button>
                          )}
                          <WhatsAppShareButton
                            itemTitle={`${production.title}: ${task.title}`}
                            stageOrAction={`status is ${task.status.replace(/_/g, ' ')}${task.status === 'BLOCKED' && task.blockedReason ? ` (Blocked: ${task.blockedReason})` : ''}`}
                            size="xs"
                            variant="icon-only"
                          />
                          <Link href={`/productions/${production.id}`} className="btn btn-secondary btn-sm" title="View episode">
                            <ChevronRight size={13} />
                          </Link>
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

      {blockTargetTask && (
        <BlockedTaskModal
          isOpen={blockedModalOpen}
          taskId={blockTargetTask.id}
          taskTitle={blockTargetTask.title}
          onClose={() => {
            setBlockedModalOpen(false);
            setBlockTargetTask(null);
          }}
          onSuccess={() => fetchTasks()}
        />
      )}
    </div>
  );
}
