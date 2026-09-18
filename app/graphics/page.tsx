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
  Pencil,
  X,
  Save,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import {
  GraphicDesignTask,
  GraphicSubtask,
  GraphicSubtaskStatus,
  GraphicTaskStatus,
  Priority,
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
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'IMMEDIATE' | 'LONG_TERM'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Inline subtask addition per task
  const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] = useState<GraphicSubtaskStatus>('NOT_STARTED');

  // Inline subtask rename
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState('');

  // Comprehensive Task & Subtasks Edit Modal
  const [editingTask, setEditingTask] = useState<GraphicDesignTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editShowName, setEditShowName] = useState('');
  const [editTiming, setEditTiming] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('NORMAL');
  const [editStatus, setEditStatus] = useState<GraphicTaskStatus>('NOT_STARTED');
  const [editAssignedUserId, setEditAssignedUserId] = useState('');
  const [editDeliverableUrl, setEditDeliverableUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssetsText, setEditAssetsText] = useState('');
  const [editReferencesText, setEditReferencesText] = useState('');
  const [editSubtasks, setEditSubtasks] = useState<GraphicSubtask[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

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
    fetch('/api/shows')
      .then((r) => r.json())
      .then((data) => {
        if (data.shows) setShows(data.shows);
      })
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';
  const canEdit =
    isAdmin ||
    currentUser?.role === 'PRODUCER' ||
    currentUser?.jobFunction === 'MOTION_GRAPHICS_DESIGNER' ||
    currentUser?.jobFunction === 'GRAPHIC_DESIGNER';

  // Quick status update on task card
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

  // Quick subtask stage update (all 8 stages)
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

  // Inline add subtask to project
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

  // Inline rename subtask
  const handleSaveInlineSubtaskRename = async (taskId: string, subtaskId: string) => {
    if (!inlineSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, title: inlineSubtaskTitle.trim() } : st
    );

    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditingSubtaskId(null);
      setInlineSubtaskTitle('');
    }
  };

  // Delete individual subtask
  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);

    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete entire task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this graphics task?')) return;
    try {
      const res = await fetch(`/api/graphics/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit Task Modal
  const handleOpenEditModal = (task: GraphicDesignTask) => {
    setEditingTask(task);
    setEditTitle(task.title || task.projectName || '');
    setEditShowName(task.showName || '');
    setEditTiming(task.timing || '');
    setEditDeadline(task.deadline ? task.deadline.slice(0, 16) : '');
    setEditPriority(task.priority || 'NORMAL');
    setEditStatus(task.status || 'NOT_STARTED');
    setEditAssignedUserId(task.assignedUserId || 'usr_ilia_graphics');
    setEditDeliverableUrl(task.deliverableUrl || '');
    setEditDescription(task.description || '');
    setEditAssetsText((task.assets || []).map((a) => a.url).join('\n'));
    setEditReferencesText((task.references || []).map((r) => r.url).join('\n'));
    setEditSubtasks(task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : []);
  };

  // Save changes from Edit Task Modal
  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      alert('Task title / Project name is required.');
      return;
    }

    setSavingEdit(true);
    try {
      const parsedAssets = editAssetsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((url, i) => ({
          id: `ast_${Date.now()}_${i}`,
          title: `Asset ${i + 1}`,
          url,
          addedAt: new Date().toISOString(),
        }));

      const parsedReferences = editReferencesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((url, i) => ({
          id: `ref_${Date.now()}_${i}`,
          title: `Reference ${i + 1}`,
          url,
          addedAt: new Date().toISOString(),
        }));

      const res = await fetch(`/api/graphics/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          projectName: editingTask.type === 'LONG_TERM' ? editTitle.trim() : undefined,
          showName: editShowName.trim() || undefined,
          timing: editTiming.trim() || undefined,
          deadline: editDeadline || undefined,
          priority: editPriority,
          status: editStatus,
          assignedUserId: editAssignedUserId,
          deliverableUrl: editDeliverableUrl.trim() || undefined,
          description: editDescription.trim(),
          assets: parsedAssets,
          references: parsedReferences,
          subtasks: editSubtasks,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update task');
      }

      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data.task : t)));
      setEditingTask(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Edit Modal: Subtask operations
  const handleModalSubtaskChange = (index: number, field: 'title' | 'status', value: string) => {
    setEditSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'status' && value === 'DONE') {
        updated[index].completedAt = new Date().toISOString();
      }
      return updated;
    });
  };

  const handleModalDeleteSubtask = (index: number) => {
    setEditSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModalAddSubtask = () => {
    const newSub: GraphicSubtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `Subtask ${editSubtasks.length + 1}`,
      status: 'NOT_STARTED',
      createdAt: new Date().toISOString(),
    };
    setEditSubtasks((prev) => [...prev, newSub]);
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
          <span>New Graphics Request</span>
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
            <option value="REVISION_REQUIRED">Revision Required</option>
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
            <span>New Graphics Request</span>
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

                  {/* Right side controls: Status dropdown, Edit Task button, and actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

                    {/* Admin / Producer Edit Task Button */}
                    {canEdit && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          color: 'var(--jns-gold)',
                          borderColor: 'rgba(218, 165, 32, 0.3)',
                        }}
                        onClick={() => handleOpenEditModal(task)}
                        title="Edit Task & Subtasks (Admin)"
                      >
                        <Pencil size={12} />
                        <span>Edit Task</span>
                      </button>
                    )}

                    {canEdit && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', color: 'var(--text-muted)' }}
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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
                      {canEdit && (
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
                      )}
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
                        const isInlineEditing = editingSubtaskId === st.id;

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px' }}>
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: currentStageInfo.color,
                                  flexShrink: 0,
                                }}
                              />
                              {isInlineEditing ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ height: '26px', fontSize: '12px', padding: '2px 6px' }}
                                    value={inlineSubtaskTitle}
                                    onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineSubtaskRename(task.id, st.id);
                                      if (e.key === 'Escape') setEditingSubtaskId(null);
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '2px 6px', height: '26px' }}
                                    onClick={() => handleSaveInlineSubtaskRename(task.id, st.id)}
                                    title="Save name"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 6px', height: '26px' }}
                                    onClick={() => setEditingSubtaskId(null)}
                                    title="Cancel"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                  {canEdit && (
                                    <button
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        padding: '2px',
                                      }}
                                      onClick={() => {
                                        setEditingSubtaskId(st.id);
                                        setInlineSubtaskTitle(st.title);
                                      }}
                                      title="Rename subtask (Admin)"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 8-Stage Direct Selector & Delete Subtask */}
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

                              {canEdit && (
                                <button
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: '4px',
                                  }}
                                  onClick={() => handleDeleteSubtask(task.id, st.id)}
                                  title="Delete subtask"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
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

      {/* COMPREHENSIVE EDIT TASK & SUBTASKS MODAL (ADMIN) */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(218, 165, 32, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--jns-gold)',
                  }}
                >
                  <Pencil size={15} />
                </div>
                <div>
                  <div className="modal-title">
                    Edit {editingTask.type === 'LONG_TERM' ? 'Long-Term Graphics Project' : 'Immediate Graphics Request'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Admin configuration for task metadata, timing, deliverable, and subtasks pipeline
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingTask(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              {/* Row 1: Title and Show */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    {editingTask.type === 'LONG_TERM' ? 'Global Project Name' : 'Request Title'} <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Show Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    list="edit-show-presets"
                    placeholder="Show name..."
                    value={editShowName}
                    onChange={(e) => setEditShowName(e.target.value)}
                  />
                  <datalist id="edit-show-presets">
                    {shows.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Row 2: Timing, Deadline, Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Implemented Timing</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 02:15 - 02:45"
                    value={editTiming}
                    onChange={(e) => setEditTiming(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Strategic</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Status & Assigned Designer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Task Status</label>
                  <select
                    className="form-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as GraphicTaskStatus)}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="READY_FOR_REVIEW">Ready for Review</option>
                    <option value="REVISION_REQUIRED">Revision Required</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Designer</label>
                  <select
                    className="form-select"
                    value={editAssignedUserId}
                    onChange={(e) => setEditAssignedUserId(e.target.value)}
                  >
                    {allUsers
                      .filter((u) => u.jobFunction === 'MOTION_GRAPHICS_DESIGNER' || u.jobFunction === 'GRAPHIC_DESIGNER' || u.role === 'ADMIN')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.name} ({u.positionDisplay || u.jobFunction})
                        </option>
                      ))}
                    {allUsers
                      .filter((u) => u.jobFunction !== 'MOTION_GRAPHICS_DESIGNER' && u.jobFunction !== 'GRAPHIC_DESIGNER' && u.role !== 'ADMIN')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.name} ({u.positionDisplay || u.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Deliverable URL */}
              <div className="form-group">
                <label className="form-label">Completed Deliverable URL (Dropbox / Premiere MOGRT / Drive)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://dropbox.com/s/... or https://drive.google.com/..."
                  value={editDeliverableUrl}
                  onChange={(e) => setEditDeliverableUrl(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description & Instructions</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Design brief, colors, typography, aspect ratio, audio cues..."
                />
              </div>

              {/* Assets and References URLs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Asset URLs (1 per line)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="https://..."
                    value={editAssetsText}
                    onChange={(e) => setEditAssetsText(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference URLs (1 per line)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="https://..."
                    value={editReferencesText}
                    onChange={(e) => setEditReferencesText(e.target.value)}
                  />
                </div>
              </div>

              {/* SUBTASKS PIPELINE EDITOR (8 STAGES) */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      Subtasks Pipeline ({editSubtasks.length})
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Configure stages: Not Started, Concept, Design, Animation, Implementation, Finalizing, Audio, Done
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', gap: '4px' }}
                    onClick={handleModalAddSubtask}
                  >
                    <Plus size={13} />
                    <span>Add Subtask</span>
                  </button>
                </div>

                {editSubtasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No subtasks attached. Click &quot;Add Subtask&quot; to build the pipeline.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {editSubtasks.map((st, idx) => (
                      <div
                        key={st.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '18px' }}>
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1, height: '28px', fontSize: '12px' }}
                          value={st.title}
                          onChange={(e) => handleModalSubtaskChange(idx, 'title', e.target.value)}
                          placeholder="Subtask title..."
                          required
                        />
                        <select
                          className="form-select"
                          style={{ width: '140px', height: '28px', fontSize: '11.5px', fontWeight: 600 }}
                          value={st.status}
                          onChange={(e) => handleModalSubtaskChange(idx, 'status', e.target.value)}
                        >
                          {SUBTASK_STAGES.map((stage) => (
                            <option key={stage.key} value={stage.key}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                          }}
                          onClick={() => handleModalDeleteSubtask(idx)}
                          title="Delete subtask"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '0.75rem 0 0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTask(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
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
