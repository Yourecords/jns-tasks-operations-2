'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Plus,
  Clock,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Film,
  Search,
  Filter,
  Trash2,
  ArrowRight,
  FolderGit2,
  Check,
  ChevronRight,
  FileText,
  Calendar,
  User,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import {
  GraphicDesignTask,
  GraphicSubtask,
  GraphicSubtaskStatus,
  GraphicTaskStatus,
} from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

const SUBTASK_STAGES: { key: GraphicSubtaskStatus; label: string; color: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started', color: 'var(--text-muted)' },
  { key: 'CONCEPT', label: 'Concept', color: '#38bdf8' },
  { key: 'DESIGN', label: 'Design', color: '#a855f7' },
  { key: 'ANIMATION', label: 'Animation', color: '#ec4899' },
  { key: 'IMPLEMENTATION', label: 'Implementation', color: '#eab308' },
  { key: 'FINALIZING', label: 'Finalizing', color: '#f97316' },
  { key: 'AUDIO', label: 'Audio', color: '#06b6d4' },
  { key: 'DONE', label: 'Done', color: '#22c55e' },
];

export default function GraphicsHubPage() {
  const { currentUser, allUsers } = useUser();
  const [tasks, setTasks] = useState<GraphicDesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'IMMEDIATE' | 'LONG_TERM'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] = useState<GraphicSubtaskStatus>('NOT_STARTED');

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/graphics');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load graphics tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (taskId: string, newStatus: GraphicTaskStatus) => {
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSubtaskStatus = async (
    taskId: string,
    subtaskId: string,
    newSubStatus: GraphicSubtaskStatus
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId
        ? {
            ...st,
            status: newSubStatus,
            completedAt: newSubStatus === 'DONE' ? new Date().toISOString() : undefined,
          }
        : st
    );

    // If all subtasks are DONE, auto-mark task as READY_FOR_REVIEW or COMPLETED
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.status === 'DONE');
    const autoTaskStatus = allDone ? 'READY_FOR_REVIEW' : task.status;

    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtasks: updatedSubtasks,
          status: autoTaskStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    if (!newSubtaskTitle.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSub: GraphicSubtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      status: newSubtaskStatus,
      assignedUserId: task.assignedUserId,
      createdAt: new Date().toISOString(),
    };

    const updatedSubtasks = [...task.subtasks, newSub];

    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setAddingSubtaskTaskId(null);
        setNewSubtaskTitle('');
        setNewSubtaskStatus('NOT_STARTED');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this graphics task?')) return;
    try {
      const res = await fetch(`/api/graphics/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t).filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getUserDisplayName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const u = allUsers.find((user) => user.id === userId);
    return u?.fullName || u?.name || userId;
  };

  // Metrics
  const immediateTasks = tasks.filter((t) => t.type === 'IMMEDIATE');
  const longTermTasks = tasks.filter((t) => t.type === 'LONG_TERM');
  const activeImmediate = immediateTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const activeLongTerm = longTermTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  // Filtered list
  const filteredTasks = tasks.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchProject = (t.projectName || '').toLowerCase().includes(q);
      const matchShow = (t.showName || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchDesigner = (t.assignedUserName || getUserDisplayName(t.assignedUserId)).toLowerCase().includes(q);
      if (!matchTitle && !matchProject && !matchShow && !matchDesc && !matchDesigner) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(218, 165, 32, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--jns-gold)',
                border: '1px solid rgba(218, 165, 32, 0.25)',
              }}
            >
              <Palette size={20} />
            </div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Graphic Design Operations
            </h1>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage immediate show requests with timings and long-term graphics projects across all 8 lifecycle stages
          </div>
        </div>

        {/* Create Graphic Request / Project button */}
        <button
          className="btn btn-primary"
          onClick={() => setQuickActionOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(218, 165, 32, 0.2)',
          }}
        >
          <Plus size={16} />
          <span>Create New Graphics</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Tasks
            </span>
            <Palette size={16} color="var(--jns-gold)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {activeImmediate.length + activeLongTerm.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeImmediate.length} immediate • {activeLongTerm.length} long-term
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Immediate Requests
            </span>
            <Sparkles size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {activeImmediate.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Show lower thirds, maps, quote cards
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              8-Stage Projects
            </span>
            <Layers size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
            {activeLongTerm.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Channel packaging, studio video walls
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Completed Deliverables
            </span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Delivered to editors & control room
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="section-panel"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* View Type Tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card-subtle)', padding: '3px', borderRadius: '6px' }}>
            <button
              className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => setFilterType('ALL')}
            >
              All ({tasks.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === 'IMMEDIATE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => setFilterType('IMMEDIATE')}
            >
              Immediate ({immediateTasks.length})
            </button>
            <button
              className={`btn btn-sm ${filterType === 'LONG_TERM' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => setFilterType('LONG_TERM')}
            >
              Long-Term Projects ({longTermTasks.length})
            </button>
          </div>

          {/* Status Filter */}
          <select
            className="form-select"
            style={{ fontSize: '12px', padding: '5px 10px', height: '32px', width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY_FOR_REVIEW">Ready for Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '360px' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px', fontSize: '12.5px', height: '32px' }}
            placeholder="Search graphics, shows, subtasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading graphic design operations...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className="section-panel"
          style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          <Palette size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>
            No graphic design tasks found
          </div>
          <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '400px', margin: '4px auto 1rem' }}>
            Click below to create an immediate request for a show or start a new long-term graphics package.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setQuickActionOpen(true)}>
            <Plus size={14} />
            <span>Create New Graphics</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTasks.map((task) => {
            const isLongTerm = task.type === 'LONG_TERM';
            const completedSubtasks = task.subtasks.filter((s) => s.status === 'DONE').length;
            const totalSubtasks = task.subtasks.length;
            const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

            return (
              <div
                key={task.id}
                className="section-panel"
                style={{
                  padding: '1.25rem',
                  borderLeft: `4px solid ${
                    isLongTerm ? 'var(--jns-gold)' : task.priority === 'URGENT' ? 'var(--danger-color, #ef4444)' : 'var(--jns-blue)'
                  }`,
                  position: 'relative',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className={`badge ${
                          isLongTerm ? 'badge-gold' : 'badge-blue'
                        }`}
                        style={{ fontSize: '11px', fontWeight: 700 }}
                      >
                        {isLongTerm ? 'LONG-TERM PROJECT' : 'IMMEDIATE REQUEST'}
                      </span>

                      {task.showName && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                          }}
                        >
                          {task.showName}
                        </span>
                      )}

                      {task.timing && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(234, 179, 8, 0.12)',
                            color: '#eab308',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          <span>Timing: {task.timing}</span>
                        </span>
                      )}

                      {task.priority === 'URGENT' && (
                        <span className="badge badge-red" style={{ fontSize: '10.5px' }}>
                          URGENT
                        </span>
                      )}
                      {task.priority === 'HIGH' && (
                        <span className="badge badge-gold" style={{ fontSize: '10.5px' }}>
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginTop: '6px',
                        marginBottom: '4px',
                      }}
                    >
                      {task.title || task.projectName}
                    </h3>

                    {task.description && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          margin: '4px 0 8px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right side controls: Status dropdown and actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <select
                      className="form-select"
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        height: '30px',
                        fontWeight: 700,
                        backgroundColor:
                          task.status === 'COMPLETED'
                            ? 'rgba(34, 197, 94, 0.12)'
                            : task.status === 'READY_FOR_REVIEW'
                            ? 'rgba(218, 165, 32, 0.12)'
                            : 'var(--bg-card)',
                        color:
                          task.status === 'COMPLETED'
                            ? '#22c55e'
                            : task.status === 'READY_FOR_REVIEW'
                            ? 'var(--jns-gold)'
                            : 'var(--text-main)',
                      }}
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value as GraphicTaskStatus)}
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="READY_FOR_REVIEW">Ready for Review</option>
                      <option value="REVISION_REQUIRED">Revision Required</option>
                      <option value="COMPLETED">Completed</option>
                    </select>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--text-muted)' }}
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Meta details row (Designer, Deadline, Created) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginBottom: '0.85rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    <span>Designer: </span>
                    <strong style={{ color: 'var(--text-secondary)' }}>
                      {task.assignedUserName || getUserDisplayName(task.assignedUserId)}
                    </strong>
                  </div>

                  {task.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      <span>Deadline: </span>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {new Date(task.deadline).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Requested by: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {task.createdByName || getUserDisplayName(task.createdById)}
                    </span>
                  </div>
                </div>

                {/* Assets and References (Immediate Requests or Long-Term) */}
                {((task.assets && task.assets.length > 0) || (task.references && task.references.length > 0)) && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-card-subtle)',
                      borderRadius: '6px',
                      marginBottom: '0.85rem',
                    }}
                  >
                    {task.assets?.map((ast, i) => (
                      <a
                        key={ast.id || i}
                        href={ast.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={12} color="var(--jns-gold)" />
                        <span>{ast.title || 'Asset Link'}</span>
                        <ExternalLink size={10} />
                      </a>
                    ))}

                    {task.references?.map((ref, i) => (
                      <a
                        key={ref.id || i}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11.5px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={12} color="#38bdf8" />
                        <span>{ref.title || 'Reference Link'}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Deliverable link preview / action */}
                {task.deliverableUrl && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <a
                      href={task.deliverableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Open Completed Graphics File ({task.deliverableUrl})</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* LONG-TERM PROJECT: 8-STAGE SUBTASKS PIPELINE */}
                {isLongTerm && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Progress Bar & Subtask counter */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--text-main)' }}>Subtasks Pipeline</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          ({completedSubtasks} of {totalSubtasks} completed • {progressPercent}%)
                        </span>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={() => {
                          setAddingSubtaskTaskId(task.id);
                          setNewSubtaskTitle('');
                          setNewSubtaskStatus('NOT_STARTED');
                        }}
                      >
                        <Plus size={12} />
                        <span>Add Subtask</span>
                      </button>
                    </div>

                    <div
                      style={{
                        height: '6px',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '1rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          backgroundColor: progressPercent === 100 ? '#22c55e' : 'var(--jns-gold)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>

                    {/* Subtask items table / cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {task.subtasks.map((st) => {
                        const currentStageInfo =
                          SUBTASK_STAGES.find((s) => s.key === st.status) || SUBTASK_STAGES[0];

                        return (
                          <div
                            key={st.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-card-subtle)',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              gap: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: currentStageInfo.color,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: st.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-main)',
                                  textDecoration: st.status === 'DONE' ? 'line-through' : 'none',
                                }}
                              >
                                {st.title}
                              </span>
                            </div>

                            {/* 8-Stage Direct Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                className="form-select"
                                style={{
                                  fontSize: '11.5px',
                                  padding: '3px 8px',
                                  height: '28px',
                                  borderColor: currentStageInfo.color,
                                  color: currentStageInfo.color,
                                  fontWeight: 700,
                                  backgroundColor: 'var(--bg-card)',
                                }}
                                value={st.status}
                                onChange={(e) =>
                                  handleUpdateSubtaskStatus(
                                    task.id,
                                    st.id,
                                    e.target.value as GraphicSubtaskStatus
                                  )
                                }
                              >
                                {SUBTASK_STAGES.map((stage) => (
                                  <option key={stage.key} value={stage.key}>
                                    {stage.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      {/* Inline Add Subtask Form */}
                      {addingSubtaskTaskId === task.id && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(218, 165, 32, 0.05)',
                            borderRadius: '6px',
                            border: '1px dashed var(--jns-gold)',
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, height: '28px', fontSize: '12px' }}
                            placeholder="Subtask name (e.g. Lower Third MOGRT, Intro Stinger, Video Wall Loop)..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask(task.id);
                              }
                            }}
                            autoFocus
                          />
                          <select
                            className="form-select"
                            style={{ width: '130px', height: '28px', fontSize: '11.5px' }}
                            value={newSubtaskStatus}
                            onChange={(e) => setNewSubtaskStatus(e.target.value as GraphicSubtaskStatus)}
                          >
                            {SUBTASK_STAGES.map((stage) => (
                              <option key={stage.key} value={stage.key}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
                            onClick={() => handleAddSubtask(task.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ height: '28px', padding: '0 8px', fontSize: '11.5px' }}
                            onClick={() => setAddingSubtaskTaskId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Action Modal initialized with defaultTab="GRAPHICS" */}
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        defaultTab="GRAPHICS"
        onSuccess={() => {
          fetchTasks();
        }}
      />
    </div>
  );
}
