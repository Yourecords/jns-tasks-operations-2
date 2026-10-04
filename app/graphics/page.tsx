'use client';
import Attachments from '@/components/Attachments';

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
  ChevronDown,
  FileText,
  Calendar,
  User,
  Pencil,
  X,
  Save,
  Eye,
  Download,
  Lock,
  FolderOpen,
  Play,
  MessageSquare,
  MessageSquareQuote,
  Send,
} from 'lucide-react';
import MediaLightboxModal, { MediaItem } from '@/components/MediaLightboxModal';
import { useUser } from '@/components/UserContext';
import { canAccessGraphics } from '@/lib/utils';
import {
  GraphicDesignTask,
  GraphicSubtask,
  GraphicSubtaskStatus,
  GraphicTaskStatus,
  GraphicAssetLink,
  GraphicStatusNote,
  Priority,
} from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

const SUBTASK_STAGES: { key: GraphicSubtaskStatus; label: string; color: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started', color: 'var(--text-muted)' },
  { key: 'STARTED', label: 'Started', color: '#38bdf8' },
  { key: 'DONE', label: 'Done', color: '#22c55e' },
  { key: 'IN_PROGRESS', label: 'Started', color: '#38bdf8' },
  { key: 'CONCEPT', label: 'Concept', color: '#38bdf8' },
  { key: 'DESIGN', label: 'Design', color: '#a855f7' },
  { key: 'ANIMATION', label: 'Animation', color: '#ec4899' },
  { key: 'IMPLEMENTATION', label: 'Implementation', color: '#eab308' },
  { key: 'FINALIZING', label: 'Finalizing', color: '#f97316' },
  { key: 'AUDIO', label: 'Audio', color: '#06b6d4' },
];

const MAIN_TASK_DROPDOWN_OPTIONS: { key: GraphicSubtaskStatus; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'STARTED', label: 'Started' },
  { key: 'DONE', label: 'Done' },
];

const TASK_STATUS_OPTIONS: { key: GraphicTaskStatus; label: string; bg: string; color: string; border: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started', bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  { key: 'IN_PROGRESS', label: 'In Progress', bg: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.45)' },
  { key: 'READY_FOR_REVIEW', label: 'Ready for Review', bg: 'rgba(234, 179, 8, 0.18)', color: '#eab308', border: 'rgba(234, 179, 8, 0.45)' },
  { key: 'REVISION_REQUIRED', label: 'Revision Required', bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.45)' },
  { key: 'COMPLETED', label: 'Completed', bg: 'rgba(34, 197, 94, 0.18)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.45)' },
  { key: 'ARCHIVED', label: 'Archived', bg: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.45)' },
];

const SUBTASK_8_STAGE_OPTIONS: { key: GraphicSubtaskStatus; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'CONCEPT', label: 'Concept' },
  { key: 'DESIGN', label: 'Design' },
  { key: 'ANIMATION', label: 'Animation' },
  { key: 'IMPLEMENTATION', label: 'Implementation' },
  { key: 'FINALIZING', label: 'Finalizing' },
  { key: 'AUDIO', label: 'Audio' },
  { key: 'DONE', label: 'Done' },
];

const SUBTASK_DROPDOWN_OPTIONS = SUBTASK_8_STAGE_OPTIONS;

