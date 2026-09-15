'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Film,
  Compass,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  Video,
  Send,
  ExternalLink,
  AlertTriangle,
  History,
  MessageSquare,
  Sparkles,
  Link2,
  Trash2,
  CheckSquare,
  X,
  Lock
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Production, Comment, AuditLog, RevisionCycle } from '@/lib/types';
import { isEligibleEditor } from '@/lib/utils';
import WorkflowBreadcrumb from '@/components/WorkflowBreadcrumb';
import BlockedTaskModal from '@/components/BlockedTaskModal';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

export default function ProductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, allUsers } = useUser();
  const prodId = params?.id as string;

  const [production, setProduction] = useState<Production | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active inputs
  const [commentText, setCommentText] = useState('');

  // Stage 2: File Upload inputs
  const [uploadDropbox, setUploadDropbox] = useState('');
  const [uploadEditShare, setUploadEditShare] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  // Stage 3: Producer Package inputs
  const [pkgNotes, setPkgNotes] = useState('');
  const [pkgScript, setPkgScript] = useState('');
  const [pkgBroll, setPkgBroll] = useState('');
  const [pkgGraphics, setPkgGraphics] = useState('');
  const [pkgBrollLink, setPkgBrollLink] = useState('');
  const [pkgRefLink, setPkgRefLink] = useState('');

  // Stage 4: Submit Draft (Editor)
  const [draftReviewLink, setDraftReviewLink] = useState('');
  const [draftEditorNotes, setDraftEditorNotes] = useState('');

  // Stage 4: Review Draft (Producer)
  const [reviewNotes, setReviewNotes] = useState('');

  // Stage 6: Final Upload inputs
  const [finalYtUrl, setFinalYtUrl] = useState('');
  const [finalDropboxUrl, setFinalDropboxUrl] = useState('');

  // Stage 7: Published confirmation
  const [publishedYtUrl, setPublishedYtUrl] = useState('');

  // Rental inputs
  const [rentalClientLink, setRentalClientLink] = useState('');
  const [rentalFinanceContact, setRentalFinanceContact] = useState('');
  const [rentalFinanceAmount, setRentalFinanceAmount] = useState('');
  const [rentalFinanceNotes, setRentalFinanceNotes] = useState('');

  // Pilot to show conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertShowName, setConvertShowName] = useState('');
  const [convertHosts, setConvertHosts] = useState('');
  const [convertProducerId, setConvertProducerId] = useState('');
  const [convertEditorId, setConvertEditorId] = useState('');
  const [convertRecDay, setConvertRecDay] = useState('Wednesday');
  const [convertPubDay, setConvertPubDay] = useState('Thursday');
  const [convertDesc, setConvertDesc] = useState('');

  // Blocked modal
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockTargetTask, setBlockTargetTask] = useState<{ id: string; title: string } | null>(null);

  // Delete production & task states
  const [deleteProdModalOpen, setDeleteProdModalOpen] = useState(false);
  const [deleteProdLoading, setDeleteProdLoading] = useState(false);
  const [deleteProdError, setDeleteProdError] = useState('');

  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<any | null>(null);
  const [deleteSubtaskLoading, setDeleteSubtaskLoading] = useState(false);
  const [deleteSubtaskError, setDeleteSubtaskError] = useState('');

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/productions/${prodId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProduction(data.production);
      setComments(data.comments || []);
      setAuditLogs(data.auditLogs || []);

      if (data.production.youtubeUrl) {
        setPublishedYtUrl(data.production.youtubeUrl);
        setFinalYtUrl(data.production.youtubeUrl);
      }
      if (data.production.dropboxUrl) {
        setFinalDropboxUrl(data.production.dropboxUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load production');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 6000);
    return () => clearInterval(interval);
  }, [prodId]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading production details...</div>;
  }

  if (!production) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>Production not found.</div>
        <Link href="/productions" className="btn btn-secondary">
          Back to Productions
        </Link>
      </div>
    );
  }

  const getUserName = (id?: string) => {
    if (!id) return 'Unassigned';
    return allUsers.find((u) => u.id === id)?.name || id;
  };

  const isProducerOrAdmin =
    currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  const isStudioOrAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.jobFunction === 'STUDIO_OPERATOR' ||
    currentUser?.id === 'usr_ahron_studio';

  // Send workflow action
  const handleWorkflowAction = async (action: string, payload: any = {}) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/productions/${prodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Stage updated successfully!');
      fetchDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionId: prodId,
          content: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCommentText('');
      fetchDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Convert Pilot to Show
  const handleConvertPilot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`/api/pilots/${prodId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showName: convertShowName,
          hosts: convertHosts,
          producerId: convertProducerId || currentUser?.id,
          defaultEditorId: convertEditorId || undefined,
          recordingDay: convertRecDay,
          publicationDay: convertPubDay,
          description: convertDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowConvertModal(false);
      setSuccessMsg(`Successfully converted pilot into regular show: "${convertShowName}"!`);
      fetchDetails();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleConfirmDeleteProduction = async () => {
    setDeleteProdLoading(true);
    setDeleteProdError('');
    try {
      const res = await fetch(`/api/productions/${prodId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove production');
      router.push('/productions');
    } catch (err: any) {
      setDeleteProdError(err.message);
      setDeleteProdLoading(false);
    }
  };

  const handleConfirmDeleteSubtask = async () => {
    if (!deleteSubtaskTarget) return;
    setDeleteSubtaskLoading(true);
    setDeleteSubtaskError('');
    try {
      const res = await fetch(`/api/tasks/${deleteSubtaskTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove task');
      setSuccessMsg(`Task "${deleteSubtaskTarget.title}" was removed successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setDeleteSubtaskTarget(null);
      fetchDetails();
    } catch (err: any) {
      setDeleteSubtaskError(err.message);
    } finally {
      setDeleteSubtaskLoading(false);
    }
  };

  const activeCycle = production.revisionCycles[production.revisionCycles.length - 1];

  return (
    <div>
      {/* Header & Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href={production.type === 'PILOT' ? '/pilots' : production.type === 'RENTAL' ? '/rentals' : '/productions'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '0.5rem' }}
        >
          <ArrowLeft size={14} /> Back to {production.type === 'PILOT' ? 'Pilots' : production.type === 'RENTAL' ? 'Rentals' : 'Productions'}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="status-chip status-not-started">{production.type}</span>
              <span className={`priority-pill priority-${production.priority.toLowerCase()}`}>
                {production.priority}
              </span>
              <span
                className={`status-chip ${
                  production.status === 'COMPLETED' ? 'status-completed' : 'status-in-progress'
                }`}
              >
                {production.status}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {production.title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {production.youtubeUrl && (
              <a
                href={production.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Video size={14} color="#ef4444" />
                <span>YouTube</span>
                <ExternalLink size={11} />
              </a>
            )}
            {production.dropboxUrl && (
              <a
                href={production.dropboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Upload size={14} color="var(--jns-blue)" />
                <span>Dropbox</span>
                <ExternalLink size={11} />
              </a>
            )}
            <WhatsAppShareButton
              itemTitle={production.title}
              stageOrAction={
                production.currentStage === 'PRODUCER_PACKAGE'
                  ? 'Producer Package is ready for editing'
                  : production.currentStage === 'EDITING'
                  ? 'is ready for editing'
                  : production.currentStage === 'PRODUCER_REVIEW'
                  ? `Draft ${activeCycle?.draftNumber || 1} is ready for review`
                  : production.currentStage === 'FINAL_APPROVAL'
                  ? 'is ready for final producer approval'
                  : `is currently at stage: ${production.currentStage.replace(/_/g, ' ')}`
              }
              recipientName={
                production.currentStage === 'PRODUCER_PACKAGE' || production.currentStage === 'PRODUCER_REVIEW'
                  ? getUserName(production.producerId)
                  : getUserName(production.editorId)
              }
              directLink={typeof window !== 'undefined' ? window.location.href : undefined}
              size="sm"
              variant="solid"
              buttonLabel="Share on WhatsApp"
            />
            {isProducerOrAdmin && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDeleteProdError('');
                  setDeleteProdModalOpen(true);
                }}
                title="Remove this production task"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={13} />
                <span>Remove Task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Production Metadata Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Producer In-Charge
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {getUserName(production.producerId)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Assigned Editor
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {getUserName(production.editorId)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Filming Date & Time
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {production.filmingDate || 'N/A'}{production.filmingTime ? ` • ${production.filmingTime}` : ''}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Editing Deadline
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {production.editingDeadline || 'N/A'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Publication Deadline
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {production.publicationDeadline || 'N/A'}
          </div>
        </div>
      </div>

      {/* Visual Workflow Breadcrumb Timeline (Item 17) */}
      <WorkflowBreadcrumb production={production} />

      {errorMsg && (
        <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-banner-info" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* ACTIVE WORKFLOW STAGE ACTION CARD                         */}
      {/* ========================================================= */}

      {/* REGULAR EPISODE / PILOT WORKFLOWS */}
      {production.type !== 'RENTAL' && (
        <div className="section-panel" style={{ border: '2px solid var(--border-medium)', boxShadow: 'var(--shadow-md)' }}>
          <div className="section-panel-header" style={{ backgroundColor: 'var(--jns-navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="section-panel-title">
              <span style={{ color: 'var(--jns-gold)' }}>Current Action Step:</span>
              <span>{production.currentStage.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-chip status-in-progress">
                {production.status === 'COMPLETED' ? 'COMPLETED' : 'ACTION REQUIRED'}
              </span>
              <WhatsAppShareButton
                itemTitle={production.title}
                stageOrAction={
                  production.currentStage === 'PRODUCER_PACKAGE'
                    ? 'Producer Package is ready for editing'
                    : production.currentStage === 'EDITING'
                    ? 'is assigned for editing'
                    : production.currentStage === 'PRODUCER_REVIEW'
                    ? `Draft ${activeCycle?.draftNumber || 1} is submitted for review`
                    : production.currentStage === 'FINAL_APPROVAL'
                    ? 'is ready for final producer approval'
                    : `has advanced to ${production.currentStage.replace(/_/g, ' ')}`
                }
                recipientName={
                  production.currentStage === 'PRODUCER_PACKAGE' || production.currentStage === 'PRODUCER_REVIEW'
                    ? getUserName(production.producerId)
                    : getUserName(production.editorId)
                }
                directLink={typeof window !== 'undefined' ? window.location.href : undefined}
                size="xs"
                variant="outline"
                buttonLabel="Share Step"
              />
            </div>
          </div>

          <div className="section-panel-body">
            {/* STAGE 1: FILMING */}
            {production.currentStage === 'FILMING' && (
              <div>
                <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                  Filming is currently scheduled for <strong>{production.filmingDate || 'today'}{production.filmingTime ? ` at ${production.filmingTime}` : ''}</strong>. Confirmation is restricted to a <strong>Studio Operator</strong> or <strong>Admin</strong> when recording wrap is achieved (Producers cannot confirm filming).
                </p>
                {isStudioOrAdmin ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleWorkflowAction('COMPLETE_FILMING')}
                  >
                    <CheckCircle2 size={15} />
                    <span>Confirm Filming Done & Advance to File Upload</span>
                  </button>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={13} color="var(--jns-gold)" />
                    <span>Filming completion must be confirmed by a Studio Operator or Admin (Producers cannot confirm filming).</span>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 2: FILES UPLOADED */}
            {production.currentStage === 'FILES_UPLOADED' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleWorkflowAction('COMPLETE_FILE_UPLOAD', {
                    dropboxPath: uploadDropbox,
                    editshareLocation: uploadEditShare,
                    url: uploadUrl,
                    notes: uploadNotes,
                  });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                  Please confirm that raw camera footage, audio ISOs, and studio cards have been uploaded and are ready for post-production.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dropbox / Cloud Path</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="/JNS_RAW/2026-09/..."
                      value={uploadDropbox}
                      onChange={(e) => setUploadDropbox(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">EditShare / Local Storage Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Volume1/RawFootage/..."
                      value={uploadEditShare}
                      onChange={(e) => setUploadEditShare(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Footage URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://dropbox.com/..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes for Editor (Audio ISOs, card counts, etc.)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. 4 camera angles uploaded. Card B on Cam 2 has interview pickup at end."
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <CheckCircle2 size={15} />
                  <span>Confirm Files Uploaded & Activate Producer Package</span>
                </button>
              </form>
            )}

            {/* STAGE 3: PRODUCER EDITING PACKAGE */}
            {production.currentStage === 'PRODUCER_PACKAGE' && (
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '0.75rem' }}>
                  The Producer prepares everything the video editor needs: rundown, script, B-roll instructions, and graphics guidelines.
                </p>
                {isProducerOrAdmin ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!pkgNotes.trim()) {
                        setErrorMsg('Editing notes are required.');
                        return;
                      }
                      handleWorkflowAction('COMPLETE_PRODUCER_PACKAGE', {
                        editingNotes: pkgNotes,
                        scriptText: pkgScript,
                        brollInstructions: pkgBroll,
                        graphicsInstructions: pkgGraphics,
                        brollLinks: pkgBrollLink ? [pkgBrollLink] : [],
                        referenceLinks: pkgRefLink ? [pkgRefLink] : [],
                      });
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    <div className="form-group">
                      <label className="form-label">
                        Editing Notes & Structure <span className="req">*</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Pacing, specific sections to highlight, cuts, intro/outro music cues..."
                        value={pkgNotes}
                        onChange={(e) => setPkgNotes(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Script / Rundown Text or Link</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Paste rundown, soundbite timestamps, or link to Google Doc..."
                          value={pkgScript}
                          onChange={(e) => setPkgScript(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">B-Roll & Graphics Instructions</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Map graphics, lower third spelling, archival Knesset footage..."
                          value={pkgBroll}
                          onChange={(e) => setPkgBroll(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">B-Roll Link (Drive / Dropbox)</label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://drive.google.com/..."
                          value={pkgBrollLink}
                          onChange={(e) => setPkgBrollLink(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Reference Link</label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://jns.org/article-briefing/..."
                          value={pkgRefLink}
                          onChange={(e) => setPkgRefLink(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                      <CheckCircle2 size={15} />
                      <span>Complete Package & Activate Edit Draft 1</span>
                    </button>
                  </form>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Producer ({getUserName(production.producerId)}) is currently compiling the editing package.
                  </div>
                )}
              </div>
            )}

            {/* STAGE 4: EDITING DRAFT N */}
            {production.currentStage === 'EDITING' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Video Editing: Draft {activeCycle ? activeCycle.draftNumber : 1}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Assigned Editor: <strong>{getUserName(production.editorId)}</strong>
                    </div>
                  </div>

                  {/* Quick Status Buttons for Editor */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const t = production.tasks.find((task) => task.stageName === 'EDITING');
                        if (t) {
                          setBlockTargetTask({ id: t.id, title: t.title });
                          setBlockedModalOpen(true);
                        }
                      }}
                    >
                      <AlertTriangle size={13} color="#ef4444" />
                      <span>Report Blocker</span>
                    </button>
                  </div>
                </div>

                {/* If previous revision had revision notes, show them prominently */}
                {production.revisionCycles.length > 1 && (
                  <div
                    style={{
                      backgroundColor: 'rgba(131, 24, 67, 0.15)',
                      border: '1px solid #be185d',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      fontSize: '12px',
                    }}
                  >
                    <strong style={{ color: '#f472b6', display: 'block', marginBottom: '2px' }}>
                      Producer Revisions Required for Draft {activeCycle?.draftNumber}:
                    </strong>
                    <div style={{ color: 'var(--text-light)' }}>
                      {production.revisionCycles[production.revisionCycles.length - 2]?.reviewNotes ||
                        'Please address requested revisions.'}
                    </div>
                  </div>
                )}

                {/* Submit draft for review form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!draftReviewLink.trim()) {
                      setErrorMsg('Please paste a review link (Frame.io, YouTube unlisted, Dropbox).');
                      return;
                    }
                    handleWorkflowAction('SUBMIT_DRAFT', {
                      reviewLink: draftReviewLink,
                      editorNotes: draftEditorNotes,
                    });
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <div className="form-group">
                    <label className="form-label">
                      Review Link (Frame.io, YouTube Unlisted, Dropbox, etc.) <span className="req">*</span>
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://frame.io/player/... or https://youtu.be/..."
                      value={draftReviewLink}
                      onChange={(e) => setDraftReviewLink(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Editor Notes for Producer Review</label>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Color graded, music balanced to -14 LUFS, pacing tightened in middle segment..."
                      value={draftEditorNotes}
                      onChange={(e) => setDraftEditorNotes(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                    <Send size={15} />
                    <span>Submit Draft {activeCycle ? activeCycle.draftNumber : 1} — Ready for Producer Review</span>
                  </button>
                </form>
              </div>
            )}

            {/* STAGE 4: PRODUCER REVIEW */}
            {production.currentStage === 'PRODUCER_REVIEW' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Reviewing: Draft {activeCycle ? activeCycle.draftNumber : 1}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                    Submitted by Editor: <strong>{getUserName(production.editorId)}</strong>
                  </div>
                </div>

                {activeCycle?.reviewLink && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1rem',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Review Link
                      </span>
                      <div style={{ fontWeight: 600, color: 'var(--jns-gold)', marginTop: '2px' }}>
                        {activeCycle.reviewLink}
                      </div>
                      {activeCycle.editorNotes && (
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                          <strong>Editor Note:</strong> {activeCycle.editorNotes}
                        </div>
                      )}
                    </div>
                    <a
                      href={activeCycle.reviewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      Open Video Player <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {isProducerOrAdmin ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Producer Review / Revision Notes
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Required if requesting revisions. Optional if approving..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn btn-success btn-lg"
                        onClick={() =>
                          handleWorkflowAction('REVIEW_DRAFT', {
                            decision: 'APPROVED',
                            reviewNotes: reviewNotes || 'Approved by Producer',
                          })
                        }
                      >
                        <CheckCircle2 size={16} />
                        <span>APPROVE DRAFT {activeCycle?.draftNumber}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-lg"
                        onClick={() => {
                          if (!reviewNotes.trim()) {
                            setErrorMsg('Revision notes are required when requesting revisions.');
                            return;
                          }
                          handleWorkflowAction('REVIEW_DRAFT', {
                            decision: 'REVISION_REQUIRED',
                            reviewNotes: reviewNotes.trim(),
                          });
                        }}
                      >
                        <XCircle size={16} />
                        <span>REQUEST REVISION (Creates Draft {(activeCycle?.draftNumber || 1) + 1})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Producer review must be performed by {getUserName(production.producerId)}.
                  </div>
                )}
              </div>
            )}

            {/* STAGE 5: FINAL PRODUCER APPROVAL (Item 8) */}
            {production.currentStage === 'FINAL_APPROVAL' && (
              <div>
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid #16a34a',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#86efac', fontSize: '14px' }}>
                    ✓ EDIT APPROVED — AWAITING FINAL APPROVAL
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                    The video cut has been approved. Explicit final producer sign-off is required before final master file rendering and delivery can proceed.
                  </div>
                </div>

                {isProducerOrAdmin ? (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => handleWorkflowAction('GIVE_FINAL_APPROVAL')}
                  >
                    <CheckCircle2 size={17} />
                    <span>Give Final Producer Approval & Activate Delivery</span>
                  </button>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Awaiting final sign-off from Producer ({getUserName(production.producerId)}).
                  </div>
                )}
              </div>
            )}

            {/* STAGE 6: DELIVERY (FINAL UPLOAD) (Item 9) */}
            {production.currentStage === 'FINAL_UPLOAD' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!finalYtUrl && !finalDropboxUrl) {
                    setErrorMsg('Please enter at least one delivery URL.');
                    return;
                  }
                  handleWorkflowAction('COMPLETE_FINAL_UPLOAD', {
                    youtubeUrl: finalYtUrl,
                    dropboxUrl: finalDropboxUrl,
                  });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                  Final Producer Approval is complete. Video Editor must upload the rendered master file to YouTube and Dropbox.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">YouTube Upload URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://youtube.com/watch?v=..."
                      value={finalYtUrl}
                      onChange={(e) => setFinalYtUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dropbox Master File URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://dropbox.com/jns/master/..."
                      value={finalDropboxUrl}
                      onChange={(e) => setFinalDropboxUrl(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <Upload size={15} />
                  <span>Mark Final Upload Complete & Notify Producer</span>
                </button>
              </form>
            )}

            {/* STAGE 7: PUBLISHED (Item 10) */}
            {production.currentStage === 'PUBLISHED' && production.status !== 'COMPLETED' && (
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '0.75rem' }}>
                  Final master files are uploaded. The Producer confirms publication and marks the episode completed.
                </p>

                {isProducerOrAdmin ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleWorkflowAction('MARK_PUBLISHED', {
                        youtubeUrl: publishedYtUrl,
                        publicationDate: new Date().toISOString(),
                      });
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    <div className="form-group">
                      <label className="form-label">Live Public YouTube URL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://youtube.com/watch?v=..."
                        value={publishedYtUrl}
                        onChange={(e) => setPublishedYtUrl(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-success btn-lg" style={{ alignSelf: 'flex-start' }}>
                      <CheckCircle2 size={17} />
                      <span>Confirm Episode Published & Complete Production</span>
                    </button>
                  </form>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    Only a Producer or Admin can mark an episode as Published.
                  </div>
                )}
              </div>
            )}

            {/* COMPLETED PRODUCTION STATE */}
            {production.status === 'COMPLETED' && (
              <div
                style={{
                  backgroundColor: 'rgba(22, 101, 52, 0.15)',
                  border: '1px solid #15803d',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#86efac', fontSize: '15px' }}>
                    ✓ PRODUCTION COMPLETED & ARCHIVED
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                    Published on {new Date(production.publishedAt || production.updatedAt).toLocaleString()} by {getUserName(production.publishedByUserId || production.producerId)}.
                  </div>
                </div>

                {/* Pilot conversion button (Item 12) */}
                {production.type === 'PILOT' && (
                  <div>
                    {production.pilotDetails?.convertedToShowId ? (
                      <span className="status-chip status-approved">
                        Converted to Show: {production.pilotDetails.convertedToShowId}
                      </span>
                    ) : isProducerOrAdmin ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setConvertShowName(production.title.replace(' (Pilot)', ''));
                          setConvertProducerId(production.producerId);
                          setConvertEditorId(production.editorId || '');
                          setConvertDesc(production.pilotDetails?.conceptSummary || '');
                          setShowConvertModal(true);
                        }}
                      >
                        <Sparkles size={15} />
                        <span>Create Regular Show From Pilot</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STUDIO RENTAL WORKFLOW ACTIONS (Item 13)                  */}
      {/* ========================================================= */}
      {production.type === 'RENTAL' && production.rentalDetails && (
        <div className="section-panel" style={{ border: '2px solid var(--border-medium)' }}>
          <div className="section-panel-header" style={{ backgroundColor: 'var(--jns-navy-light)' }}>
            <div className="section-panel-title">
              <Building2 size={16} color="#38bdf8" />
              <span>Studio Rental Workflow: {production.currentStage.replace(/_/g, ' ')}</span>
            </div>
            <span className="status-chip status-in-progress">
              {production.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE'}
            </span>
          </div>

          <div className="section-panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem', backgroundColor: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Client</span>
                <div style={{ fontWeight: 600 }}>{production.rentalDetails.clientName}</div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contact Info</span>
                <div style={{ fontSize: '12px' }}>{production.rentalDetails.contactName} ({production.rentalDetails.contactInfo})</div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Recording Schedule</span>
                <div style={{ fontSize: '12px' }}>{production.rentalDetails.recordingDate} • {production.rentalDetails.recordingTime}</div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Agreed Price</span>
                <div style={{ fontWeight: 700, color: 'var(--jns-gold)' }}>{production.rentalDetails.agreedPrice || 'N/A'}</div>
              </div>
            </div>

            {/* Rental Step 1: Recording Completed */}
            {production.currentStage === 'RENTAL_SCHEDULED' && (
              <div>
                <p style={{ color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                  Studio session scheduled. Confirm recording completion once live transmission/tape concludes.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => handleWorkflowAction('UPDATE_RENTAL_STEP', { step: 'RECORDING_DONE' })}
                >
                  Confirm Recording Completed
                </button>
              </div>
            )}

            {/* Rental Step 2: Files Uploaded */}
            {production.currentStage === 'RECORDING_DONE' && (
              <div>
                <p style={{ color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                  Recording is complete. Confirm that clean ProRes or ISO files have been uploaded for the client.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => handleWorkflowAction('UPDATE_RENTAL_STEP', { step: 'FILES_UPLOADED' })}
                >
                  Confirm Files Uploaded
                </button>
              </div>
            )}

            {/* Rental Step 3: Link Sent to Client */}
            {production.currentStage === 'FILES_UPLOADED' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!rentalClientLink.trim()) {
                    setErrorMsg('Client delivery URL is required.');
                    return;
                  }
                  handleWorkflowAction('UPDATE_RENTAL_STEP', {
                    step: 'LINK_SENT_TO_CLIENT',
                    clientLink: rentalClientLink,
                  });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <div className="form-group">
                  <label className="form-label">
                    Client Download / Transmission URL <span className="req">*</span>
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://dropbox.com/... or https://aspera.bloomberg.com/..."
                    value={rentalClientLink}
                    onChange={(e) => setRentalClientLink(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  Confirm Link Sent to Client
                </button>
              </form>
            )}

            {/* Rental Step 4: Billing Details Sent to Finance (FINAL TASK) */}
            {production.currentStage === 'LINK_SENT_TO_CLIENT' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!rentalFinanceContact.trim() || !rentalFinanceAmount.trim()) {
                    setErrorMsg('Finance billing contact and agreed amount are required.');
                    return;
                  }
                  handleWorkflowAction('UPDATE_RENTAL_STEP', {
                    step: 'BILLING_SENT_TO_FINANCE',
                    financeBillingDetails: rentalFinanceContact,
                    financeAgreedAmount: rentalFinanceAmount,
                    financeNotes: rentalFinanceNotes,
                  });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid #3b82f6',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    color: 'var(--text-light)',
                  }}
                >
                  <strong>Final Rental Workflow Task:</strong> Submit billing details to JNS Finance to mark this rental completed.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Client Billing Contact & Email <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Accounts Payable, ap@bloomberg.com..."
                      value={rentalFinanceContact}
                      onChange={(e) => setRentalFinanceContact(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Agreed Amount to Invoice <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="$1,850"
                      value={rentalFinanceAmount}
                      onChange={(e) => setRentalFinanceAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes for Finance</label>
                  <textarea
                    className="form-textarea"
                    placeholder="PO number, invoice instructions, overtime hours..."
                    value={rentalFinanceNotes}
                    onChange={(e) => setRentalFinanceNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-success btn-lg" style={{ alignSelf: 'flex-start' }}>
                  <CheckCircle2 size={16} />
                  <span>Send Billing to Finance & Complete Rental</span>
                </button>
              </form>
            )}

            {production.status === 'COMPLETED' && (
              <div style={{ color: '#86efac', fontWeight: 600, fontSize: '13px' }}>
                ✓ Studio Rental fully completed and billed to Finance.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRODUCTION TASKS & STAGE MILESTONES CHECKLIST             */}
      {/* ========================================================= */}
      <div className="section-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="section-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-panel-title">
            <CheckSquare size={16} color="var(--jns-gold)" />
            <span>Production Tasks & Milestones ({production.tasks?.length || 0})</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tracked milestone tasks for this production
          </span>
        </div>
        <div className="section-panel-body" style={{ padding: 0 }}>
          {(!production.tasks || production.tasks.length === 0) ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No individual subtasks currently tracked.
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Stage</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {production.tasks.map((task) => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        <div>{task.title}</div>
                        {task.blockedReason && (
                          <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
                            ⚠️ Blocked: {task.blockedReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {task.stageName.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                          {getUserName(task.assignedUserId)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {task.dueDate || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-chip ${
                            task.status === 'COMPLETED'
                              ? 'status-completed'
                              : task.status === 'BLOCKED'
                              ? 'status-blocked'
                              : task.status === 'IN_PROGRESS'
                              ? 'status-in-progress'
                              : task.status === 'WAITING' || task.status === 'WAITING_FOR_REVIEW'
                              ? 'status-waiting'
                              : 'status-not-started'
                          }`}
                        >
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(isProducerOrAdmin || currentUser?.id === task.assignedUserId) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setDeleteSubtaskError('');
                              setDeleteSubtaskTarget(task);
                            }}
                            title={`Remove task "${task.title}"`}
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
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2-COLUMN LOWER SECTION: REVISION HISTORY & PRODUCER PACKAGE */}
      {/* ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* REVISION HISTORY (Item 7 & 28) */}
        <div className="section-panel" style={{ marginBottom: 0 }}>
          <div className="section-panel-header">
            <div className="section-panel-title">
              <History size={16} color="var(--jns-gold)" />
              <span>Draft & Revision History ({production.revisionCycles.length})</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            {production.revisionCycles.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No drafts submitted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {production.revisionCycles.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                        Draft {rev.draftNumber}
                      </div>
                      <span
                        className={`status-chip ${
                          rev.status === 'APPROVED'
                            ? 'status-approved'
                            : rev.status === 'REVISION_REQUIRED'
                            ? 'status-revision'
                            : rev.status === 'READY_FOR_REVIEW'
                            ? 'status-waiting'
                            : 'status-in-progress'
                        }`}
                      >
                        {rev.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {rev.reviewLink && (
                      <div style={{ fontSize: '12px', margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <a
                          href={rev.reviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--jns-gold)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          Review Link <ExternalLink size={11} />
                        </a>
                        <WhatsAppShareButton
                          itemTitle={`${production.title} (Draft ${rev.draftNumber})`}
                          stageOrAction="is ready for review"
                          recipientName={getUserName(production.producerId)}
                          directLink={rev.reviewLink}
                          size="xs"
                          variant="outline"
                          buttonLabel="Share Draft"
                        />
                      </div>
                    )}

                    {rev.editorNotes && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <strong>Editor:</strong> {rev.editorNotes}
                      </div>
                    )}

                    {rev.reviewNotes && (
                      <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '3px' }}>
                        <strong>Review Note:</strong> {rev.reviewNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PRODUCER PACKAGE & RAW FOOTAGE (Stage 2 & 3 data) */}
        <div className="section-panel" style={{ marginBottom: 0 }}>
          <div className="section-panel-header">
            <div className="section-panel-title">
              <FileText size={16} color="var(--jns-blue)" />
              <span>Editing Package & Reference Assets</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            {production.producerPackage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '12px' }}>
                <div>
                  <strong style={{ color: 'var(--jns-gold)' }}>Editing Notes:</strong>
                  <div style={{ color: 'var(--text-light)', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                    {production.producerPackage.editingNotes}
                  </div>
                </div>

                {production.producerPackage.brollInstructions && (
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>B-Roll & Graphics:</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {production.producerPackage.brollInstructions}
                    </div>
                  </div>
                )}

                {production.producerPackage.brollLinks?.length > 0 && (
                  <div>
                    <strong>B-Roll Links:</strong>
                    {production.producerPackage.brollLinks.map((l, i) => (
                      <div key={i}>
                        <a href={l} target="_blank" rel="noreferrer" style={{ color: 'var(--jns-blue)' }}>
                          {l} ↗
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Producer package not yet compiled.
              </div>
            )}

            {production.fileUploadRecord && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <strong style={{ color: 'var(--text-main)' }}>Footage Ingest:</strong>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {production.fileUploadRecord.dropboxPath && <div>Dropbox: {production.fileUploadRecord.dropboxPath}</div>}
                  {production.fileUploadRecord.editshareLocation && <div>EditShare: {production.fileUploadRecord.editshareLocation}</div>}
                  {production.fileUploadRecord.notes && <div>Notes: {production.fileUploadRecord.notes}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2-COLUMN LOWER SECTION: COMMENTS & AUDIT LOGS             */}
      {/* ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.25rem' }}>
        {/* COMMENTS (Item 29) */}
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <MessageSquare size={16} color="var(--jns-gold)" />
              <span>Production Discussion ({comments.length})</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Leave an operational note (e.g. 'Uploaded ISO B', 'Fix lower third')..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Post
              </button>
            </form>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '1rem' }}>
                  No comments yet. Keep comments lightweight and operational.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                        {c.userName} ({c.userRole})
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                      {c.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AUDIT LOG (Item 28) */}
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <History size={16} color="var(--text-muted)" />
              <span>Audit History ({auditLogs.length})</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: '0.75rem' }}>
            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '1rem' }}>
                  No audit entries recorded for this production.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ color: 'var(--jns-gold)' }}>{log.action}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-light)', marginTop: '2px' }}>
                      {log.details} — <em>{log.userName}</em>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONVERT PILOT TO SHOW MODAL (Item 12) */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Regular Recurring Show from Pilot</div>
              <button onClick={() => setShowConvertModal(false)} style={{ color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleConvertPilot}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Show Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={convertShowName}
                    onChange={(e) => setConvertShowName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Host(s) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jonathan Schanzer, Alex Traiman"
                    value={convertHosts}
                    onChange={(e) => setConvertHosts(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Lead Producer</label>
                    <select
                      className="form-select"
                      value={convertProducerId}
                      onChange={(e) => setConvertProducerId(e.target.value)}
                    >
                      {allUsers
                        .filter((u) => u.role === 'PRODUCER' || u.role === 'ADMIN')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Editor</label>
                    <select
                      className="form-select"
                      value={convertEditorId}
                      onChange={(e) => setConvertEditorId(e.target.value)}
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
                    <label className="form-label">Typical Recording Day</label>
                    <select
                      className="form-select"
                      value={convertRecDay}
                      onChange={(e) => setConvertRecDay(e.target.value)}
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Typical Publication Day</label>
                    <select
                      className="form-select"
                      value={convertPubDay}
                      onChange={(e) => setConvertPubDay(e.target.value)}
                    >
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Show Description</label>
                  <textarea
                    className="form-textarea"
                    value={convertDesc}
                    onChange={(e) => setConvertDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConvertModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Show in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked task modal */}
      {blockTargetTask && (
        <BlockedTaskModal
          isOpen={blockedModalOpen}
          taskId={blockTargetTask.id}
          taskTitle={blockTargetTask.title}
          onClose={() => {
            setBlockedModalOpen(false);
            setBlockTargetTask(null);
          }}
          onSuccess={() => {
            fetchDetails();
          }}
        />
      )}

      {/* REMOVE PRODUCTION / EPISODE CONFIRMATION MODAL */}
      {deleteProdModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteProdModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <AlertTriangle size={18} />
                <span>Remove Production Task</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteProdModalOpen(false)}
                disabled={deleteProdLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteProdError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {deleteProdError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--jns-gold)' }}>{production.title}</strong> from the production pipeline?
              </p>

              <div style={{
                background: '#0b1120',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '100px 1fr',
                rowGap: '6px',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Project:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{production.title}</span>

                <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
                <span style={{ color: 'var(--jns-gold)' }}>{production.currentStage.replace(/_/g, ' ')}</span>

                <span style={{ color: 'var(--text-muted)' }}>Producer:</span>
                <span style={{ color: 'var(--text-main)' }}>{getUserName(production.producerId)}</span>

                {production.editorId && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>Editor:</span>
                    <span style={{ color: 'var(--text-main)' }}>{getUserName(production.editorId)}</span>
                  </>
                )}
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
                <strong>Notice:</strong> This action permanently removes this production and redirects you back to the Productions list.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteProdModalOpen(false)}
                disabled={deleteProdLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteProduction}
                disabled={deleteProdLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteProdLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE INDIVIDUAL SUBTASK CONFIRMATION MODAL */}
      {deleteSubtaskTarget && (
        <div className="modal-overlay" onClick={() => setDeleteSubtaskTarget(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <AlertTriangle size={18} />
                <span>Remove Task</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSubtaskTarget(null)}
                disabled={deleteSubtaskLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteSubtaskError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {deleteSubtaskError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove the task <strong style={{ color: 'var(--jns-gold)' }}>"{deleteSubtaskTarget.title}"</strong>?
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
                <span style={{ color: 'var(--text-muted)' }}>Task:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{deleteSubtaskTarget.title}</span>

                <span style={{ color: 'var(--text-muted)' }}>Stage:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{deleteSubtaskTarget.stageName}</span>

                <span style={{ color: 'var(--text-muted)' }}>Assigned To:</span>
                <span style={{ color: 'var(--text-main)' }}>{getUserName(deleteSubtaskTarget.assignedUserId)}</span>

                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: '#86efac' }}>{deleteSubtaskTarget.status}</span>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteSubtaskTarget(null)}
                disabled={deleteSubtaskLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteSubtask}
                disabled={deleteSubtaskLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteSubtaskLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
