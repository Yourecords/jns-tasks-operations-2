'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Film,
  Link2,
  Check,
  ShieldCheck,
  Plus,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  X,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  Bell,
  Sparkles,
  Trash2,
  Pencil,
  Sliders,
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { User, Show, UserRole, JobFunction, ShowStatus, MemberType, AutomatedEmailAlertSettings } from '@/lib/types';
import { isEligibleEditor } from '@/lib/utils';

export default function AdminSettingsPage() {
  const { currentUser, allUsers, refreshUser, settings, refreshSettings } = useUser();
  const [activeTab, setActiveTab] = useState<'USERS' | 'SHOWS' | 'LINKS' | 'EMAIL'>('USERS');

  // Add user modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMemberType, setNewUserMemberType] = useState<MemberType>('STAFF');
  const [newUserPosition, setNewUserPosition] = useState<'producer' | 'video editor' | 'cameraman' | 'graphics'>('video editor');
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [userModalError, setUserModalError] = useState('');
  const [userModalSuccess, setUserModalSuccess] = useState('');

  // Delete user state
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Shows database
  const [shows, setShows] = useState<Show[]>([]);
  const [showModalOpen, setShowModalOpen] = useState(false);
  const [newShowName, setNewShowName] = useState('');
  const [newShowHosts, setNewShowHosts] = useState('');
  const [newShowProducerId, setNewShowProducerId] = useState('');
  const [newShowEditorId, setNewShowEditorId] = useState('');
  const [newShowRecDay, setNewShowRecDay] = useState('Monday');
  const [newShowPubDay, setNewShowPubDay] = useState('Tuesday');
  const [newShowDesc, setNewShowDesc] = useState('');
  const [newShowNotes, setNewShowNotes] = useState('');
  const [newShowStatus, setNewShowStatus] = useState<ShowStatus>('ACTIVE');

  // Edit show state
  const [editShowModalOpen, setEditShowModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [editShowName, setEditShowName] = useState('');
  const [editShowHosts, setEditShowHosts] = useState('');
  const [editShowProducerId, setEditShowProducerId] = useState('');
  const [editShowEditorId, setEditShowEditorId] = useState('');
  const [editShowRecDay, setEditShowRecDay] = useState('Monday');
  const [editShowPubDay, setEditShowPubDay] = useState('Tuesday');
  const [editShowDesc, setEditShowDesc] = useState('');
  const [editShowNotes, setEditShowNotes] = useState('');
  const [editShowStatus, setEditShowStatus] = useState<ShowStatus>('ACTIVE');
  const [editShowLoading, setEditShowLoading] = useState(false);
  const [editShowError, setEditShowError] = useState('');
  const [editShowSuccess, setEditShowSuccess] = useState('');

  // Delete show state
  const [deleteTargetShow, setDeleteTargetShow] = useState<Show | null>(null);
  const [deleteShowLoading, setDeleteShowLoading] = useState(false);
  const [deleteShowError, setDeleteShowError] = useState('');
  const [deleteShowSuccess, setDeleteShowSuccess] = useState('');

  // System links
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [emailUrl, setEmailUrl] = useState('');
  const [linkSaved, setLinkSaved] = useState(false);

  // Email Dispatcher State
  const [testEmailTarget, setTestEmailTarget] = useState(currentUser?.email || 'yskvirski@jns.org');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(settings?.emailNotificationsEnabled !== false);
  const [deadlineCheckLoading, setDeadlineCheckLoading] = useState(false);
  const [deadlineCheckResult, setDeadlineCheckResult] = useState<any | null>(null);

  // Automated Email Alert Preferences
  const defaultAlertConfig: AutomatedEmailAlertSettings = {
    enabled: true,
    morningDigestTime: '08:30',
    deadlineReminderTime: '15:00',
    includeTaskAssignments: true,
    includeStageHandoffs: true,
    includeBlockerAlerts: true,
    includeDeadlineReminders: true,
    includeProducerApprovals: true,
    includeWeekendAlerts: false,
    targetRoles: ['PRODUCER', 'ADMIN', 'TEAM_MEMBER'],
  };
  const [alertConfig, setAlertConfig] = useState<AutomatedEmailAlertSettings>(defaultAlertConfig);
  const [savingAlertConfig, setSavingAlertConfig] = useState(false);
  const [saveAlertSuccess, setSaveAlertSuccess] = useState('');
  const [saveAlertError, setSaveAlertError] = useState('');

  const handleOpenEditShow = (show: Show) => {
    setEditingShow(show);
    setEditShowName(show.name || '');
    setEditShowHosts(show.hosts || '');
    setEditShowProducerId(show.producerId || '');
    setEditShowEditorId(show.defaultEditorId || '');
    setEditShowRecDay(show.recordingDay || 'Monday');
    setEditShowPubDay(show.publicationDay || 'Tuesday');
    setEditShowDesc(show.description || '');
    setEditShowNotes(show.notes || '');
    setEditShowStatus(show.status || 'ACTIVE');
    setEditShowError('');
    setEditShowSuccess('');
    setEditShowModalOpen(true);
  };

  const fetchShows = async () => {
    try {
      const res = await fetch('/api/shows');
      const data = await res.json();
      if (data.shows) setShows(data.shows);
      return data.shows || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  useEffect(() => {
    fetchShows().then((loadedShows) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('modal') === 'addUser') {
          setUserModalOpen(true);
        }
        if (params.get('modal') === 'editShow' && loadedShows.length > 0) {
          const target = params.get('showId')
            ? loadedShows.find((s: any) => s.id === params.get('showId'))
            : loadedShows[0];
          if (target) handleOpenEditShow(target);
        }
        if (params.get('modal') === 'removeShow' && loadedShows.length > 0) {
          const target = params.get('showId')
            ? loadedShows.find((s: any) => s.id === params.get('showId'))
            : loadedShows[0];
          if (target) setDeleteTargetShow(target);
        }
        const tabParam = params.get('tab');
        if (tabParam === 'EMAIL' || tabParam === 'SHOWS' || tabParam === 'LINKS' || tabParam === 'USERS') {
          setActiveTab(tabParam as any);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (settings) {
      setScheduleUrl(settings.scheduleUrl);
      setEmailUrl(settings.productionEmailUrl);
      if (settings.emailAlertConfig) {
        setAlertConfig({
          ...defaultAlertConfig,
          ...settings.emailAlertConfig,
        });
      }
    }
  }, [settings]);

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'PRODUCER') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '16px', marginBottom: '0.5rem' }}>
          Access Restricted
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Only the Head of Video Production (Administrator) and Producers can access system administration.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setUserModalError('User Name is required.');
      return;
    }
    setUserModalLoading(true);
    setUserModalError('');
    setUserModalSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          fullName: newUserFullName.trim() || newUserName.trim(),
          email: newUserEmail.trim() || undefined,
          memberType: newUserMemberType,
          position: newUserPosition,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');

      setUserModalSuccess(`User ${data.user.name} added successfully!`);
      await refreshUser();
      setTimeout(() => {
        setUserModalOpen(false);
        setNewUserName('');
        setNewUserFullName('');
        setNewUserEmail('');
        setNewUserMemberType('STAFF');
        setNewUserPosition('video editor');
        setUserModalSuccess('');
      }, 800);
    } catch (err: any) {
      setUserModalError(err.message || 'An error occurred');
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleUpdateUserRole = async (id: string, role: UserRole, jobFunction: JobFunction) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role, jobFunction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      refreshUser();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(deleteTargetUser.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user');
      setDeleteSuccess(`User "${deleteTargetUser.fullName || deleteTargetUser.name}" was removed successfully.`);
      setTimeout(() => setDeleteSuccess(''), 4000);
      setDeleteTargetUser(null);
      refreshUser();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newShowName,
          hosts: newShowHosts,
          producerId: newShowProducerId || currentUser?.id,
          defaultEditorId: newShowEditorId || undefined,
          recordingDay: newShowRecDay,
          publicationDay: newShowPubDay,
          description: newShowDesc,
          notes: newShowNotes,
          status: newShowStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowModalOpen(false);
      setNewShowName('');
      setNewShowHosts('');
      setNewShowDesc('');
      setNewShowNotes('');
      setNewShowStatus('ACTIVE');
      fetchShows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShow) return;
    if (!editShowName.trim()) {
      setEditShowError('Show Name is required.');
      return;
    }
    setEditShowLoading(true);
    setEditShowError('');
    setEditShowSuccess('');

    try {
      const res = await fetch('/api/shows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingShow.id,
          name: editShowName.trim(),
          hosts: editShowHosts.trim(),
          producerId: editShowProducerId || currentUser?.id,
          defaultEditorId: editShowEditorId || undefined,
          recordingDay: editShowRecDay,
          publicationDay: editShowPubDay,
          description: editShowDesc.trim(),
          notes: editShowNotes.trim(),
          status: editShowStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update show');

      setEditShowSuccess(`Show "${data.show.name}" updated successfully!`);
      await fetchShows();
      setTimeout(() => {
        setEditShowModalOpen(false);
        setEditingShow(null);
        setEditShowSuccess('');
      }, 700);
    } catch (err: any) {
      setEditShowError(err.message || 'Failed to update show');
    } finally {
      setEditShowLoading(false);
    }
  };

  const handleConfirmDeleteShow = async () => {
    if (!deleteTargetShow) return;
    setDeleteShowLoading(true);
    setDeleteShowError('');
    try {
      const res = await fetch(`/api/shows?id=${encodeURIComponent(deleteTargetShow.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove show');
      setDeleteShowSuccess(`Show "${deleteTargetShow.name}" was removed successfully.`);
      setTimeout(() => setDeleteShowSuccess(''), 4000);
      setDeleteTargetShow(null);
      await fetchShows();
    } catch (err: any) {
      setDeleteShowError(err.message || 'Failed to remove show');
    } finally {
      setDeleteShowLoading(false);
    }
  };

  const handleSaveAlertConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAlertConfig(true);
    setSaveAlertSuccess('');
    setSaveAlertError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAlertConfig: alertConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update alert configuration');
      setSaveAlertSuccess('Automated email alert preferences saved successfully!');
      refreshSettings();
      setTimeout(() => setSaveAlertSuccess(''), 3500);
    } catch (err: any) {
      setSaveAlertError(err.message || 'Error saving alert configuration');
    } finally {
      setSavingAlertConfig(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleUrl,
          productionEmailUrl: emailUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLinkSaved(true);
      refreshSettings();
      setTimeout(() => setLinkSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestEmailResult({ success: true, message: data.message });
    } catch (err: any) {
      setTestEmailResult({ success: false, error: err.message });
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    setEmailAlertsEnabled(enabled);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotificationsEnabled: enabled }),
      });
      refreshSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunDeadlineCheck = async () => {
    setDeadlineCheckLoading(true);
    setDeadlineCheckResult(null);
    try {
      const res = await fetch('/api/email/check-deadlines', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeadlineCheckResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeadlineCheckLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          System Administration & Settings
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Manage user permissions, shows registry, and external production integrations
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-tab ${activeTab === 'USERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('USERS')}
        >
          <Users size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Users & Permissions ({allUsers.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'SHOWS' ? 'active' : ''}`}
          onClick={() => setActiveTab('SHOWS')}
        >
          <Film size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Shows Database ({shows.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'LINKS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LINKS')}
        >
          <Link2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
          System Links & Tools
        </button>
        <button
          className={`filter-tab ${activeTab === 'EMAIL' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('EMAIL');
            if (!testEmailTarget && currentUser?.email) {
              setTestEmailTarget(currentUser.email);
            }
          }}
        >
          <Mail size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Email Dispatcher & Alerts
        </button>
      </div>

      {/* TAB 1: USERS & PERMISSIONS (Item 2 & 34) */}
      {activeTab === 'USERS' && (
        <div className="section-panel">
          {deleteSuccess && (
            <div style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={16} />
              <span>{deleteSuccess}</span>
            </div>
          )}
          <div className="section-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-panel-title">
              <ShieldCheck size={16} color="var(--jns-gold)" />
              <span>User Roles & Operational Job Functions</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setUserModalError('');
                setUserModalSuccess('');
                setUserModalOpen(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <UserPlus size={14} />
              <span>Add User</span>
            </button>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Full Name</th>
                    <th>Member Type</th>
                    <th>Position on Site</th>
                    <th>Job Function</th>
                    <th>System Role (RBAC)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'var(--jns-gold)' }}>
                        {u.name}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {u.fullName || u.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </td>
                      <td>
                        {u.memberType === 'TEMPORARY' ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(234, 179, 8, 0.15)',
                              color: '#facc15',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                            }}
                          >
                            TEMPORARY
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                            }}
                          >
                            STAFF
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(229, 169, 60, 0.15)',
                            color: 'var(--jns-gold)',
                            border: '1px solid rgba(229, 169, 60, 0.25)',
                          }}
                        >
                          {u.positionDisplay || u.role}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={u.jobFunction}
                          onChange={(e) =>
                            handleUpdateUserRole(u.id, u.role, e.target.value as JobFunction)
                          }
                          style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
                        >
                          <option value="HEAD_OF_PRODUCTION">Head of Video Production</option>
                          <option value="PRODUCER">Producer</option>
                          <option value="VIDEO_EDITOR">Video Editor</option>
                          <option value="CAMERAMAN">Cameraman</option>
                          <option value="MOTION_GRAPHICS_DESIGNER">Motion Graphics Designer</option>
                          <option value="GRAPHIC_DESIGNER">Graphic Designer</option>
                          <option value="STUDIO_OPERATOR">Studio Operator</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUserRole(u.id, e.target.value as UserRole, u.jobFunction)
                          }
                          style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
                        >
                          <option value="TEAM_MEMBER">Team Member (Role A)</option>
                          <option value="PRODUCER">Producer (Role B)</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </td>
                      <td>
                        <span className="status-chip status-approved">ACTIVE</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {u.id === 'usr_yuri_admin' ? (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={13} color="#e5a93c" /> Primary Admin
                          </span>
                        ) : u.id === currentUser?.id ? (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                            }}
                          >
                            (Current User)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTargetUser(u);
                            }}
                            title={`Remove user ${u.name}`}
                            style={{
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: '#f87171',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHOWS DATABASE (Item 33) */}
      {activeTab === 'SHOWS' && (
        <div>
          {deleteShowSuccess && (
            <div className="alert-banner alert-banner-info" style={{ marginBottom: '1rem' }}>
              <Check size={15} color="#86efac" />
              <span style={{ color: '#86efac' }}>{deleteShowSuccess}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModalOpen(true)}>
              <Plus size={14} />
              <span>Add Recurring Show</span>
            </button>
          </div>

          <div className="section-panel">
            <div className="section-panel-body" style={{ padding: 0 }}>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Show Name</th>
                      <th style={{ maxWidth: '240px' }}>Hosts</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Lead Producer</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Schedule Days</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ textAlign: 'right', paddingRight: '1rem', width: '150px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shows.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{s.name}</td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.hosts}>
                          {s.hosts}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{allUsers.find((u) => u.id === s.producerId)?.name || s.producerId}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                            Rec: {s.recordingDay} • Pub: {s.publicationDay}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            className={`status-chip ${
                              s.status === 'ACTIVE'
                                ? 'status-approved'
                                : s.status === 'PAUSED'
                                ? 'status-in-progress'
                                : 'status-not-started'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: '1rem', width: '150px' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleOpenEditShow(s)}
                              title={`Edit ${s.name}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <Pencil size={12} color="var(--jns-gold)" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => {
                                setDeleteShowError('');
                                setDeleteTargetShow(s);
                              }}
                              title={`Remove show ${s.name}`}
                              style={{
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM LINKS (Items 24 & 25) */}
      {activeTab === 'LINKS' && (
        <div className="section-panel" style={{ maxWidth: '640px' }}>
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Link2 size={16} color="var(--jns-gold)" />
              <span>Configure External Production Tool URLs</span>
            </div>
          </div>
          <div className="section-panel-body">
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  JNS Video Production Schedule URL (Google Sheet, Google Calendar, Notion, or Airtable)
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={scheduleUrl}
                  onChange={(e) => setScheduleUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... or https://calendar.google.com/..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Production Mailbox Shortcut URL (Visible only to Producers & Admin)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={emailUrl}
                  onChange={(e) => setEmailUrl(e.target.value)}
                  placeholder="https://mail.google.com/mail/?view=cm&fs=1&to=production@jns.org"
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  Save System Links
                </button>
                {linkSaved && (
                  <span style={{ color: '#86efac', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Saved!
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: EMAIL DISPATCHER & ALERTS */}
      {activeTab === 'EMAIL' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Column: Status & Live Test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Connection Status Card */}
            <div className="section-panel">
              <div className="section-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-panel-title">
                  <Mail size={16} color="var(--jns-gold)" />
                  <span>Resend Outbound Dispatcher Status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: testEmailResult?.success ? '#10b981' : testEmailResult?.error ? '#ef4444' : '#f59e0b', display: 'inline-block', boxShadow: `0 0 8px ${testEmailResult?.success ? '#10b981' : testEmailResult?.error ? '#ef4444' : '#f59e0b'}` }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: testEmailResult?.success ? '#86efac' : testEmailResult?.error ? '#fca5a5' : '#fcd34d', textTransform: 'uppercase' }}>
                    {testEmailResult?.success ? 'Connected & Working' : testEmailResult?.error ? 'Test Failed' : 'Ready for Live Test'}
                  </span>
                </div>
              </div>

              <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ background: '#0b1120', padding: '12px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email Gateway:</span>
                    <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>Resend HTTPS API</span>
                    
                    <span style={{ color: 'var(--text-muted)' }}>Sender Address:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>notifications@jns-video.com</span>
                    
                    <span style={{ color: 'var(--text-muted)' }}>Authentication:</span>
                    <span style={{ color: '#86efac' }}>Resend API Key (stored securely in Railway)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Enable Automated Email Alerts</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dispatch emails on task assignment, stage handoff, and deadlines</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={(e) => handleToggleEmailNotifications(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--jns-red)', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Live Test Email Tool */}
            <div className="section-panel">
              <div className="section-panel-header">
                <div className="section-panel-title">
                  <Send size={16} color="var(--jns-gold)" />
                  <span>Send Live Test Email</span>
                </div>
              </div>
              <div className="section-panel-body">
                <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Recipient Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      placeholder="e.g. yskvirski@jns.org"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={testEmailSending}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Send size={14} />
                    {testEmailSending ? 'Dispatching via Resend...' : 'Send Live Test Email'}
                  </button>

                  {testEmailResult?.success && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#86efac', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} />
                      {testEmailResult.message}
                    </div>
                  )}

                  {testEmailResult?.error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      {testEmailResult.error}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Automated Reminders & Deadline Scanner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Deadline Reminders Card */}
            <div className="section-panel">
              <div className="section-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-panel-title">
                  <Clock size={16} color="var(--jns-gold)" />
                  <span>Upcoming & Overdue Deadline Scanner</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRunDeadlineCheck}
                  disabled={deadlineCheckLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Clock size={13} />
                  {deadlineCheckLoading ? 'Scanning...' : 'Run Deadline Check Now'}
                </button>
              </div>
              <div className="section-panel-body">
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                  Scans active productions for filming, editing, or publication deadlines due within 24 hours (or overdue) and sends immediate email alerts to assigned team members.
                </p>

                {deadlineCheckResult && (
                  <div style={{ background: '#0b1120', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '12px' }}>
                    <div style={{ color: '#86efac', fontWeight: 600, marginBottom: '6px' }}>
                      ✓ {deadlineCheckResult.message}
                    </div>
                    {deadlineCheckResult.details && deadlineCheckResult.details.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                        {deadlineCheckResult.details.map((d: any, idx: number) => (
                          <div key={idx} style={{ color: 'var(--text-muted)', fontSize: '11px', borderBottom: '1px solid #1f293d', paddingBottom: '4px' }}>
                            • <strong>{d.productionTitle}</strong> ({d.stage}): Alert sent to {d.recipient} (Due: {d.deadline})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        No urgent deadlines (≤ 24h) require alerts right now.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Automated Email Alerts Configuration Card */}
            <div className="section-panel">
              <div className="section-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="section-panel-title">
                  <Sliders size={16} color="var(--jns-gold)" />
                  <span>Automated Email Alerts Configuration</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`status-chip ${alertConfig.enabled ? 'status-approved' : 'status-not-started'}`}
                    style={{ fontSize: '10px', padding: '2px 7px' }}
                  >
                    {alertConfig.enabled ? 'ALERTS ACTIVE' : 'ALERTS PAUSED'}
                  </span>
                </div>
              </div>
              <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {saveAlertSuccess && (
                  <div className="alert-banner alert-banner-info" style={{ margin: 0, padding: '8px 12px', fontSize: '12px' }}>
                    <Check size={14} color="#86efac" />
                    <span style={{ color: '#86efac' }}>{saveAlertSuccess}</span>
                  </div>
                )}
                {saveAlertError && (
                  <div className="alert-banner alert-banner-danger" style={{ margin: 0, padding: '8px 12px', fontSize: '12px' }}>
                    <AlertTriangle size={14} />
                    <span>{saveAlertError}</span>
                  </div>
                )}

                {/* Master Alert Switch */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Automated Production Alerts Engine</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Master switch for dispatching workflow notifications & scheduled digests</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={alertConfig.enabled}
                    onChange={(e) => setAlertConfig({ ...alertConfig, enabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--jns-gold)', cursor: 'pointer' }}
                  />
                </div>

                {/* Scheduled Times */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>
                      ☀️ Morning Digest Time
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={alertConfig.morningDigestTime || '08:30'}
                      onChange={(e) => setAlertConfig({ ...alertConfig, morningDigestTime: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily tasks, today's recordings & agendas</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>
                      ⏰ Afternoon Reminder Time
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={alertConfig.deadlineReminderTime || '15:00'}
                      onChange={(e) => setAlertConfig({ ...alertConfig, deadlineReminderTime: e.target.value })}
                      style={{ fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Urgent deadline check before EOD cutoff</span>
                  </div>
                </div>

                {/* Included Triggers */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    What Is Included in Automated Alerts:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>🚀 <strong>New Task & Episode Assignments</strong></span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeTaskAssignments}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeTaskAssignments: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>📁 <strong>Stage Handoffs</strong> (Raw Files Uploaded, Package Ready)</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeStageHandoffs}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeStageHandoffs: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>🎬 <strong>Producer Reviews & Approvals</strong> (Draft review, notes, approval)</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeProducerApprovals}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeProducerApprovals: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>⚠️ <strong>Blocker Alerts</strong> (Immediate priority notice to Producer/Admin)</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeBlockerAlerts}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeBlockerAlerts: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>⏰ <strong>Upcoming Deadline Alerts</strong> (Approaching &le; 24h)</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeDeadlineReminders}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeDeadlineReminders: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0b1120', borderRadius: '6px', border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <span>📅 <strong>Weekend Dispatches</strong> (Include Friday/Sunday schedules)</span>
                      <input
                        type="checkbox"
                        checked={alertConfig.includeWeekendAlerts}
                        onChange={(e) => setAlertConfig({ ...alertConfig, includeWeekendAlerts: e.target.checked })}
                        style={{ accentColor: 'var(--jns-gold)' }}
                      />
                    </label>
                  </div>
                </div>

                {/* Target Recipient Roles */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Target Recipient Roles:
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {(['PRODUCER', 'ADMIN', 'TEAM_MEMBER'] as const).map((role) => {
                      const isChecked = alertConfig.targetRoles?.includes(role) ?? true;
                      return (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '5px 10px', borderRadius: '6px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = alertConfig.targetRoles || ['PRODUCER', 'ADMIN', 'TEAM_MEMBER'];
                              const next = e.target.checked
                                ? Array.from(new Set([...current, role]))
                                : current.filter((r) => r !== role);
                              setAlertConfig({ ...alertConfig, targetRoles: next as any });
                            }}
                            style={{ accentColor: 'var(--jns-gold)' }}
                          />
                          <span>
                            {role === 'TEAM_MEMBER' ? 'Editors & Crew (Team Members)' : role === 'PRODUCER' ? 'Producers' : 'Administrators'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveAlertConfig()}
                    disabled={savingAlertConfig}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={14} />
                    <span>{savingAlertConfig ? 'Saving Preferences...' : 'Save Alert Preferences'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SHOW MODAL */}
      {showModalOpen && (
        <div className="modal-overlay" onClick={() => setShowModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Recurring JNS Show</div>
              <button onClick={() => setShowModalOpen(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleCreateShow}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Show Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jerusalem Diplomatic Report"
                    value={newShowName}
                    onChange={(e) => setNewShowName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Host(s) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Traiman, Fleur Hassan-Nahoum"
                    value={newShowHosts}
                    onChange={(e) => setNewShowHosts(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Lead Producer</label>
                    <select
                      className="form-select"
                      value={newShowProducerId}
                      onChange={(e) => setNewShowProducerId(e.target.value)}
                    >
                      {allUsers
                        .filter((u) => u.role === 'PRODUCER' || u.role === 'ADMIN')
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Editor</label>
                    <select
                      className="form-select"
                      value={newShowEditorId}
                      onChange={(e) => setNewShowEditorId(e.target.value)}
                    >
                      <option value="">Select Default Editor</option>
                      {allUsers
                        .filter(isEligibleEditor)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.positionDisplay || (u.id === 'usr_yuri_admin' || u.name?.toLowerCase() === 'yuri' ? 'Admin' : 'Video Editor')})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Recording Day</label>
                    <select
                      className="form-select"
                      value={newShowRecDay}
                      onChange={(e) => setNewShowRecDay(e.target.value)}
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Flexible / TBD">Flexible / TBD</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Publication Day</label>
                    <select
                      className="form-select"
                      value={newShowPubDay}
                      onChange={(e) => setNewShowPubDay(e.target.value)}
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Flexible / TBD">Flexible / TBD</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Show Status</label>
                  <select
                    className="form-select"
                    value={newShowStatus}
                    onChange={(e) => setNewShowStatus(e.target.value as ShowStatus)}
                  >
                    <option value="ACTIVE">ACTIVE (In regular production)</option>
                    <option value="PAUSED">PAUSED (Temporarily on hiatus)</option>
                    <option value="ARCHIVED">ARCHIVED (Past season / concluded)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Editorial concept and format notes..."
                    value={newShowDesc}
                    onChange={(e) => setNewShowDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Production Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Studio setup, graphics templates, special requirements..."
                    value={newShowNotes}
                    onChange={(e) => setNewShowNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHOW MODAL */}
      {editShowModalOpen && editingShow && (
        <div className="modal-overlay" onClick={() => setEditShowModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 169, 60, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} color="var(--jns-gold)" />
                </div>
                <div>
                  <div className="modal-title">Modify Show Parameters</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Update details for <strong style={{ color: 'var(--jns-gold)' }}>{editingShow.name}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditShowModalOpen(false)}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateShow}>
              <div className="modal-body" style={{ gap: '0.9rem' }}>
                {editShowError && (
                  <div className="alert-banner alert-banner-danger">
                    <AlertTriangle size={15} />
                    <span>{editShowError}</span>
                  </div>
                )}
                {editShowSuccess && (
                  <div className="alert-banner alert-banner-info">
                    <Check size={15} color="#86efac" />
                    <span style={{ color: '#86efac' }}>{editShowSuccess}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Show Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={editShowName}
                    onChange={(e) => setEditShowName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Host(s) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Traiman, Fleur Hassan-Nahoum"
                    value={editShowHosts}
                    onChange={(e) => setEditShowHosts(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Lead Producer</label>
                    <select
                      className="form-select"
                      value={editShowProducerId}
                      onChange={(e) => setEditShowProducerId(e.target.value)}
                    >
                      {allUsers
                        .filter((u) => u.role === 'PRODUCER' || u.role === 'ADMIN')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.positionDisplay || u.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Editor</label>
                    <select
                      className="form-select"
                      value={editShowEditorId}
                      onChange={(e) => setEditShowEditorId(e.target.value)}
                    >
                      <option value="">No Default Editor</option>
                      {allUsers
                        .filter(isEligibleEditor)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.positionDisplay || (u.id === 'usr_yuri_admin' || u.name?.toLowerCase() === 'yuri' ? 'Admin' : 'Video Editor')})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Recording Day</label>
                    <select
                      className="form-select"
                      value={editShowRecDay}
                      onChange={(e) => setEditShowRecDay(e.target.value)}
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Flexible / TBD">Flexible / TBD</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Publication Day</label>
                    <select
                      className="form-select"
                      value={editShowPubDay}
                      onChange={(e) => setEditShowPubDay(e.target.value)}
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Flexible / TBD">Flexible / TBD</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Show Status</label>
                    <select
                      className="form-select"
                      value={editShowStatus}
                      onChange={(e) => setEditShowStatus(e.target.value as ShowStatus)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Format Concept</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Editorial concept and format notes..."
                    value={editShowDesc}
                    onChange={(e) => setEditShowDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Production Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Technical guidelines, intro/outro templates, studio notes..."
                    value={editShowNotes}
                    onChange={(e) => setEditShowNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditShowModalOpen(false)}
                  disabled={editShowLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editShowLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>{editShowLoading ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SHOW CONFIRMATION MODAL */}
      {deleteTargetShow && (
        <div className="modal-overlay" onClick={() => setDeleteTargetShow(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} color="#ef4444" />
                </div>
                <div>
                  <div className="modal-title">Remove Recurring Show</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confirm deletion from shows database</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetShow(null)}
                disabled={deleteShowLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteShowError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '12px',
                  }}
                >
                  {deleteShowError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove the recurring show <strong style={{ color: 'var(--jns-gold)' }}>{deleteTargetShow.name}</strong>?
              </p>

              <div
                style={{
                  background: '#0b1120',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr',
                  rowGap: '6px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{deleteTargetShow.name}</span>

                <span style={{ color: 'var(--text-muted)' }}>Host(s):</span>
                <span style={{ color: 'var(--text-light)' }}>{deleteTargetShow.hosts || '—'}</span>

                <span style={{ color: 'var(--text-muted)' }}>Lead Producer:</span>
                <span style={{ color: 'var(--text-main)' }}>
                  {allUsers.find((u) => u.id === deleteTargetShow.producerId)?.name || deleteTargetShow.producerId}
                </span>

                <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                <span style={{ color: 'var(--text-light)' }}>
                  Rec: {deleteTargetShow.recordingDay} • Pub: {deleteTargetShow.publicationDay}
                </span>

                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span>
                  <span
                    className={`status-chip ${
                      deleteTargetShow.status === 'ACTIVE'
                        ? 'status-approved'
                        : deleteTargetShow.status === 'PAUSED'
                        ? 'status-in-progress'
                        : 'status-not-started'
                    }`}
                    style={{ fontSize: '10px', padding: '1px 6px' }}
                  >
                    {deleteTargetShow.status}
                  </span>
                </span>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  padding: '8px 10px',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: '6px',
                }}
              >
                <strong>Notice:</strong> Removing this show unlists it from recurring schedules and new episode presets. Existing episode tasks in the pipeline and production analytics will remain preserved.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTargetShow(null)}
                disabled={deleteShowLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteShow}
                disabled={deleteShowLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteShowLoading ? 'Removing Show...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {userModalOpen && (
        <div className="modal-overlay" onClick={() => setUserModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 169, 60, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={18} color="var(--jns-gold)" />
                </div>
                <div>
                  <div className="modal-title">Add Team Member</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Add staff member or temporary/freelance user
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ gap: '1rem' }}>
                {userModalError && (
                  <div className="alert-banner alert-banner-danger">
                    <AlertTriangle size={15} />
                    <span>{userModalError}</span>
                  </div>
                )}
                {userModalSuccess && (
                  <div className="alert-banner alert-banner-info">
                    <Check size={15} color="#86efac" />
                    <span style={{ color: '#86efac' }}>{userModalSuccess}</span>
                  </div>
                )}

                {/* Member Type Selection */}
                <div className="form-group">
                  <label className="form-label">
                    Member Type <span className="req">*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <label
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${newUserMemberType === 'STAFF' ? 'var(--jns-gold)' : 'var(--border-subtle)'}`,
                        backgroundColor: newUserMemberType === 'STAFF' ? 'rgba(229, 169, 60, 0.1)' : 'var(--bg-card-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="memberType"
                        value="STAFF"
                        checked={newUserMemberType === 'STAFF'}
                        onChange={() => setNewUserMemberType('STAFF')}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                          New Staff Member
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Permanent JNS Team
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${newUserMemberType === 'TEMPORARY' ? 'var(--jns-gold)' : 'var(--border-subtle)'}`,
                        backgroundColor: newUserMemberType === 'TEMPORARY' ? 'rgba(229, 169, 60, 0.1)' : 'var(--bg-card-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <input
                        type="radio"
                        name="memberType"
                        value="TEMPORARY"
                        checked={newUserMemberType === 'TEMPORARY'}
                        onChange={() => setNewUserMemberType('TEMPORARY')}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                          Temporary User
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Freelance / Contractor
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Position on Site */}
                <div className="form-group">
                  <label className="form-label">
                    Department Position <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={newUserPosition}
                    onChange={(e) => setNewUserPosition(e.target.value as any)}
                    required
                  >
                    <option value="producer">Producer (Produces shows, approves cuts)</option>
                    <option value="video editor">Video Editor (Draft edits, cut revisions)</option>
                    <option value="cameraman">Cameraman (Studio shoots, camera operator)</option>
                    <option value="graphics">Graphics (Motion designer, title graphics)</option>
                  </select>
                </div>

                {/* User Name & Full Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      User Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dan"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Short display name / handle
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dan Shavit"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      First & last name
                    </div>
                  </div>
                </div>

                {/* Work Email */}
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder={newUserName ? `${newUserName.toLowerCase().replace(/\s+/g, '')}@jns.org` : 'e.g. dan@jns.org'}
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Defaults to @jns.org if left blank
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUserModalOpen(false)}
                  disabled={userModalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={userModalLoading}
                >
                  {userModalLoading ? 'Adding User...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteTargetUser && (
        <div className="modal-overlay" onClick={() => setDeleteTargetUser(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <AlertTriangle size={18} />
                <span>Remove User</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={deleteLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {deleteError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--jns-gold)' }}>{deleteTargetUser.fullName || deleteTargetUser.name}</strong> from the system?
              </p>

              <div style={{
                background: '#0b1120',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                rowGap: '6px',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>User:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{deleteTargetUser.name}</span>

                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <span style={{ color: '#38bdf8' }}>{deleteTargetUser.email}</span>

                <span style={{ color: 'var(--text-muted)' }}>Position:</span>
                <span style={{ color: 'var(--text-main)' }}>{deleteTargetUser.positionDisplay || deleteTargetUser.role}</span>

                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span style={{ color: deleteTargetUser.memberType === 'TEMPORARY' ? '#facc15' : '#93c5fd' }}>
                  {deleteTargetUser.memberType || 'STAFF'}
                </span>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                padding: '8px 10px',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '6px',
              }}>
                <strong>Notice:</strong> This will revoke system access and remove them from dropdown assignments. Past completed tasks and audit history will remain intact.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTargetUser(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteUser}
                disabled={deleteLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
