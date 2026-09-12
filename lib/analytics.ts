import { Production, Show, User, AnalyticsSummary, VelocityMetric, ProducerPerformance, EditorPerformance } from './types';

/**
 * Calculates hours difference between two ISO date strings.
 * Returns null if either date is invalid or end < start.
 */
export function calculateHoursBetween(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10; // Round to 1 decimal place
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours} hrs`;
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return `${days}d ${remHours}h (${hours} hrs)`;
}

export function formatHoursShort(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';
  if (hours < 24) return `${hours}h`;
  const days = (hours / 24).toFixed(1);
  return `${days}d (${hours}h)`;
}

/**
 * Calculates turnaround velocity metrics for all shows, producers, and editors.
 */
export function getProductionVelocityMetrics(
  productions: Production[],
  shows: Show[],
  users: User[]
): AnalyticsSummary {
  const showMap = new Map<string, Show>();
  shows.forEach((s) => showMap.set(s.id, s));

  const userMap = new Map<string, User>();
  users.forEach((u) => userMap.set(u.id, u));

  // Temporary show aggregation
  const showStats = new Map<
    string,
    {
      showId: string;
      showName: string;
      m1Values: number[];
      m2Values: number[];
      m3Values: number[];
      count: number;
    }
  >();

  // Temporary producer aggregation
  const producerStats = new Map<
    string,
    {
      producerId: string;
      producerName: string;
      m1Values: number[];
      episodeCount: number;
    }
  >();

  // Temporary editor aggregation
  const editorStats = new Map<
    string,
    {
      editorId: string;
      editorName: string;
      m2Values: number[];
      cycleCounts: number[];
      draftCount: number;
    }
  >();

  const allM1: number[] = [];
  const allM2: number[] = [];
  const allM3: number[] = [];
  let completedEpisodesCount = 0;

  for (const prod of productions) {
    // Only analyze standard episodes (skip rentals or pilots without full cycles unless completed)
    if (prod.type === 'RENTAL') continue;

    const showId = prod.showId || 'unknown';
    const show = showMap.get(showId);
    const showName = show?.name || prod.title.split('—')[0]?.trim() || 'General Episode';

    if (!showStats.has(showId)) {
      showStats.set(showId, {
        showId,
        showName,
        m1Values: [],
        m2Values: [],
        m3Values: [],
        count: 0,
      });
    }
    const currentShowStat = showStats.get(showId)!;

    // Track producer
    const producerId = prod.producerId;
    if (producerId) {
      if (!producerStats.has(producerId)) {
        const u = userMap.get(producerId);
        producerStats.set(producerId, {
          producerId,
          producerName: u?.name || 'Producer',
          m1Values: [],
          episodeCount: 0,
        });
      }
    }

    // Track editor
    const editorId = prod.editorId;
    if (editorId) {
      if (!editorStats.has(editorId)) {
        const u = userMap.get(editorId);
        editorStats.set(editorId, {
          editorId,
          editorName: u?.name || 'Editor',
          m2Values: [],
          cycleCounts: [],
          draftCount: 0,
        });
      }
    }

    // Metric 1: Uploaded files from control room -> Producer notes ready
    const uploadTime = prod.fileUploadRecord?.completedAt;
    const packageTime = prod.producerPackage?.completedAt;
    const m1 = calculateHoursBetween(uploadTime, packageTime);

    if (m1 !== null) {
      allM1.push(m1);
      currentShowStat.m1Values.push(m1);
      if (producerId && producerStats.has(producerId)) {
        producerStats.get(producerId)!.m1Values.push(m1);
      }
    }

    // Metric 2: Producer notes ready -> Editor submitted first draft
    const firstDraftSubmittedTime = prod.revisionCycles?.[0]?.submittedAt;
    const m2 = calculateHoursBetween(packageTime, firstDraftSubmittedTime);

    if (m2 !== null) {
      allM2.push(m2);
      currentShowStat.m2Values.push(m2);
      if (editorId && editorStats.has(editorId)) {
        const ed = editorStats.get(editorId)!;
        ed.m2Values.push(m2);
        ed.draftCount += prod.revisionCycles.filter((r) => r.submittedAt).length || 1;
        ed.cycleCounts.push(prod.revisionCycles.length || 1);
      }
    }

    // Metric 3: Uploaded files from control room -> Final episode approval
    // Check finalApprovedAt first, then fallback to final approval task completedAt or publishedAt
    const finalApprovalTask = prod.tasks?.find((t) => t.stageName === 'FINAL_APPROVAL' && t.status === 'COMPLETED');
    const finalApprovalTime = prod.finalApprovedAt || finalApprovalTask?.completedAt || (prod.currentStage === 'PUBLISHED' ? prod.publishedAt : undefined);
    const m3 = calculateHoursBetween(uploadTime, finalApprovalTime);

    if (m3 !== null) {
      allM3.push(m3);
      currentShowStat.m3Values.push(m3);
    }

    if (prod.status === 'COMPLETED' || prod.currentStage === 'PUBLISHED' || m3 !== null) {
      completedEpisodesCount++;
      currentShowStat.count++;
      if (producerId && producerStats.has(producerId)) {
        producerStats.get(producerId)!.episodeCount++;
      }
    }
  }

  const avg = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  const showBreakdown: VelocityMetric[] = Array.from(showStats.values())
    .filter((s) => s.m1Values.length > 0 || s.m2Values.length > 0 || s.m3Values.length > 0)
    .map((s) => ({
      showId: s.showId,
      showName: s.showName,
      metric1Hours: avg(s.m1Values),
      metric2Hours: avg(s.m2Values),
      metric3Hours: avg(s.m3Values),
      sampleCount: Math.max(s.m1Values.length, s.m2Values.length, s.m3Values.length, s.count),
    }))
    .sort((a, b) => b.sampleCount - a.sampleCount);

  // Producers breakdown
  const producers: ProducerPerformance[] = Array.from(producerStats.values())
    .map((p) => ({
      producerId: p.producerId,
      producerName: p.producerName,
      completedPackagesCount: p.m1Values.length,
      avgHoursToEditorNotes: avg(p.m1Values),
      episodesProducedCount: Math.max(p.episodeCount, p.m1Values.length),
    }))
    .sort((a, b) => b.completedPackagesCount - a.completedPackagesCount);

  // Editors breakdown
  const editors: EditorPerformance[] = Array.from(editorStats.values())
    .map((e) => ({
      editorId: e.editorId,
      editorName: e.editorName,
      draftsDeliveredCount: e.draftCount || e.m2Values.length,
      avgHoursToFirstDraft: avg(e.m2Values),
      totalRevisionCyclesAvg: avg(e.cycleCounts),
    }))
    .sort((a, b) => b.draftsDeliveredCount - a.draftsDeliveredCount);

  return {
    overallVelocity: {
      metric1HoursAvg: avg(allM1),
      metric2HoursAvg: avg(allM2),
      metric3HoursAvg: avg(allM3),
      completedEpisodesCount,
    },
    showBreakdown,
    producers,
    editors,
  };
}
