'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Film,
  Compass,
  Building2,
  Users,
  Wrench,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { useUser } from './UserContext';
import { countWords, isEligibleEditor } from '@/lib/utils';
import { EquipmentPurchaseType } from '@/lib/types';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
  onSuccess?: () => void;
}

export default function QuickActionModal({
  isOpen,
  onClose,
  defaultTab = 'EPISODE',
  onSuccess,
}: QuickActionModalProps) {
  const { currentUser, allUsers } = useUser();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  // Episode form
  const [epShowId, setEpShowId] = useState('');
  const [epNumber, setEpNumber] = useState('');
  const [epFilmingDate, setEpFilmingDate] = useState(new Date().toISOString().split('T')[0]);
  const [epFilmingTime, setEpFilmingTime] = useState('10:00');
  const [epEditingDeadline, setEpEditingDeadline] = useState('');
  const [epPubDeadline, setEpPubDeadline] = useState('');
  const [epPriority, setEpPriority] = useState('NORMAL');
  const [epProducerId, setEpProducerId] = useState('');
  const [epEditorId, setEpEditorId] = useState('');

  // Pilot form
  const [pilotTitle, setPilotTitle] = useState('');
  const [pilotConcept, setPilotConcept] = useState('');
  const [pilotFilmingDate, setPilotFilmingDate] = useState(new Date().toISOString().split('T')[0]);
  const [pilotFilmingTime, setPilotFilmingTime] = useState('10:00');
  const [pilotPriority, setPilotPriority] = useState('NORMAL');
  const [pilotProducerId, setPilotProducerId] = useState('');
  const [pilotEditorId, setPilotEditorId] = useState('');

  // Rental form
  const [rentalClient, setRentalClient] = useState('');
  const [rentalProject, setRentalProject] = useState('');
  const [rentalContactName, setRentalContactName] = useState('');
  const [rentalContactInfo, setRentalContactInfo] = useState('');
  const [rentalDate, setRentalDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentalTime, setRentalTime] = useState('10:00 - 13:00 IDT');
  const [rentalSetup, setRentalSetup] = useState('Main Studio Multi-Cam & Live TVU transmission');
  const [rentalProducerId, setRentalProducerId] = useState('');
  const [rentalPrice, setRentalPrice] = useState('$1,500');
  const [rentalHours, setRentalHours] = useState('3 hours');
  const [rentalSpecialReq, setRentalSpecialReq] = useState('');

  // Equipment form
  const [eqItemName, setEqItemName] = useState('');
  const [eqCategory, setEqCategory] = useState('Camera equipment');
  const [eqWhyNeeded, setEqWhyNeeded] = useState('');
  const [eqUrgency, setEqUrgency] = useState('NORMAL');
  const [eqQuantity, setEqQuantity] = useState(1);
  const [eqPrice, setEqPrice] = useState('');
  const [eqCurrency, setEqCurrency] = useState<'$' | '₪'>('$');
  const [eqPurchaseType, setEqPurchaseType] = useState<EquipmentPurchaseType>('One-Time Purchase');
  const [eqProductUrl, setEqProductUrl] = useState('');
  const [eqNotes, setEqNotes] = useState('');

  // Improvement form
  const [impTitle, setImpTitle] = useState('');
  const [impSituation, setImpSituation] = useState('');
  const [impSuggested, setImpSuggested] = useState('');
  const [impWhyHelpful, setImpWhyHelpful] = useState('');
  const [impCategory, setImpCategory] = useState('Production Workflow');

  // Problem report form
  const [probTitle, setProbTitle] = useState('');
  const [probDescription, setProbDescription] = useState('');
  const [probImpact, setProbImpact] = useState('');
  const [probSolution, setProbSolution] = useState('');
  const [probAnonymous, setProbAnonymous] = useState(true);

  // Show idea form
  const [ideaShowName, setIdeaShowName] = useState('');
  const [ideaConcept, setIdeaConcept] = useState('');
  const [ideaWhyJns, setIdeaWhyJns] = useState('');
  const [ideaTargetAudience, setIdeaTargetAudience] = useState('');
  const [ideaFormat, setIdeaFormat] = useState('Studio Show');
  const [ideaLength, setIdeaLength] = useState('25 min');
  const [ideaCategory, setIdeaCategory] = useState('Studio Show');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab) {
        setActiveTab(urlTab.toUpperCase());
      } else if (params.get('modal') === 'equipment') {
        setActiveTab('EQUIPMENT');
      } else {
        setActiveTab(defaultTab);
      }

      const curParam = params.get('currency')?.toLowerCase();
      if (curParam === 'ils' || curParam === '₪' || curParam === 'nis') {
        setEqCurrency('₪');
      } else if (curParam === 'usd' || curParam === '$') {
        setEqCurrency('$');
      }

      const modelParam = params.get('model')?.toLowerCase();
      if (modelParam === 'monthly' || modelParam === 'month') {
        setEqPurchaseType('Monthly Subscription');
      } else if (modelParam === 'annual' || modelParam === 'yearly') {
        setEqPurchaseType('Annual Subscription');
      } else if (modelParam === 'onetime' || modelParam === 'one-time') {
        setEqPurchaseType('One-Time Purchase');
      }
    } else {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    fetch('/api/shows')
      .then((r) => r.json())
      .then((data) => {
        if (data.shows) {
          setShows(data.shows);
          if (data.shows.length > 0 && !epShowId) {
            setEpShowId(data.shows[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!epProducerId) setEpProducerId(currentUser.id);
      if (!pilotProducerId) setPilotProducerId(currentUser.id);
      if (!rentalProducerId) setRentalProducerId(currentUser.id);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_EPISODE',
          showId: epShowId,
          episodeNumber: epNumber,
          filmingDate: epFilmingDate,
          filmingTime: epFilmingTime || undefined,
          editingDeadline: epEditingDeadline || undefined,
          publicationDeadline: epPubDeadline || undefined,
          priority: epPriority,
          producerId: epProducerId,
          editorId: epEditorId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Episode successfully created!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePilot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PILOT',
          title: pilotTitle,
          conceptSummary: pilotConcept,
          filmingDate: pilotFilmingDate,
          filmingTime: pilotFilmingTime || undefined,
          priority: pilotPriority,
          producerId: pilotProducerId,
          editorId: pilotEditorId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Pilot successfully created!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_RENTAL',
          clientName: rentalClient,
          projectName: rentalProject,
          contactName: rentalContactName,
          contactInfo: rentalContactInfo,
          recordingDate: rentalDate,
          recordingTime: rentalTime,
          studioSetup: rentalSetup,
          producerId: rentalProducerId,
          agreedPrice: rentalPrice,
          hoursCount: rentalHours,
          specialRequirements: rentalSpecialReq,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Studio Rental scheduled!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const cleanPriceNum = eqPrice.replace(/^[$₪\s]+/, '').trim();
      let formattedPrice = cleanPriceNum ? `${eqCurrency}${cleanPriceNum}` : undefined;
      if (formattedPrice) {
        if (eqPurchaseType === 'Monthly Subscription') {
          formattedPrice += ' / mo';
        } else if (eqPurchaseType === 'Annual Subscription') {
          formattedPrice += ' / yr';
        }
      }

      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: eqItemName,
          category: eqCategory,
          whyNeeded: eqWhyNeeded,
          urgency: eqUrgency,
          quantity: Number(eqQuantity),
          estimatedPrice: formattedPrice,
          purchaseType: eqPurchaseType,
          productUrl: eqProductUrl,
          notes: eqNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Equipment request submitted!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: impTitle,
          currentSituation: impSituation,
          suggestedImprovement: impSuggested,
          whyHelpful: impWhyHelpful,
          category: impCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Improvement suggestion submitted!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProblemReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/problem-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: probTitle,
          problemDescription: probDescription,
          impactDescription: probImpact,
          suggestedSolution: probSolution,
          isAnonymous: probAnonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Problem report submitted!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/show-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showName: ideaShowName,
          concept: ideaConcept,
          whyJnsShouldMakeIt: ideaWhyJns,
          targetAudience: ideaTargetAudience,
          suggestedFormat: ideaFormat,
          suggestedLength: ideaLength,
          category: ideaCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Show idea submitted!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Word counter calculations
  const impCombinedText = `${impSituation} ${impSuggested} ${impWhyHelpful}`;
  const impWordCount = countWords(impCombinedText);

  const probCombinedText = `${probDescription} ${probImpact} ${probSolution}`;
  const probWordCount = countWords(probCombinedText);

  const canCreateProduction =
    currentUser?.role === 'PRODUCER' || currentUser?.role === 'ADMIN';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img
              src="/jns-logo-red.png"
              alt="JNS"
              style={{ width: '24px', height: '24px', borderRadius: '5px', objectFit: 'cover' }}
            />
            <div className="modal-title">Quick Action Operations</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Action Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            overflowX: 'auto',
            gap: '0.4rem',
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card-subtle)',
          }}
        >
          {canCreateProduction && (
            <>
              <button
                className={`filter-tab ${activeTab === 'EPISODE' ? 'active' : ''}`}
                onClick={() => { setActiveTab('EPISODE'); setErrorMsg(''); }}
              >
                <Film size={13} style={{ display: 'inline', marginRight: '4px' }} />
                New Episode
              </button>
              <button
                className={`filter-tab ${activeTab === 'PILOT' ? 'active' : ''}`}
                onClick={() => { setActiveTab('PILOT'); setErrorMsg(''); }}
              >
                <Compass size={13} style={{ display: 'inline', marginRight: '4px' }} />
                New Pilot
              </button>
              <button
                className={`filter-tab ${activeTab === 'RENTAL' ? 'active' : ''}`}
                onClick={() => { setActiveTab('RENTAL'); setErrorMsg(''); }}
              >
                <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                New Rental
              </button>
            </>
          )}
          <button
            className={`filter-tab ${activeTab === 'EQUIPMENT' ? 'active' : ''}`}
            onClick={() => { setActiveTab('EQUIPMENT'); setErrorMsg(''); }}
          >
            <Wrench size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Equipment
          </button>
          <button
            className={`filter-tab ${activeTab === 'IMPROVEMENT' ? 'active' : ''}`}
            onClick={() => { setActiveTab('IMPROVEMENT'); setErrorMsg(''); }}
          >
            <Lightbulb size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Improvement
          </button>
          <button
            className={`filter-tab ${activeTab === 'PROBLEM' ? 'active' : ''}`}
            onClick={() => { setActiveTab('PROBLEM'); setErrorMsg(''); }}
          >
            <AlertCircle size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Report Problem
          </button>
          <button
            className={`filter-tab ${activeTab === 'IDEA' ? 'active' : ''}`}
            onClick={() => { setActiveTab('IDEA'); setErrorMsg(''); }}
          >
            <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Show Idea
          </button>
        </div>

        {errorMsg && (
          <div className="alert-banner alert-banner-danger" style={{ margin: '1rem 1.5rem 0' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert-banner alert-banner-info" style={{ margin: '1rem 1.5rem 0' }}>
            <Check size={16} /> {successMsg}
          </div>
        )}

        <div className="modal-body">
          {/* TAB 1: NEW EPISODE */}
          {activeTab === 'EPISODE' && (
            <form onSubmit={handleCreateEpisode} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Recurring Show <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={epShowId}
                    onChange={(e) => setEpShowId(e.target.value)}
                    required
                  >
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Episode Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 135"
                    value={epNumber}
                    onChange={(e) => setEpNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Filming Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={epFilmingDate}
                    onChange={(e) => setEpFilmingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Filming Time</label>
                  <input
                    type="text"
                    list="filming-time-presets"
                    className="form-input"
                    placeholder="e.g. 10:00 or 14:00-16:00"
                    value={epFilmingTime}
                    onChange={(e) => setEpFilmingTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Editing Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={epEditingDeadline}
                    onChange={(e) => setEpEditingDeadline(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Publication Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={epPubDeadline}
                    onChange={(e) => setEpPubDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={epPriority}
                    onChange={(e) => setEpPriority(e.target.value)}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Producer In-Charge <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={epProducerId}
                    onChange={(e) => setEpProducerId(e.target.value)}
                    required
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
                  <label className="form-label">Assigned Editor</label>
                  <select
                    className="form-select"
                    value={epEditorId}
                    onChange={(e) => setEpEditorId(e.target.value)}
                  >
                    <option value="">Default Show Editor</option>
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

              <div className="form-help">
                Creating an episode automatically generates Stage 1: Filming (to be confirmed by Studio Operator or Admin).
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Episode & Start Workflow'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: NEW PILOT */}
          {activeTab === 'PILOT' && (
            <form onSubmit={handleCreatePilot} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Pilot Show Title <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Inside Israel Defense (Pilot)"
                  value={pilotTitle}
                  onChange={(e) => setPilotTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Concept & Production Rundown <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe show concept, target audience, format, and studio needs..."
                  value={pilotConcept}
                  onChange={(e) => setPilotConcept(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Filming Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={pilotFilmingDate}
                    onChange={(e) => setPilotFilmingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Filming Time</label>
                  <input
                    type="text"
                    list="filming-time-presets"
                    className="form-input"
                    placeholder="e.g. 10:00 or 14:00-16:00"
                    value={pilotFilmingTime}
                    onChange={(e) => setPilotFilmingTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Producer</label>
                  <select
                    className="form-select"
                    value={pilotProducerId}
                    onChange={(e) => setPilotProducerId(e.target.value)}
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
                  <label className="form-label">Assigned Editor</label>
                  <select
                    className="form-select"
                    value={pilotEditorId}
                    onChange={(e) => setPilotEditorId(e.target.value)}
                  >
                    <option value="">Select Editor</option>
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

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Schedule Pilot'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NEW RENTAL */}
          {activeTab === 'RENTAL' && (
            <form onSubmit={handleCreateRental} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Client Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Bloomberg TV / Fox News"
                    value={rentalClient}
                    onChange={(e) => setRentalClient(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Project / Production Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Live Middle East Cross"
                    value={rentalProject}
                    onChange={(e) => setRentalProject(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Contact Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Client point of contact"
                    value={rentalContactName}
                    onChange={(e) => setRentalContactName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Contact Information <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Email and phone"
                    value={rentalContactInfo}
                    onChange={(e) => setRentalContactInfo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Recording Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={rentalDate}
                    onChange={(e) => setRentalDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recording Time</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 14:00 - 16:30 IDT"
                    value={rentalTime}
                    onChange={(e) => setRentalTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Agreed Price</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="$1,500"
                    value={rentalPrice}
                    onChange={(e) => setRentalPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Studio Setup / Transmission Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={rentalSetup}
                  onChange={(e) => setRentalSetup(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Scheduling...' : 'Create Studio Rental'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: EQUIPMENT REQUEST */}
          {activeTab === 'EQUIPMENT' && (
            <form onSubmit={handleCreateEquipment} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Full Product Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SanDisk Professional 48TB G-RAID Shuttle 8"
                    value={eqItemName}
                    onChange={(e) => setEqItemName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={eqCategory}
                    onChange={(e) => setEqCategory(e.target.value)}
                  >
                    <option value="Computer">Computer</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Storage">Storage</option>
                    <option value="Studio equipment">Studio equipment</option>
                    <option value="Camera equipment">Camera equipment</option>
                    <option value="Audio">Audio</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Software">Software</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Replacement parts">Replacement parts</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Product Link (B&H, Amazon, Manufacturer URL)
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://bhphotovideo.com/..."
                  value={eqProductUrl}
                  onChange={(e) => setEqProductUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Why It Is Needed <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Explain how this equipment impacts video production operations..."
                  value={eqWhyNeeded}
                  onChange={(e) => setEqWhyNeeded(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select
                    className="form-select"
                    value={eqUrgency}
                    onChange={(e) => setEqUrgency(e.target.value)}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={eqQuantity}
                    onChange={(e) => setEqQuantity(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Estimated Price</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Purchase Model & Currency</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr auto 1.35fr', gap: '0.45rem', alignItems: 'center' }}>
                  {/* Dropdown Menu for Options: One-Time Purchase, Monthly Subscription, Annual Subscription */}
                  <select
                    className="form-select"
                    value={eqPurchaseType}
                    onChange={(e) => setEqPurchaseType(e.target.value as EquipmentPurchaseType)}
                    style={{ fontSize: '12px', height: '38px', padding: '0.4rem 0.65rem' }}
                  >
                    <option value="One-Time Purchase">One-Time Purchase</option>
                    <option value="Monthly Subscription">Monthly Subscription</option>
                    <option value="Annual Subscription">Annual Subscription</option>
                  </select>

                  {/* Currency Choice: $ and ₪ */}
                  <div
                    style={{
                      display: 'inline-flex',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-input)',
                      flexShrink: 0,
                      height: '38px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEqCurrency('$')}
                      style={{
                        padding: '0 0.75rem',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: eqCurrency === '$' ? 'var(--jns-gold)' : 'transparent',
                        color: eqCurrency === '$' ? '#0c121e' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        height: '100%',
                      }}
                      title="US Dollar ($)"
                    >
                      <span>$</span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>USD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEqCurrency('₪')}
                      style={{
                        padding: '0 0.75rem',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: eqCurrency === '₪' ? 'var(--jns-gold)' : 'transparent',
                        color: eqCurrency === '₪' ? '#0c121e' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        borderLeft: '1px solid var(--border-subtle)',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        height: '100%',
                      }}
                      title="Israeli Shekel (₪)"
                    >
                      <span>₪</span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>ILS</span>
                    </button>
                  </div>

                  {/* Price input with prefix and dynamic placeholder/suffix */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '11px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--jns-gold)',
                        fontWeight: 700,
                        fontSize: '14px',
                        pointerEvents: 'none',
                      }}
                    >
                      {eqCurrency}
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={
                        eqPurchaseType === 'Monthly Subscription'
                          ? (eqCurrency === '$' ? 'e.g. 49 / mo' : 'e.g. 180 / mo')
                          : eqPurchaseType === 'Annual Subscription'
                          ? (eqCurrency === '$' ? 'e.g. 499 / yr' : 'e.g. 1,800 / yr')
                          : (eqCurrency === '$' ? 'e.g. 1,200' : 'e.g. 4,500')
                      }
                      value={eqPrice}
                      onChange={(e) => setEqPrice(e.target.value.replace(/^[$₪\s]+/, ''))}
                      style={{
                        width: '100%',
                        height: '38px',
                        paddingLeft: '1.85rem',
                        paddingRight: eqPurchaseType !== 'One-Time Purchase' ? '3.2rem' : '0.75rem',
                      }}
                    />
                    {eqPurchaseType === 'Monthly Subscription' && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        / month
                      </span>
                    )}
                    {eqPurchaseType === 'Annual Subscription' && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}
                      >
                        / year
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Equipment Request'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: IMPROVEMENT (>= 100 words) */}
          {activeTab === 'IMPROVEMENT' && (
            <form onSubmit={handleCreateImprovement} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Improvement Title <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Automated Multi-Cam Proxy Generation"
                    value={impTitle}
                    onChange={(e) => setImpTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={impCategory}
                    onChange={(e) => setImpCategory(e.target.value)}
                  >
                    <option value="Production Workflow">Production Workflow</option>
                    <option value="Editing">Editing</option>
                    <option value="Graphics">Graphics</option>
                    <option value="Studio">Studio</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Communication">Communication</option>
                    <option value="Scheduling">Scheduling</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Current Situation / Problem <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the current operational friction..."
                  value={impSituation}
                  onChange={(e) => setImpSituation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Suggested Improvement <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Explain your proposed solution in detail..."
                  value={impSuggested}
                  onChange={(e) => setImpSuggested(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Why This Would Help <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Explain time savings, error reduction, or quality enhancements..."
                  value={impWhyHelpful}
                  onChange={(e) => setImpWhyHelpful(e.target.value)}
                  required
                />
              </div>

              <div className={`word-count-badge ${impWordCount >= 100 ? 'word-count-ok' : 'word-count-need'}`}>
                Substantive word count: {impWordCount} / 100 minimum words required {impWordCount >= 100 ? '✓' : `(needs ${100 - impWordCount} more)`}
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || impWordCount < 100}
                >
                  {loading ? 'Submitting...' : 'Submit Improvement'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: REPORT A WORKFLOW PROBLEM (Anonymous option + >= 100 words + Mandatory Solution) */}
          {activeTab === 'PROBLEM' && (
            <form onSubmit={handleCreateProblemReport} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  color: 'var(--text-light)',
                }}
              >
                "We want to identify problems so we can improve them. Please explain both the problem and what you think could improve it."
              </div>

              <div className="form-group">
                <label className="form-label">
                  Problem Title <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Script changes requested after guests leave studio"
                  value={probTitle}
                  onChange={(e) => setProbTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Describe the Problem <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Detail what is occurring in the workflow..."
                  value={probDescription}
                  onChange={(e) => setProbDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  How Does It Affect the Work? <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Detail the operational delay, stress, or impact on editing/delivery..."
                  value={probImpact}
                  onChange={(e) => setProbImpact(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Suggested Solution <span className="req">* (Mandatory)</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Propose a constructive protocol or operational adjustment..."
                  value={probSolution}
                  onChange={(e) => setProbSolution(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="probAnon"
                  checked={probAnonymous}
                  onChange={(e) => setProbAnonymous(e.target.checked)}
                />
                <label htmlFor="probAnon" style={{ fontSize: '12px', color: 'var(--jns-gold)', fontWeight: 600 }}>
                  Submit anonymously (Author identity will NEVER be stored or visible to Admin or Producers)
                </label>
              </div>

              <div className={`word-count-badge ${probWordCount >= 100 ? 'word-count-ok' : 'word-count-need'}`}>
                Substantive word count: {probWordCount} / 100 minimum words required {probWordCount >= 100 ? '✓' : `(needs ${100 - probWordCount} more)`}
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || probWordCount < 100 || !probSolution.trim()}
                >
                  {loading ? 'Submitting...' : 'Submit Problem Report'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: SHOW IDEA */}
          {activeTab === 'IDEA' && (
            <form onSubmit={handleCreateIdea} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Proposed Show / Content Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jerusalem Diplomatic Salon"
                    value={ideaShowName}
                    onChange={(e) => setIdeaShowName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={ideaCategory}
                    onChange={(e) => setIdeaCategory(e.target.value)}
                  >
                    <option value="Studio Show">Studio Show</option>
                    <option value="Interview">Interview</option>
                    <option value="Panel">Panel</option>
                    <option value="Monologue">Monologue</option>
                    <option value="Podcast">Podcast</option>
                    <option value="Field Report">Field Report</option>
                    <option value="Documentary / Feature">Documentary / Feature</option>
                    <option value="Short-Form">Short-Form</option>
                    <option value="Spanish Content">Spanish Content</option>
                    <option value="Hebrew Content">Hebrew Content</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Concept <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Outline the show structure, core premise, and format..."
                  value={ideaConcept}
                  onChange={(e) => setIdeaConcept(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Why JNS Should Make It <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Audience appeal, sponsorship value, editorial advantage..."
                  value={ideaWhyJns}
                  onChange={(e) => setIdeaWhyJns(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Policy analysts, US viewers"
                    value={ideaTargetAudience}
                    onChange={(e) => setIdeaTargetAudience(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Format</label>
                  <input
                    type="text"
                    className="form-input"
                    value={ideaFormat}
                    onChange={(e) => setIdeaFormat(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Length</label>
                  <input
                    type="text"
                    className="form-input"
                    value={ideaLength}
                    onChange={(e) => setIdeaLength(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Show Idea'}
                </button>
              </div>
            </form>
          )}

          <datalist id="filming-time-presets">
            <option value="09:00" />
            <option value="09:30" />
            <option value="10:00" />
            <option value="10:30" />
            <option value="11:00" />
            <option value="11:30" />
            <option value="12:00" />
            <option value="13:00" />
            <option value="13:30" />
            <option value="14:00" />
            <option value="14:30" />
            <option value="15:00" />
            <option value="15:30" />
            <option value="16:00" />
            <option value="17:00" />
            <option value="10:00 - 12:00" />
            <option value="14:00 - 16:30 IDT" />
          </datalist>
        </div>
      </div>
    </div>
  );
}
