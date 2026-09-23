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
  Palette,
  Plus,
  Trash2,
  Clock,
  Upload,
  UploadCloud,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useUser } from './UserContext';
import { countWords, isEligibleEditor, findStudioConflict } from '@/lib/utils';
import { EquipmentPurchaseType } from '@/lib/types';

function addMinutesToTimeStr(timeStr: string, minutesToAdd: number): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '11:30';
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const total = h * 60 + m + minutesToAdd;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function getMinutesDiff(startStr: string, endStr: string): number {
  const matchA = startStr.match(/^(\d{1,2}):(\d{2})/);
  const matchB = endStr.match(/^(\d{1,2}):(\d{2})/);
  if (!matchA || !matchB) return 90;
  const minA = parseInt(matchA[1], 10) * 60 + parseInt(matchA[2], 10);
  const minB = parseInt(matchB[1], 10) * 60 + parseInt(matchB[2], 10);
  return minB - minA;
}

function calculateDurationDisplay(startTime: string, endTime: string): string {
  const diff = getMinutesDiff(startTime, endTime);
  if (diff <= 0) return 'Invalid (end after start)';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

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
  const [existingProductions, setExistingProductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  // Episode form
  const [epShowId, setEpShowId] = useState('');
  const [epNumber, setEpNumber] = useState('');
  const [epFilmingDate, setEpFilmingDate] = useState(new Date().toISOString().split('T')[0]);
  const [epFilmingStartTime, setEpFilmingStartTime] = useState('10:00');
  const [epFilmingEndTime, setEpFilmingEndTime] = useState('11:30');
  const epFilmingTime = epFilmingEndTime ? `${epFilmingStartTime} - ${epFilmingEndTime}` : epFilmingStartTime;
  const [epLocation, setEpLocation] = useState<'IN_STUDIO' | 'STUDIO_REMOTE_GUEST' | 'FULLY_REMOTE'>('IN_STUDIO');
  const [epEditingDate, setEpEditingDate] = useState('');
  const [epEditingDeadline, setEpEditingDeadline] = useState('');
  const [epPubDeadline, setEpPubDeadline] = useState('');
  const [epPriority, setEpPriority] = useState('NORMAL');
  const [epProducerId, setEpProducerId] = useState('');
  const [epEditorId, setEpEditorId] = useState('');

  // Pilot form
  const [pilotTitle, setPilotTitle] = useState('');
  const [pilotConcept, setPilotConcept] = useState('');
  const [pilotFilmingDate, setPilotFilmingDate] = useState(new Date().toISOString().split('T')[0]);
  const [pilotFilmingStartTime, setPilotFilmingStartTime] = useState('10:00');
  const [pilotFilmingEndTime, setPilotFilmingEndTime] = useState('11:30');
  const pilotFilmingTime = pilotFilmingEndTime ? `${pilotFilmingStartTime} - ${pilotFilmingEndTime}` : pilotFilmingStartTime;
  const [pilotLocation, setPilotLocation] = useState<'IN_STUDIO' | 'STUDIO_REMOTE_GUEST' | 'FULLY_REMOTE'>('IN_STUDIO');
  const [pilotEditingDate, setPilotEditingDate] = useState('');
  const [pilotPriority, setPilotPriority] = useState('NORMAL');
  const [pilotProducerId, setPilotProducerId] = useState('');
  const [pilotEditorId, setPilotEditorId] = useState('');

  // Rental form
  const [rentalClient, setRentalClient] = useState('');
  const [rentalProject, setRentalProject] = useState('');
  const [rentalContactName, setRentalContactName] = useState('');
  const [rentalContactInfo, setRentalContactInfo] = useState('');
  const [rentalDate, setRentalDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentalStartTime, setRentalStartTime] = useState('10:00');
  const [rentalEndTime, setRentalEndTime] = useState('13:00');
  const rentalTime = rentalEndTime ? `${rentalStartTime} - ${rentalEndTime} IDT` : rentalStartTime;
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

  // Graphics Task form states (Quick Action)
  const [gfxType, setGfxType] = useState<'IMMEDIATE' | 'LONG_TERM'>('IMMEDIATE');
  const [gfxTitle, setGfxTitle] = useState('');
  const [gfxShowName, setGfxShowName] = useState('');
  const [gfxDeadline, setGfxDeadline] = useState(new Date().toISOString().split('T')[0] + 'T17:00');
  const [gfxTiming, setGfxTiming] = useState('');
  const [gfxDescription, setGfxDescription] = useState('');
  const [gfxPriority, setGfxPriority] = useState('NORMAL');
  const [gfxAssignedUserId, setGfxAssignedUserId] = useState('usr_ilia_graphics');
  const [gfxAssetsText, setGfxAssetsText] = useState('');
  const [gfxReferencesText, setGfxReferencesText] = useState('');
  const [gfxSubtasks, setGfxSubtasks] = useState<{ id: string; title: string; status: string }[]>([
    { id: '1', title: 'Concept & Storyboard', status: 'NOT_STARTED' },
    { id: '2', title: 'Design & Styleframes', status: 'NOT_STARTED' },
    { id: '3', title: 'Animation & Motion', status: 'NOT_STARTED' },
    { id: '4', title: 'Implementation & Premiere MOGRT', status: 'NOT_STARTED' },
  ]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] = useState('NOT_STARTED');

  // Graphics Media Uploads (target album: 'graphics media')
  const [uploadedAssetFiles, setUploadedAssetFiles] = useState<
    { id: string; name: string; sizeFormatted: string; url: string; mime?: string; bytes?: number }[]
  >([]);
  const [uploadedRefFiles, setUploadedRefFiles] = useState<
    { id: string; name: string; sizeFormatted: string; url: string; mime?: string; bytes?: number }[]
  >([]);
  const [uploadingGfxMedia, setUploadingGfxMedia] = useState(false);
  const [gfxUploadError, setGfxUploadError] = useState('');

  const getGraphicsAlbumId = async (): Promise<string> => {
    const res = await fetch('/api/media/albums?graphicsMedia=1');
    const data = await res.json();
    if (!res.ok || !data.album?.id) {
      throw new Error(data.error || 'Failed to locate graphics media album');
    }
    return data.album.id;
  };

  const handleUploadGfxFiles = async (fileList: FileList | null, targetType: 'ASSET' | 'REFERENCE') => {
    if (!fileList || fileList.length === 0) return;
    setGfxUploadError('');
    setUploadingGfxMedia(true);
    try {
      const albumId = await getGraphicsAlbumId();
      const newItems: { id: string; name: string; sizeFormatted: string; url: string; mime?: string; bytes?: number }[] = [];

      for (const file of Array.from(fileList)) {
        const res = await fetch(
          `/api/media?kind=album&target=${albumId}&name=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file,
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(`${file.name}: ${data.error || 'Upload failed'}`);

        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        newItems.push({
          id: data.id,
          name: file.name,
          sizeFormatted: `${sizeMb} MB`,
          url: `/api/media/${data.id}`,
          mime: file.type,
          bytes: file.size,
        });
      }

      if (targetType === 'ASSET') {
        setUploadedAssetFiles((prev) => [...prev, ...newItems]);
      } else {
        setUploadedRefFiles((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      setGfxUploadError(err.message || 'Error uploading media file.');
    } finally {
      setUploadingGfxMedia(false);
    }
  };

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
    fetch('/api/productions')
      .then((r) => r.json())
      .then((data) => {
        if (data.productions) {
          setExistingProductions(data.productions);
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

  // Real-time Studio Conflict Detection
  const epConflict = React.useMemo(() => {
    return findStudioConflict(existingProductions, epFilmingDate, epFilmingTime, epLocation);
  }, [existingProductions, epFilmingDate, epFilmingTime, epLocation]);

  const pilotConflict = React.useMemo(() => {
    return findStudioConflict(existingProductions, pilotFilmingDate, pilotFilmingTime, pilotLocation);
  }, [existingProductions, pilotFilmingDate, pilotFilmingTime, pilotLocation]);

  const rentalConflict = React.useMemo(() => {
    return findStudioConflict(existingProductions, rentalDate, rentalTime, 'STUDIO');
  }, [existingProductions, rentalDate, rentalTime]);

  // Next episode number auto-calculation based on existing productions for the selected show
  const suggestedNextEp = React.useMemo(() => {
    if (!epShowId) return '';
    const cleanId = epShowId.replace(/^show_/, '');
    const showProds = existingProductions.filter(
      (p) => (p.showId === epShowId || (p.type === 'EPISODE' && p.id?.includes(cleanId))) && p.status !== 'ARCHIVED'
    );
    let maxNum = 0;
    showProds.forEach((p) => {
      const match = String(p.episodeNumber || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return maxNum > 0 ? String(maxNum + 1) : '1';
  }, [epShowId, existingProductions]);

  // When show changes and user has not typed or when epNumber is empty, auto-set to suggested next
  useEffect(() => {
    if (suggestedNextEp && !epNumber) {
      setEpNumber(suggestedNextEp);
    }
  }, [epShowId, suggestedNextEp]);

  // Real-time duplicate episode number check
  const epNumberDuplicate = React.useMemo(() => {
    if (!epShowId || !epNumber.trim()) return false;
    const cleanNum = epNumber.trim().toLowerCase();
    const cleanShow = epShowId.replace(/^show_/, '');
    return existingProductions.some(
      (p) =>
        (p.showId === epShowId || (p.type === 'EPISODE' && p.id?.includes(`_${cleanShow}_`))) &&
        String(p.episodeNumber || '').trim().toLowerCase() === cleanNum &&
        p.status !== 'ARCHIVED'
    );
  }, [epShowId, epNumber, existingProductions]);

  if (!isOpen) return null;

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (epNumberDuplicate) {
      setErrorMsg(`Episode ${epNumber} already exists for this show. Please select episode ${suggestedNextEp} or another available number.`);
      return;
    }
    if (epConflict.hasConflict) {
      setErrorMsg(epConflict.reason || 'Studio conflict detected');
      return;
    }
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
          location: epLocation,
          recordingType: epLocation,
          editingDate: epEditingDate || epFilmingDate,
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
    if (pilotConflict.hasConflict) {
      setErrorMsg(pilotConflict.reason || 'Studio conflict detected');
      return;
    }
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
          location: pilotLocation,
          recordingType: pilotLocation,
          editingDate: pilotEditingDate || pilotFilmingDate,
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
    if (rentalConflict.hasConflict) {
      setErrorMsg(rentalConflict.reason || 'Studio conflict detected');
      return;
    }
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

  const handleCreateGraphics = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const mainTitle = gfxTitle.trim();
    if (!mainTitle) {
      setErrorMsg(gfxType === 'LONG_TERM' ? 'Project name is required.' : 'Graphic request title is required.');
      return;
    }

    setLoading(true);
    try {
      const parsedAssets = [
        ...uploadedAssetFiles.map((f, i) => ({
          id: f.id || `ast_${Date.now()}_${i}`,
          title: f.name,
          url: f.url,
          mediaId: f.id,
          mime: f.mime,
          bytes: f.bytes,
          type: 'ASSET' as const,
          addedAt: new Date().toISOString(),
        })),
        ...gfxAssetsText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((url, i) => ({
            id: `ast_${Date.now()}_${i}`,
            title: `Asset ${i + 1}`,
            url,
            type: 'ASSET' as const,
            addedAt: new Date().toISOString(),
          })),
      ];

      const parsedReferences = [
        ...uploadedRefFiles.map((f, i) => ({
          id: f.id || `ref_${Date.now()}_${i}`,
          title: f.name,
          url: f.url,
          mediaId: f.id,
          mime: f.mime,
          bytes: f.bytes,
          type: 'REFERENCE' as const,
          addedAt: new Date().toISOString(),
        })),
        ...gfxReferencesText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((url, i) => ({
            id: `ref_${Date.now()}_${i}`,
            title: `Reference ${i + 1}`,
            url,
            type: 'REFERENCE' as const,
            addedAt: new Date().toISOString(),
          })),
      ];

      const res = await fetch('/api/graphics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: gfxType,
          title: mainTitle,
          projectName: gfxType === 'LONG_TERM' ? mainTitle : undefined,
          showName: gfxType === 'IMMEDIATE' ? gfxShowName : undefined,
          deadline: gfxDeadline || undefined,
          timing: gfxTiming || undefined,
          description: gfxDescription,
          priority: gfxPriority,
          assignedUserId: gfxAssignedUserId,
          subtasks: gfxType === 'LONG_TERM' ? gfxSubtasks : [],
          assets: parsedAssets,
          references: parsedReferences,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(
        gfxType === 'LONG_TERM'
          ? 'Long-term graphics project created!'
          : 'Graphics request successfully submitted!'
      );
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
            className={`filter-tab ${activeTab === 'GRAPHICS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('GRAPHICS'); setErrorMsg(''); }}
            style={{
              borderColor: activeTab === 'GRAPHICS' ? 'var(--jns-gold)' : undefined,
              color: activeTab === 'GRAPHICS' ? 'var(--jns-gold)' : undefined,
              fontWeight: 700,
            }}
          >
            <Palette size={13} style={{ display: 'inline', marginRight: '4px' }} />
            New Graphics Request
          </button>
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
                    onChange={(e) => {
                      setEpShowId(e.target.value);
                      setEpNumber('');
                    }}
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
                    placeholder={`e.g. ${suggestedNextEp || '1'}`}
                    value={epNumber}
                    onChange={(e) => setEpNumber(e.target.value)}
                    required
                    style={{
                      borderColor: epNumberDuplicate ? 'var(--danger-color, #ef4444)' : undefined,
                    }}
                  />
                  {epNumberDuplicate ? (
                    <div style={{ fontSize: '11.5px', color: 'var(--danger-color, #ef4444)', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ Episode {epNumber} already exists for this show (Suggested next: {suggestedNextEp})
                    </div>
                  ) : suggestedNextEp ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Suggested next: <strong>Episode {suggestedNextEp}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Filming Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Filming Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={epFilmingDate}
                    onChange={(e) => {
                      const newFilmDate = e.target.value;
                      setEpFilmingDate(newFilmDate);
                      if (!epEditingDate || epEditingDate === epFilmingDate) {
                        setEpEditingDate(newFilmDate);
                      }
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Filming Schedule (Start & End Time) <span className="req">*</span>
                    </label>
                    {epFilmingStartTime && epFilmingEndTime && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(212, 160, 23, 0.15)', color: 'var(--jns-gold)' }}>
                        ⏳ {calculateDurationDisplay(epFilmingStartTime, epFilmingEndTime)} studio time
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Start Time</div>
                      <input
                        type="time"
                        className="form-input"
                        value={epFilmingStartTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setEpFilmingStartTime(newStart);
                          if (epFilmingStartTime && epFilmingEndTime) {
                            const diff = getMinutesDiff(epFilmingStartTime, epFilmingEndTime);
                            if (diff > 0) {
                              setEpFilmingEndTime(addMinutesToTimeStr(newStart, diff));
                            }
                          }
                        }}
                        required
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>End Time</div>
                      <input
                        type="time"
                        className="form-input"
                        value={epFilmingEndTime}
                        onChange={(e) => setEpFilmingEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Duration:</span>
                    {[
                      { label: '+45 min', mins: 45 },
                      { label: '+1 hour', mins: 60 },
                      { label: '+1.5 hours', mins: 90 },
                      { label: '+2 hours', mins: 120 },
                      { label: '+3 hours', mins: 180 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setEpFilmingEndTime(addMinutesToTimeStr(epFilmingStartTime, p.mins))}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px' }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recording Setup</label>
                  <select
                    className="form-select"
                    value={epLocation}
                    onChange={(e) => setEpLocation(e.target.value as any)}
                  >
                    <option value="IN_STUDIO">In studio recording</option>
                    <option value="STUDIO_REMOTE_GUEST">Studio + remote interviewee</option>
                    <option value="FULLY_REMOTE">Fully remote recording</option>
                  </select>
                </div>
              </div>

              {/* Post-Production & Delivery Schedule Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                {/* Editing Shift Date (When editing is done) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Editing Date (When editing is done) <span className="req">*</span>
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: 700 }}>
                      ✂️ Calendar Shift Queue
                    </span>
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={epEditingDate || epFilmingDate}
                    onChange={(e) => setEpEditingDate(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quick Shift:</span>
                    {[
                      { label: 'Same day', days: 0 },
                      { label: '+1 day', days: 1 },
                      { label: '+2 days', days: 2 },
                      { label: '+3 days', days: 3 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setEpEditingDate(addDaysToDateStr(epFilmingDate, btn.days))}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Date editor works on this episode in calendar (distinct from deadline)
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Editing Deadline (Review)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={epEditingDeadline}
                    onChange={(e) => setEpEditingDeadline(e.target.value)}
                  />
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    When rough cut is due for review
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Publication Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={epPubDeadline}
                    onChange={(e) => setEpPubDeadline(e.target.value)}
                  />
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Scheduled air / publish date
                  </div>
                </div>
              </div>

              {epConflict.hasConflict && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#f87171' }}>Studio Conflict Detected:</strong> {epConflict.reason}
                  </div>
                </div>
              )}

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

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Filming Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={pilotFilmingDate}
                    onChange={(e) => {
                      const newFilmDate = e.target.value;
                      setPilotFilmingDate(newFilmDate);
                      if (!pilotEditingDate || pilotEditingDate === pilotFilmingDate) {
                        setPilotEditingDate(newFilmDate);
                      }
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Filming Schedule (Start & End Time) <span className="req">*</span>
                    </label>
                    {pilotFilmingStartTime && pilotFilmingEndTime && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc' }}>
                        ⏳ {calculateDurationDisplay(pilotFilmingStartTime, pilotFilmingEndTime)} studio time
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Start Time</div>
                      <input
                        type="time"
                        className="form-input"
                        value={pilotFilmingStartTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setPilotFilmingStartTime(newStart);
                          if (pilotFilmingStartTime && pilotFilmingEndTime) {
                            const diff = getMinutesDiff(pilotFilmingStartTime, pilotFilmingEndTime);
                            if (diff > 0) {
                              setPilotFilmingEndTime(addMinutesToTimeStr(newStart, diff));
                            }
                          }
                        }}
                        required
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>End Time</div>
                      <input
                        type="time"
                        className="form-input"
                        value={pilotFilmingEndTime}
                        onChange={(e) => setPilotFilmingEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Duration:</span>
                    {[
                      { label: '+45 min', mins: 45 },
                      { label: '+1 hour', mins: 60 },
                      { label: '+1.5 hours', mins: 90 },
                      { label: '+2 hours', mins: 120 },
                      { label: '+3 hours', mins: 180 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPilotFilmingEndTime(addMinutesToTimeStr(pilotFilmingStartTime, p.mins))}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px' }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recording Setup</label>
                  <select
                    className="form-select"
                    value={pilotLocation}
                    onChange={(e) => setPilotLocation(e.target.value as any)}
                  >
                    <option value="IN_STUDIO">In studio recording</option>
                    <option value="STUDIO_REMOTE_GUEST">Studio + remote interviewee</option>
                    <option value="FULLY_REMOTE">Fully remote recording</option>
                  </select>
                </div>
              </div>

              {/* Pilot Editing Shift Schedule */}
              <div className="form-group" style={{ marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Editing Date (When editing is done) <span className="req">*</span>
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: 700 }}>
                    ✂️ Calendar Shift Queue
                  </span>
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={pilotEditingDate || pilotFilmingDate}
                  onChange={(e) => setPilotEditingDate(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quick Shift:</span>
                  {[
                    { label: 'Same day', days: 0 },
                    { label: '+1 day', days: 1 },
                    { label: '+2 days', days: 2 },
                    { label: '+3 days', days: 3 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setPilotEditingDate(addDaysToDateStr(pilotFilmingDate, btn.days))}
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Date editor works on this pilot in calendar (distinct from deadline)
                </div>
              </div>

              {pilotConflict.hasConflict && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#f87171' }}>Studio Conflict Detected:</strong> {pilotConflict.reason}
                  </div>
                </div>
              )}

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
                  <label className="form-label">Recording Date <span className="req">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={rentalDate}
                    onChange={(e) => setRentalDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Studio Recording Time (Start & End) <span className="req">*</span>
                    </label>
                    {rentalStartTime && rentalEndTime && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}>
                        ⏳ {calculateDurationDisplay(rentalStartTime, rentalEndTime)} booked
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Start Time (IDT)</div>
                      <input
                        type="time"
                        className="form-input"
                        value={rentalStartTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setRentalStartTime(newStart);
                          if (rentalStartTime && rentalEndTime) {
                            const diff = getMinutesDiff(rentalStartTime, rentalEndTime);
                            if (diff > 0) {
                              const newEnd = addMinutesToTimeStr(newStart, diff);
                              setRentalEndTime(newEnd);
                              const h = diff / 60;
                              setRentalHours(h === Math.floor(h) ? `${h} hours` : `${h.toFixed(1)} hours`);
                            }
                          }
                        }}
                        required
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>End Time (IDT)</div>
                      <input
                        type="time"
                        className="form-input"
                        value={rentalEndTime}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          setRentalEndTime(newEnd);
                          const diff = getMinutesDiff(rentalStartTime, newEnd);
                          if (diff > 0) {
                            const h = diff / 60;
                            setRentalHours(h === Math.floor(h) ? `${h} hours` : `${h.toFixed(1)} hours`);
                          }
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Duration:</span>
                    {[
                      { label: '+1 hour', mins: 60 },
                      { label: '+2 hours', mins: 120 },
                      { label: '+3 hours', mins: 180 },
                      { label: '+4 hours', mins: 240 },
                      { label: '+5 hours', mins: 300 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const newEnd = addMinutesToTimeStr(rentalStartTime, p.mins);
                          setRentalEndTime(newEnd);
                          const h = p.mins / 60;
                          setRentalHours(`${h} hours`);
                        }}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px' }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
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

              {rentalConflict.hasConflict && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#f87171' }}>Studio Conflict Detected:</strong> {rentalConflict.reason}
                  </div>
                </div>
              )}

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

          {/* TAB: NEW GRAPHICS REQUEST (Item: Immediate Request vs Long-Term Project) */}
          {activeTab === 'GRAPHICS' && (
            <form onSubmit={handleCreateGraphics} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Type Toggle: Immediate Show Request vs Long-Term Project */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: 'var(--bg-card-subtle)',
                  padding: '6px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setGfxType('IMMEDIATE');
                    setErrorMsg('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: gfxType === 'IMMEDIATE' ? 'var(--jns-gold)' : 'transparent',
                    color: gfxType === 'IMMEDIATE' ? '#000' : 'var(--text-secondary)',
                    fontWeight: gfxType === 'IMMEDIATE' ? 800 : 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Immediate Show Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGfxType('LONG_TERM');
                    setErrorMsg('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: gfxType === 'LONG_TERM' ? 'var(--jns-gold)' : 'transparent',
                    color: gfxType === 'LONG_TERM' ? '#000' : 'var(--text-secondary)',
                    fontWeight: gfxType === 'LONG_TERM' ? 800 : 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Palette size={14} />
                  <span>Long-Term Project (8-Stage Pipeline)</span>
                </button>
              </div>

              {/* SHARED OR IMMEDIATE FIELDS */}
              {gfxType === 'IMMEDIATE' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Request Title <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Quote Card - Iran Sanctions, Knesset Map Graphic"
                        value={gfxTitle}
                        onChange={(e) => setGfxTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Show Name</label>
                      <input
                        type="text"
                        className="form-input"
                        list="active-show-presets"
                        placeholder="Select show or type custom name..."
                        value={gfxShowName}
                        onChange={(e) => setGfxShowName(e.target.value)}
                      />
                      <datalist id="active-show-presets">
                        {shows.map((s) => (
                          <option key={s.id} value={s.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Deadline (Date & Time) <span className="req">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={gfxDeadline}
                        onChange={(e) => setGfxDeadline(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Implemented Timing (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 02:15 - 02:45, 10-second lower third"
                        value={gfxTiming}
                        onChange={(e) => setGfxTiming(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description & Design Instructions</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Specify required text, lower third titles, maps, colors, aspect ratios, or cue notes..."
                      value={gfxDescription}
                      onChange={(e) => setGfxDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {gfxUploadError && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{gfxUploadError}</span>
                      <button
                        type="button"
                        onClick={() => setGfxUploadError('')}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {uploadingGfxMedia && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(229, 169, 60, 0.12)',
                        border: '1px solid rgba(229, 169, 60, 0.3)',
                        color: 'var(--jns-gold)',
                        fontSize: '12px',
                      }}
                    >
                      Uploading media files to graphics library… Please wait.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {/* Assets to Incorporate */}
                    <div className="form-group">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                          flexWrap: 'wrap',
                          gap: 4,
                        }}
                      >
                        <label className="form-label" style={{ margin: 0 }}>
                          Assets to Incorporate
                        </label>
                        <label
                          className="btn btn-secondary btn-sm"
                          style={{
                            cursor: uploadingGfxMedia ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: 0,
                          }}
                          title="Upload media files (stored in graphics media library)"
                        >
                          <UploadCloud size={13} color="var(--jns-gold)" />
                          <span>{uploadingGfxMedia ? 'Uploading…' : '+ Upload Media'}</span>
                          <input
                            type="file"
                            multiple
                            disabled={uploadingGfxMedia}
                            onChange={(e) => {
                              void handleUploadGfxFiles(e.target.files, 'ASSET');
                              e.target.value = '';
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <textarea
                        className="form-textarea"
                        placeholder="Paste URLs (1 per line) or use '+ Upload Media' above..."
                        value={gfxAssetsText}
                        onChange={(e) => setGfxAssetsText(e.target.value)}
                        rows={2}
                      />
                      {/* Uploaded asset files list */}
                      {uploadedAssetFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {uploadedAssetFiles.map((file, idx) => (
                            <div
                              key={file.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                borderRadius: 4,
                                backgroundColor: 'var(--bg-card-subtle)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: 11,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <FileText size={13} color="var(--jns-gold)" style={{ flexShrink: 0 }} />
                                <span
                                  style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 160,
                                    color: 'var(--text-main)',
                                    fontWeight: 500,
                                  }}
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  ({file.sizeFormatted})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setUploadedAssetFiles((prev) => prev.filter((_, i) => i !== idx))}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                                title="Remove file"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visual References / Examples */}
                    <div className="form-group">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                          flexWrap: 'wrap',
                          gap: 4,
                        }}
                      >
                        <label className="form-label" style={{ margin: 0 }}>
                          Visual References / Examples
                        </label>
                        <label
                          className="btn btn-secondary btn-sm"
                          style={{
                            cursor: uploadingGfxMedia ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: 0,
                          }}
                          title="Upload reference files (stored in graphics media library)"
                        >
                          <UploadCloud size={13} color="#38bdf8" />
                          <span>{uploadingGfxMedia ? 'Uploading…' : '+ Upload Media'}</span>
                          <input
                            type="file"
                            multiple
                            disabled={uploadingGfxMedia}
                            onChange={(e) => {
                              void handleUploadGfxFiles(e.target.files, 'REFERENCE');
                              e.target.value = '';
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <textarea
                        className="form-textarea"
                        placeholder="Paste URLs (1 per line) or use '+ Upload Media' above..."
                        value={gfxReferencesText}
                        onChange={(e) => setGfxReferencesText(e.target.value)}
                        rows={2}
                      />
                      {/* Uploaded reference files list */}
                      {uploadedRefFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {uploadedRefFiles.map((file, idx) => (
                            <div
                              key={file.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                borderRadius: 4,
                                backgroundColor: 'var(--bg-card-subtle)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: 11,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <FileText size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                                <span
                                  style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 160,
                                    color: 'var(--text-main)',
                                    fontWeight: 500,
                                  }}
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  ({file.sizeFormatted})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setUploadedRefFiles((prev) => prev.filter((_, i) => i !== idx))}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                                title="Remove file"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Assigned Designer</label>
                      <select
                        className="form-select"
                        value={gfxAssignedUserId}
                        onChange={(e) => setGfxAssignedUserId(e.target.value)}
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

                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={gfxPriority}
                        onChange={(e) => setGfxPriority(e.target.value as any)}
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High Priority</option>
                        <option value="URGENT">Urgent (Immediate Turnaround)</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                /* LONG TERM PROJECT FORM */
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Global Project Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2026 JNS Channel & Studio Graphics Overhaul, Election 2026 Graphics Package"
                      value={gfxTitle}
                      onChange={(e) => setGfxTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Project Scope & Concept</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Outline the overall goals, deliverables (stingers, video wall loops, lower thirds), and deliverables schedule..."
                      value={gfxDescription}
                      onChange={(e) => setGfxDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Target Completion Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={gfxDeadline ? gfxDeadline.split('T')[0] : ''}
                        onChange={(e) => setGfxDeadline(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Lead Designer</label>
                      <select
                        className="form-select"
                        value={gfxAssignedUserId}
                        onChange={(e) => setGfxAssignedUserId(e.target.value)}
                      >
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName || u.name} ({u.positionDisplay || u.jobFunction})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Project Priority</label>
                      <select
                        className="form-select"
                        value={gfxPriority}
                        onChange={(e) => setGfxPriority(e.target.value as any)}
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High Priority</option>
                        <option value="URGENT">Urgent Strategic</option>
                      </select>
                    </div>
                  </div>

                  {/* 8-STAGE SUBTASKS BUILDER */}
                  <div
                    style={{
                      background: 'var(--bg-card-subtle)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jns-gold)' }}>
                        Project Subtasks & Status Milestones ({gfxSubtasks.length})
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        Status stages: not started / concept / design / animation / implementation / finalizing / audio / done
                      </span>
                    </div>

                    {/* Subtask list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                      {gfxSubtasks.map((sub, idx) => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 170px 32px',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <input
                            type="text"
                            className="form-input"
                            value={sub.title}
                            onChange={(e) => {
                              const updated = [...gfxSubtasks];
                              updated[idx].title = e.target.value;
                              setGfxSubtasks(updated);
                            }}
                            style={{ fontSize: '12px', padding: '5px 8px' }}
                          />
                          <select
                            className="form-select"
                            value={sub.status}
                            onChange={(e) => {
                              const updated = [...gfxSubtasks];
                              updated[idx].status = e.target.value;
                              setGfxSubtasks(updated);
                            }}
                            style={{ fontSize: '11px', padding: '5px 6px' }}
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="CONCEPT">Concept</option>
                            <option value="DESIGN">Design</option>
                            <option value="ANIMATION">Animation</option>
                            <option value="IMPLEMENTATION">Implementation</option>
                            <option value="FINALIZING">Finalizing</option>
                            <option value="AUDIO">Audio</option>
                            <option value="DONE">Done</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setGfxSubtasks(gfxSubtasks.filter((_, i) => i !== idx));
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Remove subtask"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new subtask row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px 60px', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add new subtask title..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                            e.preventDefault();
                            setGfxSubtasks([
                              ...gfxSubtasks,
                              { id: `sub_${Date.now()}`, title: newSubtaskTitle.trim(), status: newSubtaskStatus },
                            ]);
                            setNewSubtaskTitle('');
                          }
                        }}
                        style={{ fontSize: '12px', padding: '5px 8px' }}
                      />
                      <select
                        className="form-select"
                        value={newSubtaskStatus}
                        onChange={(e) => setNewSubtaskStatus(e.target.value)}
                        style={{ fontSize: '11px', padding: '5px 6px' }}
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="CONCEPT">Concept</option>
                        <option value="DESIGN">Design</option>
                        <option value="ANIMATION">Animation</option>
                        <option value="IMPLEMENTATION">Implementation</option>
                        <option value="FINALIZING">Finalizing</option>
                        <option value="AUDIO">Audio</option>
                        <option value="DONE">Done</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (newSubtaskTitle.trim()) {
                            setGfxSubtasks([
                              ...gfxSubtasks,
                              { id: `sub_${Date.now()}`, title: newSubtaskTitle.trim(), status: newSubtaskStatus },
                            ]);
                            setNewSubtaskTitle('');
                          }
                        }}
                        className="btn btn-secondary btn-xs"
                        style={{ height: '31px', fontSize: '11px' }}
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Brand Assets (URLs, 1 per line)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Vector logos, fonts, color swatches..."
                        value={gfxAssetsText}
                        onChange={(e) => setGfxAssetsText(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Design References (URLs, 1 per line)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Style inspiration, motion reels, storyboards..."
                        value={gfxReferencesText}
                        onChange={(e) => setGfxReferencesText(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Palette size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {loading
                    ? 'Creating...'
                    : gfxType === 'LONG_TERM'
                    ? 'Create Long-Term Project'
                    : 'Submit Graphics Request'}
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