export default function GraphicsHubPage() {
  const { currentUser, allUsers } = useUser();
  const [tasks, setTasks] = useState<GraphicDesignTask[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'IMMEDIATE' | 'LONG_TERM'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [lightboxFile, setLightboxFile] = useState<MediaItem | null>(null);

  // Producers list for Graphics Requests: Yuri, Zach, Barbara
  const producerOptions = React.useMemo(() => {
    const producerOrder: Record<string, number> = {
      usr_yuri_admin: 1,
      usr_zach_producer: 2,
      usr_barbara_producer: 3,
    };
    const filtered = allUsers
      .filter(
        (u) =>
          u.role === 'PRODUCER' ||
          u.role === 'ADMIN' ||
          u.id === 'usr_zach_producer' ||
          u.id === 'usr_barbara_producer' ||
          u.id === 'usr_yuri_admin'
      )
      .sort((a, b) => (producerOrder[a.id] ?? 99) - (producerOrder[b.id] ?? 99));

    if (filtered.length > 0) return filtered;

    return [
      { id: 'usr_yuri_admin', name: 'Yuri', fullName: 'Yuri Skvirski', role: 'ADMIN', positionDisplay: 'Admin' },
      { id: 'usr_zach_producer', name: 'Zach', fullName: 'Zach Sicherman', role: 'PRODUCER', positionDisplay: 'Producer' },
      { id: 'usr_barbara_producer', name: 'Barbara', fullName: 'Barbara Hanimov', role: 'PRODUCER', positionDisplay: 'Producer' },
    ];
  }, [allUsers]);

  // Inline subtask addition per task
  const [addingSubtaskTaskId, setAddingSubtaskTaskId] = useState<string | null>(null);
  const [addingSubtaskParentId, setAddingSubtaskParentId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] = useState<GraphicSubtaskStatus>('NOT_STARTED');
  const [collapsedCardSubtasks, setCollapsedCardSubtasks] = useState<Record<string, boolean>>({});

  const toggleCardTaskCollapse = (subtaskId: string) => {
    setCollapsedCardSubtasks((prev) => ({
      ...prev,
      [subtaskId]: !prev[subtaskId],
    }));
  };

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

  // Expanded task window state (tracks which tasks have their window expanded)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Inline Quick Asset / Reference / Deliverable state in expanded window
  const [addingAssetTaskId, setAddingAssetTaskId] = useState<string | null>(null);
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [savingAsset, setSavingAsset] = useState(false);

  const [addingRefTaskId, setAddingRefTaskId] = useState<string | null>(null);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');
  const [savingRef, setSavingRef] = useState(false);

  const [editingDeliverableTaskId, setEditingDeliverableTaskId] = useState<string | null>(null);
  const [inlineDeliverableUrl, setInlineDeliverableUrl] = useState('');
  const [savingDeliverable, setSavingDeliverable] = useState(false);

  // Status Change with Optional Note to Producer Modal
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [statusChangeTask, setStatusChangeTask] = useState<GraphicDesignTask | null>(null);
  const [statusChangeTargetStatus, setStatusChangeTargetStatus] = useState<GraphicTaskStatus | null>(null);
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [savingStatusChange, setSavingStatusChange] = useState(false);

  // Inline Direct Note to Producer in expanded window
  const [inlineProducerNotes, setInlineProducerNotes] = useState<Record<string, string>>({});
  const [sendingProducerNoteTaskId, setSendingProducerNoteTaskId] = useState<string | null>(null);

  // Stage-based review & submission modals (Immediate Requests)
  const [submitReviewModalOpen, setSubmitReviewModalOpen] = useState(false);
  const [submitReviewTask, setSubmitReviewTask] = useState<GraphicDesignTask | null>(null);
  const [submitDeliverableUrl, setSubmitDeliverableUrl] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [savingSubmitReview, setSavingSubmitReview] = useState(false);

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionTask, setRevisionTask] = useState<GraphicDesignTask | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionAdditionalAssets, setRevisionAdditionalAssets] = useState<{ title: string; url: string }[]>([]);
  const [revisionAdditionalReferences, setRevisionAdditionalReferences] = useState<{ title: string; url: string }[]>([]);
  const [savingRevision, setSavingRevision] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/graphics');
      if (res.ok) {
        const data = await res.json();
        const loadedTasks: GraphicDesignTask[] = data.tasks || [];
        setTasks(loadedTasks);
        // Automatically expand tasks with IN_PROGRESS status
        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          loadedTasks.forEach((t) => {
            if (t.status === 'IN_PROGRESS') {
              next.add(t.id);
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load graphics tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const isAuthorized = canAccessGraphics(currentUser);

  useEffect(() => {
    if (isAuthorized) {
      fetchTasks();
    } else {
      setLoading(false);
    }
    fetch('/api/shows')
      .then((r) => r.json())
      .then((data) => {
        if (data.shows) setShows(data.shows);
      })
      .catch(() => {});
  }, [isAuthorized]);

  const isAdmin = currentUser?.role === 'ADMIN';
  const canEdit = isAuthorized;

  const getUserDisplayName = (userId?: string) => {
    if (!userId) return 'Unassigned';
    const u = allUsers.find((user) => user.id === userId);
    return u?.fullName || u?.name || userId;
  };

  const getTaskProducerName = (task: GraphicDesignTask) => {
    if (task.producerName) return task.producerName;
    if (task.producerId) return getUserDisplayName(task.producerId);
    return task.type === 'LONG_TERM' ? 'Zach Sicherman' : 'Yuri Skvirski';
  };

  // Status Change Flow: opens modal allowing the designer to write a note to the producer
  const handleInitiateStatusChange = (task: GraphicDesignTask, newStatus: GraphicTaskStatus) => {
    if (task.status === newStatus) return;
    setStatusChangeTask(task);
    setStatusChangeTargetStatus(newStatus);
    setStatusChangeNote('');
    setStatusChangeModalOpen(true);
  };

  // Confirms status change, optionally saving a note for the responsible producer
  const handleConfirmStatusChange = async (includeNote: boolean) => {
    if (!statusChangeTask || !statusChangeTargetStatus) return;
    const taskId = statusChangeTask.id;
    const newStatus = statusChangeTargetStatus;
    const noteToSend = includeNote ? statusChangeNote.trim() : '';

    setSavingStatusChange(true);
    if (newStatus === 'IN_PROGRESS') {
      setExpandedTaskIds((prev) => new Set([...prev, taskId]));
    }

    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          statusNote: noteToSend || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setStatusChangeModalOpen(false);
        setStatusChangeTask(null);
        setStatusChangeTargetStatus(null);
        setStatusChangeNote('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Network error while updating status');
    } finally {
      setSavingStatusChange(false);
    }
  };

  // Quick status update on task card (delegates to modal flow)
  const handleUpdateStatus = (taskId: string, newStatus: GraphicTaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    handleInitiateStatusChange(task, newStatus);
  };

  // Send an ad-hoc direct note to the responsible producer from the expanded window
  const handleSendProducerNote = async (taskId: string) => {
    const noteText = (inlineProducerNotes[taskId] || '').trim();
    if (!noteText) return;
    setSendingProducerNoteTaskId(taskId);
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setInlineProducerNotes((prev) => ({ ...prev, [taskId]: '' }));
      }
    } catch (err) {
      console.error('Failed to send note to producer', err);
    } finally {
      setSendingProducerNoteTaskId(null);
    }
  };

  // Check if current user is the responsible producer or admin
  const isResponsibleProducer = (task: GraphicDesignTask) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (task.producerId === currentUser.id) return true;
    if (!task.producerId) {
      if (task.type === 'LONG_TERM' && currentUser.id === 'usr_zach_producer') return true;
      if (task.type === 'IMMEDIATE' && currentUser.id === 'usr_yuri_admin') return true;
    }
    return false;
  };

  // Immediate Request stage-based progress handlers
  const handleStartImmediateTask = async (taskId: string) => {
    setExpandedTaskIds((prev) => new Set([...prev, taskId]));
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error('Failed to start task', err);
    }
  };

  const handleOpenSubmitModal = (task: GraphicDesignTask) => {
    setSubmitReviewTask(task);
    setSubmitDeliverableUrl(task.deliverableUrl || '');
    setSubmitNote('');
    setSubmitReviewModalOpen(true);
  };

  const handleConfirmSubmitReview = async () => {
    if (!submitReviewTask) return;
    setSavingSubmitReview(true);
    try {
      const res = await fetch(`/api/graphics/${submitReviewTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'READY_FOR_REVIEW',
          deliverableUrl: submitDeliverableUrl.trim(),
          statusNote: submitNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === submitReviewTask.id ? data.task : t)));
        setSubmitReviewModalOpen(false);
        setSubmitReviewTask(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit for review');
      }
    } catch (err) {
      console.error('Failed to submit for review', err);
    } finally {
      setSavingSubmitReview(false);
    }
  };

  const handleApproveTask = async (task: GraphicDesignTask) => {
    const confirmed = window.confirm(
      `Approve and archive "${task.title || task.projectName}"? The designer will be notified and the request will be marked complete and archived.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/graphics/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          status: 'COMPLETED',
          statusNote: `Approved by ${currentUser?.fullName || currentUser?.name || 'Producer'}. Task closed and archived.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }
    } catch (err) {
      console.error('Failed to approve task', err);
    }
  };

  const handleOpenRevisionModal = (task: GraphicDesignTask) => {
    setRevisionTask(task);
    setRevisionNotes('');
    setRevisionAdditionalAssets([{ title: '', url: '' }]);
    setRevisionAdditionalReferences([{ title: '', url: '' }]);
    setRevisionModalOpen(true);
  };

  const handleConfirmRevision = async () => {
    if (!revisionTask) return;
    if (!revisionNotes.trim()) {
      alert('Please provide review feedback explaining the revisions required.');
      return;
    }
    setSavingRevision(true);
    try {
      const res = await fetch(`/api/graphics/${revisionTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVISION_REQUIRED',
          status: 'REVISION_REQUIRED',
          reviewNotes: revisionNotes.trim(),
          statusNote: revisionNotes.trim(),
          additionalAssets: revisionAdditionalAssets.filter((a) => a.title.trim() || a.url.trim()),
          additionalReferences: revisionAdditionalReferences.filter((r) => r.title.trim() || r.url.trim()),
          addPlaceholders: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === revisionTask.id ? data.task : t)));
        setRevisionModalOpen(false);
        setRevisionTask(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Failed to request revisions', err);
    } finally {
      setSavingRevision(false);
    }
  };

  // Quick asset management handlers for expanded window
  const handleQuickAddAsset = async (taskId: string) => {
    if (!newAssetUrl.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setSavingAsset(true);
    const newAsset: GraphicAssetLink = {
      id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newAssetTitle.trim() || 'Asset File',
      url: newAssetUrl.trim(),
      addedAt: new Date().toISOString(),
    };
    const updatedAssets = [...(task.assets || []), newAsset];
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: updatedAssets }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setAddingAssetTaskId(null);
        setNewAssetTitle('');
        setNewAssetUrl('');
      }
    } catch (err) {
      console.error('Failed to add asset', err);
    } finally {
      setSavingAsset(false);
    }
  };

  const handleQuickRemoveAsset = async (taskId: string, assetId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedAssets = (task.assets || []).filter((a) => a.id !== assetId);
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: updatedAssets }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error('Failed to remove asset', err);
    }
  };

  const handleQuickAddReference = async (taskId: string) => {
    if (!newRefUrl.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setSavingRef(true);
    const newRef = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newRefTitle.trim() || 'Reference Link',
      url: newRefUrl.trim(),
      addedAt: new Date().toISOString(),
    };
    const updatedRefs = [...(task.references || []), newRef];
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: updatedRefs }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setAddingRefTaskId(null);
        setNewRefTitle('');
        setNewRefUrl('');
      }
    } catch (err) {
      console.error('Failed to add reference', err);
    } finally {
      setSavingRef(false);
    }
  };

  const handleQuickRemoveReference = async (taskId: string, refId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedRefs = (task.references || []).filter((r) => r.id !== refId);
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: updatedRefs }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      }
    } catch (err) {
      console.error('Failed to remove reference', err);
    }
  };

  const handleQuickSaveDeliverable = async (taskId: string) => {
    setSavingDeliverable(true);
    try {
      const res = await fetch(`/api/graphics/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableUrl: inlineDeliverableUrl.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setEditingDeliverableTaskId(null);
      }
    } catch (err) {
      console.error('Failed to save deliverable URL', err);
    } finally {
      setSavingDeliverable(false);
    }
  };

  // Quick subtask stage update
  const handleUpdateSubtaskStatus = async (
    taskId: string,
    subtaskId: string,
    newSubStatus: GraphicSubtaskStatus
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) => {
      if (st.id === subtaskId) {
        return {
          ...st,
          status: newSubStatus,
          completedAt: newSubStatus === 'DONE' ? new Date().toISOString() : undefined,
        };
      }
      if (st.subtasks && st.subtasks.length > 0) {
        const hasChild = st.subtasks.some((c) => c.id === subtaskId);
        if (hasChild) {
          return {
            ...st,
            subtasks: st.subtasks.map((c) =>
              c.id === subtaskId
                ? {
                    ...c,
                    status: newSubStatus,
                    completedAt: newSubStatus === 'DONE' ? new Date().toISOString() : undefined,
                  }
                : c
            ),
          };
        }
      }
      return st;
    });

    const isAllComplete = (list: GraphicSubtask[]): boolean => {
      return (
        list.length > 0 &&
        list.every(
          (s) =>
            s.status === 'DONE' &&
            (!s.subtasks || s.subtasks.length === 0 || isAllComplete(s.subtasks))
        )
      );
    };

    const allDone = isAllComplete(updatedSubtasks);
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
  const handleAddSubtask = async (taskId: string, parentMainTaskId?: string) => {
    if (!newSubtaskTitle.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newSub: GraphicSubtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      status: newSubtaskStatus,
      isMainTask: false,
      parentId: parentMainTaskId || undefined,
      assignedUserId: task.assignedUserId,
      createdAt: new Date().toISOString(),
    };

    let updatedSubtasks: GraphicSubtask[];
    if (parentMainTaskId) {
      updatedSubtasks = task.subtasks.map((st) =>
        st.id === parentMainTaskId
          ? {
              ...st,
              subtasks: [...(st.subtasks || []), newSub],
            }
          : st
      );
    } else {
      updatedSubtasks = [...task.subtasks, newSub];
    }

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
        setAddingSubtaskParentId(null);
        setNewSubtaskTitle('');
        setNewSubtaskStatus('NOT_STARTED');
        if (parentMainTaskId) {
          setCollapsedCardSubtasks((prev) => ({ ...prev, [parentMainTaskId]: false }));
        }
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

    const updatedSubtasks = task.subtasks.map((st) => {
      if (st.id === subtaskId) {
        return { ...st, title: inlineSubtaskTitle.trim() };
      }
      if (st.subtasks && st.subtasks.length > 0) {
        return {
          ...st,
          subtasks: st.subtasks.map((c) =>
            c.id === subtaskId ? { ...c, title: inlineSubtaskTitle.trim() } : c
          ),
        };
      }
      return st;
    });

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

    let updatedSubtasks = task.subtasks.filter((st) => st.id !== subtaskId);
    updatedSubtasks = updatedSubtasks.map((st) => {
      if (st.subtasks && st.subtasks.length > 0) {
        return {
          ...st,
          subtasks: st.subtasks.filter((c) => c.id !== subtaskId),
        };
      }
      return st;
    });

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
    setEditAssignedUserId(
      task.producerId || (task.type === 'LONG_TERM' ? 'usr_zach_producer' : 'usr_yuri_admin')
    );
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

      const existingMediaAssets = (editingTask.assets || []).filter(
        (a) => a.mediaId || (a.url && a.url.startsWith('/api/media/')),
      );
      const existingMediaReferences = (editingTask.references || []).filter(
        (r) => r.mediaId || (r.url && r.url.startsWith('/api/media/')),
      );

      const combinedAssets = [
        ...existingMediaAssets,
        ...parsedAssets.filter((a) => !existingMediaAssets.some((m) => m.url === a.url)),
      ];
      const combinedReferences = [
        ...existingMediaReferences,
        ...parsedReferences.filter((r) => !existingMediaReferences.some((m) => m.url === r.url)),
      ];

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
          producerId: editAssignedUserId,
          deliverableUrl: editDeliverableUrl.trim() || undefined,
          description: editDescription.trim(),
          assets: combinedAssets,
          references: combinedReferences,
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

  // Metrics
  const immediateTasks = tasks.filter((t) => t.type === 'IMMEDIATE');
  const longTermTasks = tasks.filter((t) => t.type === 'LONG_TERM');
  const activeImmediate = immediateTasks.filter((t) => !t.isArchived && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'ARCHIVED');
  const activeLongTerm = longTermTasks.filter((t) => !t.isArchived && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'ARCHIVED');
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'ARCHIVED' || t.isArchived).length;
  const archivedCount = tasks.filter((t) => t.isArchived || t.status === 'ARCHIVED').length;

  // Filtered list
  const filteredTasks = tasks.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterStatus === 'ARCHIVED') {
      if (!t.isArchived && t.status !== 'ARCHIVED') return false;
    } else if (filterStatus === 'ALL') {
      // By default show active requests; keep archived tasks in the archive tab
      if (t.isArchived || t.status === 'ARCHIVED') return false;
    } else if (filterStatus === 'ALL_WITH_ARCHIVED') {
      // Show all including archived
    } else if (filterStatus === 'READY_FOR_REVIEW') {
      if (t.status !== 'READY_FOR_REVIEW' && (t.status as string) !== 'AWAITING_APPROVAL') return false;
      if (t.isArchived) return false;
    } else {
      if (t.status !== filterStatus) return false;
      if (filterStatus !== 'COMPLETED' && t.isArchived) return false;
    }
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

  if (currentUser && !isAuthorized) {
    return (
      <div className="empty-state-box" style={{ padding: '4rem 2rem', textAlign: 'center', margin: '3rem auto', maxWidth: '560px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1.25rem' }}>
          <Lock size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Graphics Hub Access Restricted
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '14px', lineHeight: 1.5 }}>
          Graphics tasks and workflows are confidential and restricted to Administrators, Producers, and Graphic Designers.
        </p>
        <Link href="/" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

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
              Completed &amp; Archived
            </span>
            <CheckCircle2 size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {archivedCount} archived • Delivered to production
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
            <option value="ALL">All Active Requests</option>
            <option value="ALL_WITH_ARCHIVED">All Requests (Inc. Archived)</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY_FOR_REVIEW">Awaiting Approval</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived / Closed</option>
          </select>

          {/* Dedicated Archived Filter Button */}
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === 'ARCHIVED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: filterStatus === 'ARCHIVED' ? 'rgba(148, 163, 184, 0.25)' : undefined,
              borderColor: filterStatus === 'ARCHIVED' ? '#94a3b8' : undefined,
              color: filterStatus === 'ARCHIVED' ? '#f8fafc' : undefined,
            }}
            onClick={() => setFilterStatus((prev) => (prev === 'ARCHIVED' ? 'ALL' : 'ARCHIVED'))}
            title="Filter by archived and closed requests"
          >
            <FolderOpen size={13} />
            <span>Archived ({archivedCount})</span>
          </button>
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
            const isExpanded = expandedTaskIds.has(task.id);

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
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.18)' : 'none',
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
                          whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                          overflow: isExpanded ? 'visible' : 'hidden',
                          textOverflow: isExpanded ? 'clip' : 'ellipsis',
                          maxWidth: isExpanded ? 'none' : '750px',
                        }}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right side controls: Start button, Status dropdown, Expand/Minimize button, Edit Task, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {task.type === 'IMMEDIATE' ? (
                      // Stage-based progress controls for Immediate Requests (No Dropdown Menu!)
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {/* Status Chip */}
                        <span
                          className={`status-chip ${
                            task.isArchived
                              ? 'status-chip-archived'
                              : task.status === 'IN_PROGRESS'
                              ? 'status-in-progress'
                              : task.status === 'READY_FOR_REVIEW'
                              ? 'status-waiting'
                              : task.status === 'COMPLETED'
                              ? 'status-completed'
                              : task.status === 'REVISION_REQUIRED'
                              ? 'status-revision'
                              : 'status-not-started'
                          }`}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            fontWeight: 700,
                            backgroundColor: task.isArchived ? 'rgba(148, 163, 184, 0.18)' : undefined,
                            color: task.isArchived ? '#94a3b8' : undefined,
                            borderColor: task.isArchived ? 'rgba(148, 163, 184, 0.4)' : undefined,
                          }}
                        >
                          {task.isArchived
                            ? 'Archived'
                            : task.status === 'READY_FOR_REVIEW'
                            ? 'Awaiting Approval'
                            : task.status === 'COMPLETED'
                            ? 'Approved & Archived'
                            : task.status === 'REVISION_REQUIRED'
                            ? 'Revisions Requested'
                            : task.status.replace(/_/g, ' ')}
                        </span>

                        {/* Reopen button for Archived Tasks */}
                        {task.isArchived && isResponsibleProducer(task) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                            onClick={async () => {
                              const res = await fetch(`/api/graphics/${task.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isArchived: false, status: 'IN_PROGRESS' }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
                              }
                            }}
                            title="Reopen archived request"
                          >
                            Reopen
                          </button>
                        )}

                        {/* Stage 1: Start Button */}
                        {task.status === 'NOT_STARTED' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '4px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12px',
                              backgroundColor: '#0284c7',
                              borderColor: '#0284c7',
                            }}
                            onClick={() => handleStartImmediateTask(task.id)}
                            title="Start working on this task"
                          >
                            <Play size={12} />
                            <span>Start</span>
                          </button>
                        )}

                        {/* Stage 2 / Revision: Submit for Review Button */}
                        {(task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUIRED') && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '4px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12px',
                              backgroundColor: 'var(--jns-gold)',
                              borderColor: 'var(--jns-gold)',
                              color: '#000',
                              fontWeight: 700,
                            }}
                            onClick={() => handleOpenSubmitModal(task)}
                            title="Submit deliverables for producer review"
                          >
                            <Send size={12} />
                            <span>Submit for Review</span>
                          </button>
                        )}

                        {/* Stage 3: Awaiting Approval (Producer Actions or Designer Waiting Indicator) */}
                        {task.status === 'READY_FOR_REVIEW' && (
                          isResponsibleProducer(task) ? (
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                style={{
                                  padding: '4px 9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11.5px',
                                  backgroundColor: '#16a34a',
                                  borderColor: '#16a34a',
                                }}
                                onClick={() => handleApproveTask(task)}
                                title="Approve and archive this request"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  padding: '4px 9px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11.5px',
                                  borderColor: '#ef4444',
                                  color: '#ef4444',
                                }}
                                onClick={() => handleOpenRevisionModal(task)}
                                title="Request revisions from designer"
                              >
                                <AlertCircle size={12} />
                                <span>Revisions</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--jns-gold)', fontStyle: 'italic', fontWeight: 600 }}>
                              ⏳ Awaiting {getTaskProducerName(task)}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      // Long-Term Project dropdown & controls
                      <>
                        {task.status === 'NOT_STARTED' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '4px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12px',
                              backgroundColor: '#0284c7',
                              borderColor: '#0284c7',
                            }}
                            onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                            title="Start task & expand window"
                          >
                            <Play size={12} />
                            <span>Start</span>
                          </button>
                        )}

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
                                : task.status === 'IN_PROGRESS'
                                ? 'rgba(56, 189, 248, 0.12)'
                                : 'var(--bg-card)',
                            color:
                              task.status === 'COMPLETED'
                                ? '#22c55e'
                                : task.status === 'READY_FOR_REVIEW'
                                ? 'var(--jns-gold)'
                                : task.status === 'IN_PROGRESS'
                                ? '#38bdf8'
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
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '4px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        borderColor: isExpanded ? 'var(--jns-gold)' : undefined,
                        color: isExpanded ? 'var(--jns-gold)' : undefined,
                      }}
                      onClick={() => toggleTaskExpand(task.id)}
                      title={isExpanded ? 'Minimize task window' : 'Expand task window for assets & status updates'}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>{isExpanded ? 'Minimize' : 'Expand'}</span>
                    </button>

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
                    marginBottom: isExpanded ? '1rem' : '0.45rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    <span>Assigned Producer: </span>
                    <strong style={{ color: 'var(--text-secondary)' }}>
                      {task.producerName || (task.producerId ? getUserDisplayName(task.producerId) : (isLongTerm ? 'Zach Sicherman' : 'Yuri Skvirski'))}
                    </strong>
                  </div>
                  {!isLongTerm && task.assignedUserId && task.assignedUserId !== task.producerId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Palette size={13} />
                      <span>Designer: </span>
                      <strong style={{ color: 'var(--text-secondary)' }}>
                        {task.assignedUserName || getUserDisplayName(task.assignedUserId)}
                      </strong>
                    </div>
                  )}

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

                <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                  <Attachments kind="graphics" target={task.id} />
                </div>

                {/* When Collapsed: Compact Summary View */}
                {!isExpanded && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.65rem",
                        marginTop: "0.4rem",
                        padding: "6px 10px",
                        backgroundColor: "var(--bg-card-subtle)",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '1px 7px',
                            borderRadius: '4px',
                            backgroundColor: (task.assets && task.assets.length > 0) ? 'rgba(218, 165, 32, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: (task.assets && task.assets.length > 0) ? 'var(--jns-gold)' : 'var(--text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          📎 {task.assets?.length || 0} Assets
                        </span>

                        {task.references && task.references.length > 0 && (
                          <span
                            style={{
                              padding: '1px 7px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              fontWeight: 600,
                            }}
                          >
                            🔗 {task.references.length} Refs
                          </span>
                        )}

                        {task.deliverableUrl && (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>
                            ✓ Deliverable Ready
                          </span>
                        )}

                        {isLongTerm && totalSubtasks > 0 && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            Stages: <strong style={{ color: 'var(--jns-gold)' }}>{completedSubtasks}/{totalSubtasks}</strong>
                          </span>
                        )}

                        {(task.latestNote || (task.statusNotes && task.statusNotes.length > 0)) && (
                          <span
                            style={{
                              padding: '1px 7px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              maxWidth: '240px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={task.latestNote ? `Latest note to producer: "${task.latestNote}"` : `${task.statusNotes?.length} producer notes`}
                          >
                            <MessageSquare size={11} />
                            <span>{task.latestNote ? `Note: "${task.latestNote}"` : `${task.statusNotes?.length} Notes`}</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleTaskExpand(task.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--jns-gold)',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0,
                        }}
                      >
                        <span>Open Task Window</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* When Expanded: Full Task Window with Assets & Status Flow */}
                {isExpanded && (
                  <div>
                    {/* SECTION 1: WORKFLOW STAGE PROGRESS & ACTION WORKBENCH */}
                    {task.type === 'IMMEDIATE' ? (
                      // IMMEDIATE REQUEST STAGE-BASED PROGRESS
                      <div
                        style={{
                          marginBottom: '1rem',
                          padding: '0.9rem 1.1rem',
                          backgroundColor: 'var(--bg-card-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(218, 165, 32, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={15} color="var(--jns-gold)" />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                              Immediate Request Stage Progress
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                task.status === 'COMPLETED'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : task.status === 'READY_FOR_REVIEW'
                                  ? 'rgba(218, 165, 32, 0.15)'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'rgba(56, 189, 248, 0.15)'
                                  : task.status === 'REVISION_REQUIRED'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(148, 163, 184, 0.1)',
                              color:
                                task.status === 'COMPLETED'
                                  ? '#22c55e'
                                  : task.status === 'READY_FOR_REVIEW'
                                  ? 'var(--jns-gold)'
                                  : task.status === 'IN_PROGRESS'
                                  ? '#38bdf8'
                                  : task.status === 'REVISION_REQUIRED'
                                  ? '#ef4444'
                                  : '#94a3b8',
                            }}
                          >
                            Current Stage: {task.status === 'READY_FOR_REVIEW' ? 'Awaiting Approval' : task.status === 'COMPLETED' ? 'Approved & Archived' : task.status === 'REVISION_REQUIRED' ? 'Revisions Requested' : task.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* 4-Stage Visual Stepper */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '0.5rem',
                            marginBottom: '0.85rem',
                          }}
                        >
                          {[
                            { key: 'NOT_STARTED', step: 1, label: '1. Not Started', isPassed: task.status !== 'NOT_STARTED' },
                            { key: 'IN_PROGRESS', step: 2, label: '2. In Progress', isPassed: task.status === 'READY_FOR_REVIEW' || task.status === 'COMPLETED' },
                            { key: 'READY_FOR_REVIEW', step: 3, label: '3. Awaiting Approval', isPassed: task.status === 'COMPLETED' },
                            { key: 'COMPLETED', step: 4, label: '4. Approved & Archived', isPassed: task.status === 'COMPLETED' },
                          ].map((st) => {
                            const isCurrent =
                              task.status === st.key ||
                              (st.key === 'IN_PROGRESS' && task.status === 'REVISION_REQUIRED');
                            return (
                              <div
                                key={st.key}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isCurrent ? 'rgba(218, 165, 32, 0.12)' : st.isPassed ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-card)',
                                  border: isCurrent ? '1.5px solid var(--jns-gold)' : st.isPassed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                {st.isPassed ? (
                                  <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                                ) : isCurrent ? (
                                  <div
                                    style={{
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      backgroundColor: 'var(--jns-gold)',
                                      boxShadow: '0 0 8px var(--jns-gold)',
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      border: '1px solid var(--text-muted)',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent ? 'var(--jns-gold)' : st.isPassed ? '#22c55e' : 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {st.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Stage Specific Action & Review Prompt */}
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          {task.status === 'NOT_STARTED' && (
                            <>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                This request is in queue. Click <strong>Start</strong> to begin design work and open project materials.
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '12px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                                onClick={() => handleStartImmediateTask(task.id)}
                              >
                                <Play size={13} />
                                <span>Start</span>
                              </button>
                            </>
                          )}

                          {task.status === 'IN_PROGRESS' && (
                            <>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Currently in progress. Once graphics/MOGRT are completed, submit for review to alert <strong>{getTaskProducerName(task)}</strong>.
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '12px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--jns-gold)', borderColor: 'var(--jns-gold)', color: '#000', fontWeight: 700 }}
                                onClick={() => handleOpenSubmitModal(task)}
                              >
                                <Send size={13} />
                                <span>Submit for Review</span>
                              </button>
                            </>
                          )}

                          {task.status === 'READY_FOR_REVIEW' && (
                            isResponsibleProducer(task) ? (
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--jns-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={14} />
                                    <span>Review Task: Submitted by {task.assignedUserName || 'Designer'}</span>
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Inspect deliverable file and either approve &amp; archive or request revisions with additional placeholders.
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                    onClick={() => handleApproveTask(task)}
                                  >
                                    <Check size={13} />
                                    <span>Approve &amp; Archive</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: '#ef4444', color: '#ef4444' }}
                                    onClick={() => handleOpenRevisionModal(task)}
                                  >
                                    <AlertCircle size={13} />
                                    <span>Request Revisions</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="var(--jns-gold)" />
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--jns-gold)' }}>
                                    Status: Awaiting Approval (Submitted for Review)
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                    Your graphics submission is with responsible producer <strong>{getTaskProducerName(task)}</strong>. You will be notified automatically upon review.
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                          {task.status === 'REVISION_REQUIRED' && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <AlertCircle size={14} />
                                  <span>Revisions Requested by {getTaskProducerName(task)}</span>
                                </div>
                                {task.reviewNotes && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '3px', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid #ef4444' }}>
                                    &ldquo;{task.reviewNotes}&rdquo;
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Additional asset &amp; reference placeholders have been added below. Make revisions and re-submit.
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '12px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--jns-gold)', borderColor: 'var(--jns-gold)', color: '#000', fontWeight: 700 }}
                                onClick={() => handleOpenSubmitModal(task)}
                              >
                                <Send size={13} />
                                <span>Re-Submit for Review</span>
                              </button>
                            </div>
                          )}

                          {task.status === 'COMPLETED' && (
                            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={16} color="#22c55e" />
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#22c55e' }}>
                                  Task Approved &amp; Archived
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  Approved by {getTaskProducerName(task)} on {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'today'}. Deliverables ready in production archive.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // LONG-TERM WORKFLOW STATUS STEPPER
                      <div
                        style={{
                          marginBottom: '1rem',
                          padding: '0.75rem 1rem',
                          backgroundColor: 'var(--bg-card-subtle)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} color="var(--jns-gold)" />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Workflow Status Stepper
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              — click any stage to advance
                            </span>
                          </div>
                          <span
                            className={`status-chip ${
                              task.status === 'IN_PROGRESS'
                                ? 'status-in-progress'
                                : task.status === 'READY_FOR_REVIEW'
                                ? 'status-waiting'
                                : task.status === 'COMPLETED'
                                ? 'status-completed'
                                : task.status === 'REVISION_REQUIRED'
                                ? 'status-revision'
                                : 'status-not-started'
                            }`}
                            style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}
                          >
                            Current: {task.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                          {TASK_STATUS_OPTIONS.map((stOpt) => {
                            const isCurrent = task.status === stOpt.key;
                            return (
                              <button
                                key={stOpt.key}
                                type="button"
                                onClick={() => handleUpdateStatus(task.id, stOpt.key)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  padding: '7px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: isCurrent ? 800 : 600,
                                  cursor: 'pointer',
                                  backgroundColor: isCurrent ? stOpt.bg : 'var(--bg-card)',
                                  color: isCurrent ? stOpt.color : 'var(--text-muted)',
                                  border: isCurrent ? `2px solid ${stOpt.color}` : '1px solid var(--border-subtle)',
                                  boxShadow: isCurrent ? `0 0 10px ${stOpt.bg}` : 'none',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isCurrent && <Check size={12} style={{ strokeWidth: 3 }} />}
                                {stOpt.key === 'IN_PROGRESS' && !isCurrent && <Play size={11} />}
                                <span>{stOpt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: ASSETS & PRODUCTION FILES WORKBENCH ("easier approach to assets") */}
                    <div
                      style={{
                        marginBottom: '1rem',
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(218, 165, 32, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FolderOpen size={16} color="var(--jns-gold)" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Project Assets & Production Materials
                          </span>
                          <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', backgroundColor: 'rgba(218, 165, 32, 0.15)', color: 'var(--jns-gold)', fontWeight: 700 }}>
                            {(task.assets || []).length} attached
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11.5px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--jns-gold)', borderColor: 'rgba(218, 165, 32, 0.35)' }}
                            onClick={() => {
                              if (addingAssetTaskId === task.id) {
                                setAddingAssetTaskId(null);
                              } else {
                                setAddingAssetTaskId(task.id);
                                setNewAssetTitle('');
                                setNewAssetUrl('');
                              }
                            }}
                          >
                            <Plus size={13} />
                            <span>{addingAssetTaskId === task.id ? 'Close' : 'Add Asset Link'}</span>
                          </button>
                        )}
                      </div>

                      {/* Inline Add Asset Form */}
                      {addingAssetTaskId === task.id && (
                        <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--jns-gold)', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jns-gold)', marginBottom: '6px' }}>
                            Attach Asset Link (Dropbox / Google Drive / Frame.io / Cloud)
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ flex: '1 1 180px', fontSize: '12px', height: '32px' }}
                              placeholder="Asset Title (e.g. Anchor PNG, Show Stinger, Brand Guide)"
                              value={newAssetTitle}
                              onChange={(e) => setNewAssetTitle(e.target.value)}
                            />
                            <input
                              type="url"
                              className="form-input"
                              style={{ flex: '2 1 280px', fontSize: '12px', height: '32px' }}
                              placeholder="https://dropbox.com/... or https://drive.google.com/..."
                              value={newAssetUrl}
                              onChange={(e) => setNewAssetUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddAsset(task.id);
                                }
                              }}
                              autoFocus
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11.5px', height: '28px' }}
                              onClick={() => setAddingAssetTaskId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '11.5px', height: '28px', padding: '0 12px' }}
                              disabled={!newAssetUrl.trim() || savingAsset}
                              onClick={() => handleQuickAddAsset(task.id)}
                            >
                              {savingAsset ? 'Saving...' : 'Save Asset'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Assets List */}
                      {(!task.assets || task.assets.length === 0) ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '0.4rem 0.25rem', fontStyle: 'italic' }}>
                          No assets attached yet. Click "+ Add Asset Link" above to add footage, logo files, or Dropbox folders.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
                          {task.assets.map((ast, i) => (
                            <div
                              key={ast.id || i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                backgroundColor: !ast.url ? 'rgba(218, 165, 32, 0.08)' : 'var(--bg-card)',
                                borderRadius: '6px',
                                border: !ast.url ? '1px dashed var(--jns-gold)' : '1px solid var(--border-subtle)',
                                gap: '8px',
                              }}
                            >
                              {ast.url ? (
                                <a
                                  href={ast.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    color: 'var(--text-main)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                  title={ast.url}
                                >
                                  <FileText size={14} color="var(--jns-gold)" style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ast.title || 'Asset Link'}
                                  </span>
                                  <ExternalLink size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                </a>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                  <FileText size={14} color="var(--jns-gold)" style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-main)', fontWeight: 600 }}>
                                    {ast.title || 'Additional Asset Placeholder'}
                                  </span>
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(218, 165, 32, 0.18)', color: 'var(--jns-gold)', fontWeight: 700, flexShrink: 0 }}>
                                    Placeholder
                                  </span>
                                </div>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                                  onClick={() => handleQuickRemoveAsset(task.id, ast.id)}
                                  title="Remove asset"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* References Sub-panel */}
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ExternalLink size={14} color="#38bdf8" />
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Reference Links & Inspiration
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ({(task.references || []).length})
                            </span>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                if (addingRefTaskId === task.id) {
                                  setAddingRefTaskId(null);
                                } else {
                                  setAddingRefTaskId(task.id);
                                  setNewRefTitle('');
                                  setNewRefUrl('');
                                }
                              }}
                            >
                              <Plus size={12} />
                              <span>{addingRefTaskId === task.id ? 'Close' : 'Add Reference'}</span>
                            </button>
                          )}
                        </div>

                        {addingRefTaskId === task.id && (
                          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed #38bdf8', marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ flex: '1 1 180px', fontSize: '12px', height: '30px' }}
                                placeholder="Reference Title (e.g. Motion Style Example)"
                                value={newRefTitle}
                                onChange={(e) => setNewRefTitle(e.target.value)}
                              />
                              <input
                                type="url"
                                className="form-input"
                                style={{ flex: '2 1 250px', fontSize: '12px', height: '30px' }}
                                placeholder="https://..."
                                value={newRefUrl}
                                onChange={(e) => setNewRefUrl(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickAddReference(task.id);
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', height: '26px' }}
                                onClick={() => setAddingRefTaskId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '11px', height: '26px', padding: '0 10px' }}
                                disabled={!newRefUrl.trim() || savingRef}
                                onClick={() => handleQuickAddReference(task.id)}
                              >
                                {savingRef ? 'Saving...' : 'Save Reference'}
                              </button>
                            </div>
                          </div>
                        )}

                        {task.references && task.references.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {task.references.map((ref, i) => (
                              <div
                                key={ref.id || i}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 8px',
                                  backgroundColor: !ref.url ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-card)',
                                  borderRadius: '4px',
                                  border: !ref.url ? '1px dashed #38bdf8' : '1px solid var(--border-subtle)',
                                  fontSize: '11.5px',
                                }}
                              >
                                {ref.url ? (
                                  <a
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <span>{ref.title || 'Reference Link'}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 600 }}>
                                    <span>{ref.title || 'Reference Placeholder'}</span>
                                    <span style={{ fontSize: '9.5px', padding: '0 4px', borderRadius: '3px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                                      Placeholder
                                    </span>
                                  </div>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px' }}
                                    onClick={() => handleQuickRemoveReference(task.id, ref.id)}
                                    title="Remove reference"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Final Completed Deliverable URL */}
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} color="#22c55e" />
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                              Final Completed Deliverable File
                            </span>
                          </div>
                          {canEdit && editingDeliverableTaskId !== task.id && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              onClick={() => {
                                setEditingDeliverableTaskId(task.id);
                                setInlineDeliverableUrl(task.deliverableUrl || '');
                              }}
                            >
                              <Pencil size={11} />
                              <span>{task.deliverableUrl ? 'Change Link' : '+ Add Deliverable Link'}</span>
                            </button>
                          )}
                        </div>

                        {editingDeliverableTaskId === task.id ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="url"
                              className="form-input"
                              style={{ flex: 1, height: '30px', fontSize: '12px' }}
                              placeholder="https://dropbox.com/... or https://drive.google.com/... (final MOGRT or graphic export)"
                              value={inlineDeliverableUrl}
                              onChange={(e) => setInlineDeliverableUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickSaveDeliverable(task.id);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ height: '30px', fontSize: '11.5px', padding: '0 10px' }}
                              disabled={savingDeliverable}
                              onClick={() => handleQuickSaveDeliverable(task.id)}
                            >
                              {savingDeliverable ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '30px', fontSize: '11.5px', padding: '0 8px' }}
                              onClick={() => setEditingDeliverableTaskId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : task.deliverableUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <a
                              href={task.deliverableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#22c55e', borderColor: '#22c55e' }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Open Completed Graphic File</span>
                              <ExternalLink size={12} />
                            </a>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                              {task.deliverableUrl}
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No deliverable URL posted yet. Paste final Dropbox or Premiere MOGRT download link once ready.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION: NOTES & STATUS UPDATES TO RESPONSIBLE PRODUCER */}
                    <div
                      style={{
                        marginBottom: '1rem',
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MessageSquareQuote size={16} color="#38bdf8" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Notes &amp; Status Updates to Producer
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '1px 7px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 700,
                            }}
                          >
                            {(task.statusNotes || []).length} logged
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <User size={12} color="var(--jns-gold)" />
                          <span>Responsible Producer:</span>
                          <strong style={{ color: 'var(--jns-gold)' }}>
                            {getTaskProducerName(task)}
                          </strong>
                        </div>
                      </div>

                      {/* Timeline of past status notes */}
                      {(!task.statusNotes || task.statusNotes.length === 0) ? (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            padding: '0.65rem 0.5rem',
                            fontStyle: 'italic',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '6px',
                            border: '1px dashed var(--border-subtle)',
                            marginBottom: '0.75rem',
                          }}
                        >
                          No status notes written yet. Notes entered when changing status or typed below will appear here and alert {getTaskProducerName(task)}.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: '0.85rem',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            paddingRight: '4px',
                          }}
                        >
                          {task.statusNotes.map((sn, idx) => {
                            const toStatusOpt =
                              TASK_STATUS_OPTIONS.find((s) => s.key === sn.toStatus) || {
                                label: sn.toStatus,
                                bg: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                              };
                            const fromStatusOpt = sn.fromStatus
                              ? TASK_STATUS_OPTIONS.find((s) => s.key === sn.fromStatus)
                              : null;

                            return (
                              <div
                                key={sn.id || idx}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: 'var(--bg-card)',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                                      {sn.authorName || 'Designer'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      → {sn.producerName || getTaskProducerName(task)}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {fromStatusOpt && (
                                      <>
                                        <span
                                          style={{
                                            fontSize: '10.5px',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: fromStatusOpt.bg,
                                            color: fromStatusOpt.color,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {fromStatusOpt.label}
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>→</span>
                                      </>
                                    )}
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: toStatusOpt.bg,
                                        color: toStatusOpt.color,
                                        fontWeight: 700,
                                        border: `1px solid ${toStatusOpt.color}40`,
                                      }}
                                    >
                                      {toStatusOpt.label}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {new Date(sn.createdAt).toLocaleString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {sn.note ? (
                                  <div
                                    style={{
                                      fontSize: '12.5px',
                                      color: 'var(--text-secondary)',
                                      lineHeight: '1.4',
                                      paddingLeft: '8px',
                                      borderLeft: '2px solid #38bdf8',
                                      marginTop: '2px',
                                    }}
                                  >
                                    {sn.note}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      fontSize: '11.5px',
                                      color: 'var(--text-muted)',
                                      fontStyle: 'italic',
                                      marginTop: '2px',
                                    }}
                                  >
                                    Status changed to {toStatusOpt.label} (no note attached)
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline quick note input */}
                      {canEdit && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-card)',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, height: '30px', fontSize: '12px' }}
                            placeholder={`Write a direct note to ${getTaskProducerName(task)}...`}
                            value={inlineProducerNotes[task.id] || ''}
                            onChange={(e) =>
                              setInlineProducerNotes((prev) => ({ ...prev, [task.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSendProducerNote(task.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              height: '30px',
                              fontSize: '11.5px',
                              padding: '0 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#0284c7',
                              borderColor: '#0284c7',
                            }}
                            disabled={
                              !(inlineProducerNotes[task.id] || '').trim() ||
                              sendingProducerNoteTaskId === task.id
                            }
                            onClick={() => handleSendProducerNote(task.id)}
                          >
                            <Send size={12} />
                            <span>{sendingProducerNoteTaskId === task.id ? 'Sending...' : 'Send Note'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: LONG-TERM PROJECT 8-STAGE SUBTASKS PIPELINE */}
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
                              {st.isMainTask ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleCardTaskCollapse(st.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      color: 'var(--text-muted)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      borderRadius: '3px',
                                    }}
                                    title={collapsedCardSubtasks[st.id] ? 'Expand subtasks' : 'Collapse subtasks'}
                                  >
                                    {collapsedCardSubtasks[st.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      background: 'rgba(218, 165, 32, 0.15)',
                                      color: 'var(--jns-gold)',
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    Main Task
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleCardTaskCollapse(st.id)}
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '10px',
                                      background: collapsedCardSubtasks[st.id] ? 'rgba(218, 165, 32, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid var(--border-subtle)',
                                      color: collapsedCardSubtasks[st.id] ? 'var(--jns-gold)' : 'var(--text-muted)',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={collapsedCardSubtasks[st.id] ? 'Click to expand subtasks' : 'Click to collapse subtasks'}
                                  >
                                    {st.subtasks?.length || 0} subtask{(st.subtasks?.length || 0) === 1 ? '' : 's'}
                                    <span style={{ fontSize: '9px' }}>{collapsedCardSubtasks[st.id] ? '▸' : '▾'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: currentStageInfo.color,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
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
                                      fontWeight: st.isMainTask ? 700 : 600,
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

                            {/* Dropdown Menu & Delete Button */}
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
                                value={
                                  st.isMainTask
                                    ? st.status === 'DONE'
                                      ? 'DONE'
                                      : st.status === 'STARTED' || st.status === 'IN_PROGRESS'
                                      ? 'STARTED'
                                      : 'NOT_STARTED'
                                    : st.status
                                }
                                onChange={(e) =>
                                  handleUpdateSubtaskStatus(
                                    task.id,
                                    st.id,
                                    e.target.value as GraphicSubtaskStatus
                                  )
                                }
                              >
                                {(st.isMainTask ? MAIN_TASK_DROPDOWN_OPTIONS : SUBTASK_8_STAGE_OPTIONS).map((stage) => (
                                  <option key={stage.key} value={stage.key}>
                                    {stage.label}
                                  </option>
                                ))}
                              </select>

                              {/* + Subtask Button on Main Task */}
                              {canEdit && st.isMainTask && (
                                <button
                                  className="btn btn-secondary btn-xs"
                                  style={{
                                    height: '28px',
                                    fontSize: '11px',
                                    padding: '0 7px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onClick={() => {
                                    setAddingSubtaskTaskId(task.id);
                                    setAddingSubtaskParentId(st.id);
                                    setCollapsedCardSubtasks((prev) => ({ ...prev, [st.id]: false }));
                                  }}
                                  title="Add subtask to this main task"
                                >
                                  <Plus size={11} /> Subtask
                                </button>
                              )}

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

                            {/* If Main Task has nested subtasks (Collapsible) */}
                            {st.isMainTask && !collapsedCardSubtasks[st.id] && (
                              <div
                                style={{
                                  width: '100%',
                                  marginLeft: '16px',
                                  paddingLeft: '12px',
                                  borderLeft: '2px solid var(--border-subtle)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  marginTop: '4px',
                                }}
                              >
                                {(!st.subtasks || st.subtasks.length === 0) ? (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '3px 0' }}>
                                    No subtasks yet. Click &quot;+ Subtask&quot; to add one.
                                  </div>
                                ) : (
                                  st.subtasks.map((child) => {
                                    const childStageInfo =
                                      SUBTASK_STAGES.find((s) => s.key === child.status) || SUBTASK_STAGES[0];
                                    return (
                                      <div
                                        key={child.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '4px 8px',
                                          backgroundColor: 'var(--bg-card)',
                                          borderRadius: '4px',
                                          border: '1px solid var(--border-subtle)',
                                          gap: '8px',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>↳</span>
                                          <span
                                            style={{
                                              fontSize: '12px',
                                              fontWeight: 500,
                                              color: child.status === 'DONE' ? 'var(--text-muted)' : 'var(--text-main)',
                                              textDecoration: child.status === 'DONE' ? 'line-through' : 'none',
                                            }}
                                          >
                                            {child.title}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <select
                                            className="form-select"
                                            style={{
                                              fontSize: '11px',
                                              padding: '2px 6px',
                                              height: '26px',
                                              borderColor: childStageInfo.color,
                                              color: childStageInfo.color,
                                              fontWeight: 600,
                                              backgroundColor: 'var(--bg-card)',
                                            }}
                                            value={child.status}
                                            onChange={(e) =>
                                              handleUpdateSubtaskStatus(
                                                task.id,
                                                child.id,
                                                e.target.value as GraphicSubtaskStatus
                                              )
                                            }
                                          >
                                            {SUBTASK_8_STAGE_OPTIONS.map((stage) => (
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
                                                padding: '3px',
                                              }}
                                              onClick={() => handleDeleteSubtask(task.id, child.id)}
                                              title="Delete subtask"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}

                                {canEdit && (
                                  <div style={{ marginTop: '2px' }}>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--jns-gold)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 0',
                                      }}
                                      onClick={() => {
                                        setAddingSubtaskTaskId(task.id);
                                        setAddingSubtaskParentId(st.id);
                                        setCollapsedCardSubtasks((prev) => ({ ...prev, [st.id]: false }));
                                      }}
                                    >
                                      <Plus size={11} /> Add subtask to {st.title}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
                          {addingSubtaskParentId && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: 'var(--jns-gold)',
                                background: 'rgba(218, 165, 32, 0.15)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ↳ {task.subtasks.find((s) => s.id === addingSubtaskParentId)?.title || 'Main Task'}
                            </span>
                          )}
                          <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, height: '28px', fontSize: '12px' }}
                            placeholder={
                              addingSubtaskParentId
                                ? `Subtask name for "${task.subtasks.find((s) => s.id === addingSubtaskParentId)?.title || 'Milestone'}"...`
                                : 'Subtask name (e.g. Lower Third MOGRT, Intro Stinger, Video Wall Loop)...'
                            }
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubtask(task.id, addingSubtaskParentId || undefined);
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
                            {SUBTASK_8_STAGE_OPTIONS.map((stage) => (
                              <option key={stage.key} value={stage.key}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ height: '28px', padding: '0 10px', fontSize: '11.5px' }}
                            onClick={() => handleAddSubtask(task.id, addingSubtaskParentId || undefined)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ height: '28px', padding: '0 8px', fontSize: '11.5px' }}
                            onClick={() => {
                              setAddingSubtaskTaskId(null);
                              setAddingSubtaskParentId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

              {/* Row 3: Status & Assigned Producer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    {editingTask.type === 'IMMEDIATE' ? 'Stage-Based Progress' : 'Task Status'}
                  </label>
                  {editingTask.type === 'IMMEDIATE' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '34px', flexWrap: 'wrap' }}>
                      <span
                        className={`status-chip ${
                          editStatus === 'IN_PROGRESS'
                            ? 'status-in-progress'
                            : editStatus === 'READY_FOR_REVIEW'
                            ? 'status-waiting'
                            : editStatus === 'COMPLETED'
                            ? 'status-completed'
                            : editStatus === 'REVISION_REQUIRED'
                            ? 'status-revision'
                            : 'status-not-started'
                        }`}
                        style={{ fontSize: '11.5px', padding: '3px 8px', fontWeight: 700 }}
                      >
                        {editStatus === 'READY_FOR_REVIEW'
                          ? 'Awaiting Approval'
                          : editStatus === 'COMPLETED'
                          ? 'Approved & Archived'
                          : editStatus === 'REVISION_REQUIRED'
                          ? 'Revisions Requested'
                          : editStatus.replace(/_/g, ' ')}
                      </span>
                      {editStatus === 'NOT_STARTED' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                          onClick={() => setEditStatus('IN_PROGRESS')}
                        >
                          <Play size={11} style={{ marginRight: '3px' }} />
                          Start
                        </button>
                      )}
                      {(editStatus === 'IN_PROGRESS' || editStatus === 'REVISION_REQUIRED') && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: 'var(--jns-gold)', borderColor: 'var(--jns-gold)', color: '#000', fontWeight: 700 }}
                          onClick={() => setEditStatus('READY_FOR_REVIEW')}
                        >
                          <Send size={11} style={{ marginRight: '3px' }} />
                          Submit for review
                        </button>
                      )}
                      {editStatus === 'READY_FOR_REVIEW' && (
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                            onClick={() => setEditStatus('COMPLETED')}
                          >
                            <Check size={11} style={{ marginRight: '3px' }} />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '3px 8px', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => setEditStatus('REVISION_REQUIRED')}
                          >
                            <AlertCircle size={11} style={{ marginRight: '3px' }} />
                            Revisions
                          </button>
                        </div>
                      )}
                      {editStatus === 'COMPLETED' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--text-muted)' }}
                          onClick={() => setEditStatus('IN_PROGRESS')}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Producer</label>
                  <select
                    className="form-select"
                    value={editAssignedUserId}
                    onChange={(e) => setEditAssignedUserId(e.target.value)}
                  >
                    {producerOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.fullName})
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
                      Status options: Not Started, Started, Done
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
                          value={
                            st.isMainTask
                              ? st.status === 'DONE'
                                ? 'DONE'
                                : st.status === 'STARTED' || st.status === 'IN_PROGRESS'
                                ? 'STARTED'
                                : 'NOT_STARTED'
                              : st.status
                          }
                          onChange={(e) => handleModalSubtaskChange(idx, 'status', e.target.value)}
                        >
                          {(st.isMainTask ? MAIN_TASK_DROPDOWN_OPTIONS : SUBTASK_8_STAGE_OPTIONS).map((stage) => (
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

      {/* STATUS CHANGE & NOTE TO RESPONSIBLE PRODUCER MODAL */}
      {statusChangeModalOpen && statusChangeTask && statusChangeTargetStatus && (
        <div
          className="modal-overlay"
          onClick={() => !savingStatusChange && setStatusChangeModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '540px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <MessageSquareQuote size={18} />
                </div>
                <div>
                  <div className="modal-title">Status Change &amp; Note to Producer</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {statusChangeTask.title || statusChangeTask.projectName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !savingStatusChange && setStatusChangeModalOpen(false)}
                disabled={savingStatusChange}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status Transition Visual */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* From Status */}
                {(() => {
                  const fromOpt = TASK_STATUS_OPTIONS.find((s) => s.key === statusChangeTask.status) || {
                    label: statusChangeTask.status,
                    bg: 'rgba(148, 163, 184, 0.1)',
                    color: '#94a3b8',
                  };
                  return (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: fromOpt.bg,
                        color: fromOpt.color,
                        border: `1px solid ${fromOpt.color}40`,
                      }}
                    >
                      {fromOpt.label}
                    </span>
                  );
                })()}

                <ArrowRight size={16} color="var(--text-muted)" />

                {/* To Status */}
                {(() => {
                  const toOpt = TASK_STATUS_OPTIONS.find((s) => s.key === statusChangeTargetStatus) || {
                    label: statusChangeTargetStatus,
                    bg: 'rgba(56, 189, 248, 0.18)',
                    color: '#38bdf8',
                  };
                  return (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: toOpt.bg,
                        color: toOpt.color,
                        border: `1px solid ${toOpt.color}`,
                        boxShadow: `0 0 10px ${toOpt.bg}`,
                      }}
                    >
                      {toOpt.label}
                    </span>
                  );
                })()}
              </div>

              {/* Responsible Producer Information */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(218, 165, 32, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(218, 165, 32, 0.25)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(218, 165, 32, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--jns-gold)',
                  }}
                >
                  <User size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Responsible Producer
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jns-gold)' }}>
                    {getTaskProducerName(statusChangeTask)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(218, 165, 32, 0.15)',
                    color: 'var(--jns-gold)',
                    fontWeight: 600,
                  }}
                >
                  In-App Alert
                </span>
              </div>

              {/* Note Textarea */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Add a note to {getTaskProducerName(statusChangeTask)} regarding this status change (optional):
                </label>
                <textarea
                  className="form-input"
                  style={{
                    width: '100%',
                    minHeight: '90px',
                    padding: '10px',
                    fontSize: '12.5px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                  }}
                  placeholder={`Write details, questions, or updates for ${getTaskProducerName(statusChangeTask)} (e.g., "Finished initial draft, awaiting approval", "Assets link updated", "Needs clarification on lower third style")...`}
                  value={statusChangeNote}
                  onChange={(e) => setStatusChangeNote(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>This note will be saved in the task timeline and sent to the producer.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '1rem 1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', height: '34px' }}
                onClick={() => setStatusChangeModalOpen(false)}
                disabled={savingStatusChange}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', height: '34px' }}
                  onClick={() => handleConfirmStatusChange(false)}
                  disabled={savingStatusChange}
                  title="Update status immediately without writing a note"
                >
                  Update Without Note
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    fontSize: '12px',
                    height: '34px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    borderColor: '#0284c7',
                  }}
                  onClick={() => handleConfirmStatusChange(true)}
                  disabled={savingStatusChange}
                >
                  <Send size={13} />
                  <span>{savingStatusChange ? 'Updating...' : 'Update & Send Note'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT FOR REVIEW MODAL (IMMEDIATE REQUESTS) */}
      {submitReviewModalOpen && submitReviewTask && (
        <div
          className="modal-overlay"
          onClick={() => !savingSubmitReview && setSubmitReviewModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(218, 165, 32, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--jns-gold)',
                  }}
                >
                  <Send size={16} />
                </div>
                <div>
                  <div className="modal-title">Submit for Producer Review</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {submitReviewTask.title || submitReviewTask.projectName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !savingSubmitReview && setSubmitReviewModalOpen(false)}
                disabled={savingSubmitReview}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(218, 165, 32, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(218, 165, 32, 0.25)',
                }}
              >
                <User size={16} color="var(--jns-gold)" />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Assigned Producer: <strong style={{ color: 'var(--jns-gold)' }}>{getTaskProducerName(submitReviewTask)}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Status will change to <strong>Awaiting Approval</strong>. A review task and notification will be sent to the producer.
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Deliverable URL (Dropbox / Google Drive / Frame.io / Cloud Link):
                </label>
                <input
                  type="url"
                  className="form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12.5px' }}
                  placeholder="https://dropbox.com/... or https://drive.google.com/..."
                  value={submitDeliverableUrl}
                  onChange={(e) => setSubmitDeliverableUrl(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Note to Producer (optional):
                </label>
                <textarea
                  className="form-input"
                  style={{ width: '100%', minHeight: '80px', padding: '8px 10px', fontSize: '12px', resize: 'vertical' }}
                  placeholder="e.g. Finished lower third & intro stinger. Ready for review, please verify brand colors..."
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', height: '34px' }}
                onClick={() => setSubmitReviewModalOpen(false)}
                disabled={savingSubmitReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  fontSize: '12px',
                  height: '34px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--jns-gold)',
                  borderColor: 'var(--jns-gold)',
                  color: '#000',
                  fontWeight: 700,
                }}
                onClick={handleConfirmSubmitReview}
                disabled={savingSubmitReview}
              >
                <Send size={13} />
                <span>{savingSubmitReview ? 'Submitting...' : 'Submit for Review'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCER REVISION REQUEST MODAL */}
      {revisionModalOpen && revisionTask && (
        <div
          className="modal-overlay"
          onClick={() => !savingRevision && setRevisionModalOpen(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                  }}
                >
                  <AlertCircle size={18} />
                </div>
                <div>
                  <div className="modal-title">Request Revisions from Designer</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {revisionTask.title || revisionTask.projectName} • Designer: {revisionTask.assignedUserName || 'Assigned Designer'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !savingRevision && setRevisionModalOpen(false)}
                disabled={savingRevision}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Review Feedback &amp; Required Changes <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  style={{ width: '100%', minHeight: '90px', padding: '8px 10px', fontSize: '12.5px', resize: 'vertical' }}
                  placeholder="Detail the corrections, font adjustments, color matching, or styling revisions required by the designer..."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Additional Placeholders for Assets */}
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jns-gold)' }}>
                    Add Additional Asset Placeholders / Files
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setRevisionAdditionalAssets((prev) => [...prev, { title: '', url: '' }])}
                  >
                    <Plus size={11} /> Add Asset Slot
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {revisionAdditionalAssets.map((ast, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: '1 1 140px', height: '30px', fontSize: '11.5px' }}
                        placeholder="Asset Title (e.g. Clean PNG Logo)"
                        value={ast.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionAdditionalAssets((prev) => prev.map((item, idx) => (idx === i ? { ...item, title: val } : item)));
                        }}
                      />
                      <input
                        type="url"
                        className="form-input"
                        style={{ flex: '2 1 200px', height: '30px', fontSize: '11.5px' }}
                        placeholder="URL (optional, or leave blank as placeholder)"
                        value={ast.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionAdditionalAssets((prev) => prev.map((item, idx) => (idx === i ? { ...item, url: val } : item)));
                        }}
                      />
                      {revisionAdditionalAssets.length > 1 && (
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          onClick={() => setRevisionAdditionalAssets((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Placeholders for References */}
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                    Add Additional Reference Placeholders / Inspiration
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setRevisionAdditionalReferences((prev) => [...prev, { title: '', url: '' }])}
                  >
                    <Plus size={11} /> Add Reference Slot
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {revisionAdditionalReferences.map((ref, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: '1 1 140px', height: '30px', fontSize: '11.5px' }}
                        placeholder="Reference Title (e.g. Motion Style)"
                        value={ref.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionAdditionalReferences((prev) => prev.map((item, idx) => (idx === i ? { ...item, title: val } : item)));
                        }}
                      />
                      <input
                        type="url"
                        className="form-input"
                        style={{ flex: '2 1 200px', height: '30px', fontSize: '11.5px' }}
                        placeholder="URL (optional, or leave blank as placeholder)"
                        value={ref.url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRevisionAdditionalReferences((prev) => prev.map((item, idx) => (idx === i ? { ...item, url: val } : item)));
                        }}
                      />
                      {revisionAdditionalReferences.length > 1 && (
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          onClick={() => setRevisionAdditionalReferences((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', height: '34px' }}
                onClick={() => setRevisionModalOpen(false)}
                disabled={savingRevision}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{
                  fontSize: '12px',
                  height: '34px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                }}
                onClick={handleConfirmRevision}
                disabled={savingRevision || !revisionNotes.trim()}
              >
                <AlertCircle size={13} />
                <span>{savingRevision ? 'Sending Review...' : 'Send Review & Request Revisions'}</span>
              </button>
            </div>
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

      {/* Media Lightbox Modal for previewing graphic media assets */}
      <MediaLightboxModal
        isOpen={!!lightboxFile}
        file={lightboxFile}
        onClose={() => setLightboxFile(null)}
      />
    </div>
  );
}
