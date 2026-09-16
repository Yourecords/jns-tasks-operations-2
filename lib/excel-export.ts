import ExcelJS from 'exceljs';
import { Production, Show, User, GearItem, GearCheckoutRecord, AnalyticsSummary } from './types';
import { getProductionVelocityMetrics, formatHours, formatHoursShort, calculateHoursBetween } from './analytics';

export type DateRangePreset = 'ALL' | '7D' | '30D' | '90D' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD' | 'CUSTOM';
export type DateFilterBasis = 'PUBLISHED' | 'FILMING';

export interface AnalyticsExportSections {
  summary: boolean;
  shows: boolean;
  producers: boolean;
  editors: boolean;
  ledger: boolean;
}

export interface AnalyticsExportOptions {
  preset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  dateBasis: DateFilterBasis;
  sections: AnalyticsExportSections;
  productions: Production[];
  shows: Show[];
  users: User[];
}

export interface GearExportOptions {
  includeInventory: boolean;
  includeActiveLoans: boolean;
  includeHistory: boolean;
  inventory: GearItem[];
  checkouts: GearCheckoutRecord[];
}

/**
 * Computes start and end YYYY-MM-DD dates for standard presets
 */
export function getDateRangeFromPreset(preset: DateRangePreset): { start: string; end: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (preset === 'ALL') {
    return { start: '', end: '' };
  }

  if (preset === '7D') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: d.toISOString().slice(0, 10), end: todayStr };
  }

  if (preset === '30D') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: d.toISOString().slice(0, 10), end: todayStr };
  }

  if (preset === '90D') {
    const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { start: d.toISOString().slice(0, 10), end: todayStr };
  }

  if (preset === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfMonth.toISOString().slice(0, 10), end: todayStr };
  }

  if (preset === 'LAST_MONTH') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: startOfLastMonth.toISOString().slice(0, 10),
      end: endOfLastMonth.toISOString().slice(0, 10),
    };
  }

  if (preset === 'YTD') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { start: startOfYear.toISOString().slice(0, 10), end: todayStr };
  }

  return { start: '', end: '' };
}

/**
 * Filters productions by date range according to selected dateBasis
 */
export function filterProductionsByDateRange(
  productions: Production[],
  startDate?: string,
  endDate?: string,
  dateBasis: DateFilterBasis = 'PUBLISHED'
): Production[] {
  if (!startDate && !endDate) return productions;

  return productions.filter((prod) => {
    let dateStr = '';
    if (dateBasis === 'FILMING') {
      dateStr = prod.filmingDate || '';
    } else {
      // Default basis: published date (or publication deadline / filming date if completed)
      dateStr = prod.publishedAt
        ? prod.publishedAt.slice(0, 10)
        : prod.publicationDeadline || prod.filmingDate || '';
    }

    if (!dateStr) return false;
    const itemDate = dateStr.slice(0, 10);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });
}

/**
 * Applies professional header and cell styling to an ExcelJS worksheet
 */
function styleWorksheet(sheet: ExcelJS.Worksheet, headerRowIndex = 1) {
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark Navy
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  // Set borders for data rows and auto-width
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < headerRowIndex) return;
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    if (rowNumber > headerRowIndex && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }, // Light gray zebra stripe
      };
    }
  });

  // Auto-fit column widths
  sheet.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 3, 14), 48);
  });
}

/**
 * Exports Performance Analytics to an Excel file (.xlsx)
 */
export async function exportAnalyticsToExcel(options: AnalyticsExportOptions): Promise<void> {
  const { startDate, endDate, dateBasis, sections, productions, shows, users } = options;

  // 1. Filter productions by time window
  const filteredProds = filterProductionsByDateRange(productions, startDate, endDate, dateBasis);
  const summary: AnalyticsSummary = getProductionVelocityMetrics(filteredProds, shows, users);

  const showMap = new Map<string, Show>();
  shows.forEach((s) => showMap.set(s.id, s));

  const userMap = new Map<string, User>();
  users.forEach((u) => userMap.set(u.id, u));

  // 2. Create Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JNS Video Production Operations';
  workbook.lastModifiedBy = 'JNS Video Production Operations';
  workbook.created = new Date();
  workbook.modified = new Date();

  const periodLabel =
    startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `Since ${startDate}`
      : endDate
      ? `Up to ${endDate}`
      : 'All Time';

  // --------------------------------------------------------------------------
  // SHEET 1: Executive Summary
  // --------------------------------------------------------------------------
  if (sections.summary) {
    const sheet = workbook.addWorksheet('Executive Summary', {
      views: [{ showGridLines: true }],
    });

    // Report Header Banner
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'JNS VIDEO PRODUCTION — OPERATIONS & PERFORMANCE REPORT';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Deep Navy
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:D2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Time Period: ${periodLabel}  |  Filtered By: ${dateBasis === 'FILMING' ? 'Filming Date' : 'Publication Date'}  |  Exported: ${new Date().toLocaleString()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    // KPI Metrics Table
    sheet.addRow(['Metric', 'Value', 'Unit / Details', 'Benchmark Target']);
    styleWorksheet(sheet, 4);

    const ov = summary.overallVelocity;

    sheet.addRow([
      'Completed Episodes in Period',
      ov.completedEpisodesCount,
      'Episodes published or delivered',
      'Continuous weekly cadence',
    ]);
    sheet.addRow([
      'M1: Producer Sign-Off Turnaround',
      ov.metric1HoursAvg !== null ? `${ov.metric1HoursAvg} hrs` : '—',
      formatHours(ov.metric1HoursAvg),
      '≤ 24 hours from filming',
    ]);
    sheet.addRow([
      'M2: Video Editing Turnaround',
      ov.metric2HoursAvg !== null ? `${ov.metric2HoursAvg} hrs` : '—',
      formatHours(ov.metric2HoursAvg),
      '≤ 48 hours for Draft 1',
    ]);
    sheet.addRow([
      'M3: Total Velocity (Filming to Publish)',
      ov.metric3HoursAvg !== null ? `${ov.metric3HoursAvg} hrs` : '—',
      formatHours(ov.metric3HoursAvg),
      '≤ 72 hours full production cycle',
    ]);
    sheet.addRow([
      'Active Productions in Flight',
      filteredProds.filter((p) => p.status === 'ACTIVE' && p.currentStage !== 'PUBLISHED').length,
      'Currently in pipeline stages',
      'Steady buffer',
    ]);

    sheet.columns.forEach((col) => {
      col.width = 30;
    });
  }

  // --------------------------------------------------------------------------
  // SHEET 2: Show Breakdown
  // --------------------------------------------------------------------------
  if (sections.shows) {
    const sheet = workbook.addWorksheet('Show Breakdown', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Show Name',
      'Episodes in Period',
      'Avg Producer Sign-Off (M1)',
      'Avg Video Editing (M2)',
      'Avg Filming-to-Publish Total (M3)',
      'Status in Period',
    ];
    sheet.addRow(headers);

    for (const s of summary.showBreakdown || []) {
      sheet.addRow([
        s.showName,
        s.sampleCount,
        formatHoursShort(s.metric1Hours),
        formatHoursShort(s.metric2Hours),
        formatHoursShort(s.metric3Hours),
        s.sampleCount > 0 ? 'Active Cadence' : 'No Episodes in Range',
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // --------------------------------------------------------------------------
  // SHEET 3: Producer Performance
  // --------------------------------------------------------------------------
  if (sections.producers) {
    const sheet = workbook.addWorksheet('Producer Performance', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Producer Name',
      'Episodes Managed',
      'Packages Completed',
      'Avg Package Sign-Off Turnaround',
      'Formatted Duration',
      'Performance Rating',
    ];
    sheet.addRow(headers);

    for (const p of summary.producers || []) {
      const avgH = p.avgHoursToEditorNotes;
      let rating = 'Standard Pace';
      if (avgH !== null && avgH <= 24) rating = 'Fast (< 24h)';
      else if (avgH !== null && avgH > 48) rating = 'Review Delay (> 48h)';

      sheet.addRow([
        p.producerName,
        p.episodesProducedCount,
        p.completedPackagesCount,
        avgH !== null ? `${avgH} hrs` : '—',
        formatHours(avgH),
        rating,
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // --------------------------------------------------------------------------
  // SHEET 4: Editor Performance
  // --------------------------------------------------------------------------
  if (sections.editors) {
    const sheet = workbook.addWorksheet('Editor Performance', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Video Editor',
      'Drafts Completed',
      'Avg Edit Turnaround per Draft',
      'Formatted Duration',
      'Avg Revision Rounds',
      'Revision Health',
    ];
    sheet.addRow(headers);

    for (const e of summary.editors || []) {
      const avgRev = e.totalRevisionCyclesAvg !== null ? e.totalRevisionCyclesAvg : 1;
      let revHealth = 'Clean (≤ 1.2 rounds)';
      if (avgRev > 1.8) revHealth = 'High Revisions (> 1.8 rounds)';
      else if (avgRev > 1.2) revHealth = 'Moderate Revisions';

      sheet.addRow([
        e.editorName,
        e.draftsDeliveredCount,
        e.avgHoursToFirstDraft !== null ? `${e.avgHoursToFirstDraft} hrs` : '—',
        formatHours(e.avgHoursToFirstDraft),
        e.totalRevisionCyclesAvg !== null ? e.totalRevisionCyclesAvg.toFixed(1) : '1.0',
        revHealth,
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // --------------------------------------------------------------------------
  // SHEET 5: Episode Production Ledger
  // --------------------------------------------------------------------------
  if (sections.ledger) {
    const sheet = workbook.addWorksheet('Episode Ledger', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Episode ID',
      'Show',
      'Ep #',
      'Title',
      'Status',
      'Current Stage',
      'Filming Date',
      'Filming Time',
      'Publish Date',
      'Producer',
      'Assigned Editor',
      'M1: Footage to Package (Hrs)',
      'M2: Edit to Draft 1 (Hrs)',
      'M3: Footage to Approval (Hrs)',
    ];
    sheet.addRow(headers);

    for (const prod of filteredProds) {
      const show = showMap.get(prod.showId || '');
      const producer = userMap.get(prod.producerId || show?.producerId || '');
      const editor = userMap.get(prod.editorId || '');

      const uploadTime = prod.fileUploadRecord?.completedAt;
      const packageTime = prod.producerPackage?.completedAt;
      const firstDraftSubmittedTime = prod.revisionCycles?.[0]?.submittedAt;
      const finalApprovalTask = prod.tasks?.find((t) => t.stageName === 'FINAL_APPROVAL' && t.status === 'COMPLETED');
      const finalApprovalTime = prod.finalApprovedAt || finalApprovalTask?.completedAt || (prod.currentStage === 'PUBLISHED' ? prod.publishedAt : undefined);

      const m1 = calculateHoursBetween(uploadTime, packageTime);
      const m2 = calculateHoursBetween(packageTime, firstDraftSubmittedTime);
      const m3 = calculateHoursBetween(uploadTime, finalApprovalTime);

      sheet.addRow([
        prod.id,
        show?.name || 'Standard Production',
        prod.episodeNumber || '—',
        prod.title,
        prod.status,
        prod.currentStage,
        prod.filmingDate || '—',
        prod.filmingTime || '—',
        prod.publishedAt?.slice(0, 10) || prod.publicationDeadline || '—',
        producer?.fullName || producer?.name || 'Unassigned',
        editor?.fullName || editor?.name || 'Unassigned',
        m1 !== null ? `${m1}h` : '—',
        m2 !== null ? `${m2}h` : '—',
        m3 !== null ? `${m3}h` : '—',
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // 3. Write and Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateTag = new Date().toISOString().slice(0, 10);
  const cleanPeriod = options.preset.toLowerCase().replace('_', '-');
  const filename = `JNS_Performance_Report_${cleanPeriod}_${dateTag}.xlsx`;

  downloadBlob(blob, filename);
}

/**
 * Exports Equipment Inventory and Studio Gear Log to an Excel file (.xlsx)
 */
export async function exportGearInventoryToExcel(options: GearExportOptions): Promise<void> {
  const { includeInventory, includeActiveLoans, includeHistory, inventory, checkouts } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JNS Video Production Operations';
  workbook.created = new Date();

  // 1. Equipment Inventory
  if (includeInventory) {
    const sheet = workbook.addWorksheet('Equipment Inventory', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Asset ID',
      'Equipment Name',
      'Category',
      'Model',
      'Serial Number',
      'Studio Barcode',
      'Storage Location',
      'Condition',
      'Status',
      'Current Borrower',
      'Project / Shoot',
      'Notes & Accessories',
    ];
    sheet.addRow(headers);

    for (const item of inventory) {
      const activeCheckout = (checkouts || []).find(
        (c) => c.gearItemId === item.id && !c.isReturned
      );

      sheet.addRow([
        item.id,
        item.name,
        item.category,
        item.model,
        item.serialNumber,
        item.barcode || 'N/A',
        item.location || 'Studio Equipment Room',
        item.condition || 'GOOD',
        item.status === 'CHECKED_OUT' ? 'CHECKED OUT' : item.status,
        activeCheckout ? activeCheckout.checkedOutToName : '—',
        activeCheckout ? activeCheckout.projectOrShowName : '—',
        item.notes || '',
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // 2. Active Loans
  if (includeActiveLoans) {
    const sheet = workbook.addWorksheet('Active Crew Loans', {
      views: [{ showGridLines: true }],
    });

    const activeCheckouts = (checkouts || []).filter((c) => !c.isReturned);
    const todayStr = new Date().toISOString().slice(0, 10);

    const headers = [
      'Loan ID',
      'Equipment Item',
      'Checked Out To',
      'Crew Email',
      'Authorized By',
      'Project / Show',
      'Checkout Date',
      'Expected Return Date',
      'Loan Status',
      'Checkout Notes',
    ];
    sheet.addRow(headers);

    for (const c of activeCheckouts) {
      const isOverdue = c.expectedReturnDate && c.expectedReturnDate < todayStr;
      sheet.addRow([
        c.id,
        c.gearName,
        c.checkedOutToName,
        c.checkedOutToEmail || '—',
        c.checkedOutByName || 'Yuri / Ahron',
        c.projectOrShowName,
        c.checkoutDate ? c.checkoutDate.slice(0, 10) : '—',
        c.expectedReturnDate || '—',
        isOverdue ? 'OVERDUE' : 'ON LOAN',
        c.checkoutNotes || '',
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  // 3. Checkout History
  if (includeHistory) {
    const sheet = workbook.addWorksheet('Checkout History', {
      views: [{ showGridLines: true }],
    });

    const returnedLoans = (checkouts || []).filter((c) => c.isReturned);

    const headers = [
      'Loan ID',
      'Equipment Item',
      'Checked Out To',
      'Project / Show',
      'Checkout Date',
      'Actual Return Date',
      'Return Condition',
      'Authorized By',
      'Return Notes',
    ];
    sheet.addRow(headers);

    for (const c of returnedLoans) {
      sheet.addRow([
        c.id,
        c.gearName,
        c.checkedOutToName,
        c.projectOrShowName,
        c.checkoutDate ? c.checkoutDate.slice(0, 10) : '—',
        c.actualReturnDate ? c.actualReturnDate.slice(0, 10) : '—',
        c.returnCondition || 'GOOD',
        c.checkedOutByName || 'Yuri / Ahron',
        c.returnNotes || '',
      ]);
    }

    styleWorksheet(sheet, 1);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `JNS_Studio_Gear_Log_${dateTag}.xlsx`;

  downloadBlob(blob, filename);
}

/**
 * Browser download helper
 */
function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
