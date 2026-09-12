import { User, Production, ProductionTask } from './types';
import { getDb, saveDb } from './db';
import { sendEmail } from './email';

export interface CallSheetItem {
  title: string;
  subtitle: string;
  linkUrl: string;
  badge?: string;
  badgeColor?: string;
  priority?: string;
}

export interface CallSheetSection {
  title: string;
  icon: string;
  badgeColor?: string;
  items: CallSheetItem[];
}

export interface GeneratedCallSheet {
  recipient: User;
  targetDate: string;
  subject: string;
  headline: string;
  summary: string;
  sections: CallSheetSection[];
  totalActionItems: number;
  html: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function generateUserCallSheet(user: User, targetDateStr?: string): GeneratedCallSheet {
  const db = getDb();
  const today = targetDateStr || new Date().toISOString().split('T')[0];
  const dateFormatted = new Date(today).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const sections: CallSheetSection[] = [];
  let totalActionItems = 0;

  const isAdmin = user.role === 'ADMIN' || user.id === 'usr_yuri_admin';
  const isProducer = user.role === 'PRODUCER' || user.jobFunction === 'PRODUCER';
  const isEditor = user.jobFunction === 'VIDEO_EDITOR' || user.id === 'usr_ryan_editor' || user.id === 'usr_olga_editor' || user.id === 'usr_ksenia_editor';
  const isStudio = user.jobFunction === 'STUDIO_OPERATOR' || user.id === 'usr_ahron_studio';

  // 1. FOR YURI (DIRECTOR / ADMIN): Executive Production Briefing
  if (isAdmin) {
    // Shows & rentals recording today
    const shootsToday = db.productions.filter(
      (p) => p.status === 'ACTIVE' && p.filmingDate === today
    );
    if (shootsToday.length > 0) {
      sections.push({
        title: "Today's Studio Shoots & Recordings",
        icon: '🎬',
        badgeColor: '#3b82f6',
        items: shootsToday.map((p) => ({
          title: p.title,
          subtitle: `Type: ${p.type} • Priority: ${p.priority} • Producer: ${db.users.find((u) => u.id === p.producerId)?.name || 'Unassigned'}`,
          linkUrl: `/productions/${p.id}`,
          priority: p.priority,
          badge: p.type === 'RENTAL' ? 'RENTAL CLIENT' : 'STUDIO SHOOT',
          badgeColor: p.type === 'RENTAL' ? '#8b5cf6' : '#3b82f6',
        })),
      });
      totalActionItems += shootsToday.length;
    }

    // Episodes pending Yuri's final approval
    const pendingApproval = db.productions.filter(
      (p) => p.status === 'ACTIVE' && (p.currentStage === 'FINAL_APPROVAL' || p.currentStage === 'PRODUCER_REVIEW')
    );
    if (pendingApproval.length > 0) {
      sections.push({
        title: 'Episodes Pending Final Approval / Review',
        icon: '✍️',
        badgeColor: '#eab308',
        items: pendingApproval.map((p) => ({
          title: p.title,
          subtitle: `Stage: ${p.currentStage.replace(/_/g, ' ')} • Editor: ${db.users.find((u) => u.id === p.editorId)?.name || 'Unassigned'}`,
          linkUrl: `/productions/${p.id}`,
          priority: p.priority,
          badge: 'ACTION REQUIRED',
          badgeColor: '#eab308',
        })),
      });
      totalActionItems += pendingApproval.length;
    }

    // Blocked tasks across entire team
    const blockedTasks: Array<{ task: ProductionTask; prod: Production }> = [];
    for (const prod of db.productions) {
      for (const t of prod.tasks) {
        if (t.status === 'BLOCKED') {
          blockedTasks.push({ task: t, prod });
        }
      }
    }
    if (blockedTasks.length > 0) {
      sections.push({
        title: '⚠️ Pipeline Blockers Requiring Attention',
        icon: '🚨',
        badgeColor: '#ef4444',
        items: blockedTasks.map(({ task, prod }) => ({
          title: `${prod.title} — ${task.title}`,
          subtitle: `Assigned: ${db.users.find((u) => u.id === task.assignedUserId)?.name || 'User'} • Blocker: "${task.blockedReason || 'Needs assistance'}"`,
          linkUrl: `/productions/${prod.id}`,
          priority: 'URGENT',
          badge: 'BLOCKED',
          badgeColor: '#ef4444',
        })),
      });
      totalActionItems += blockedTasks.length;
    }

    // Active Equipment Loans
    const activeGear = (db.gearCheckouts || []).filter((g) => !g.isReturned);
    if (activeGear.length > 0) {
      sections.push({
        title: 'Studio Gear Checked Out',
        icon: '📦',
        badgeColor: '#06b6d4',
        items: activeGear.map((g) => ({
          title: `${g.gearName} — With ${g.checkedOutToName}`,
          subtitle: `Project: ${g.projectOrShowName || 'General'} • Expected Return: ${g.expectedReturnDate}`,
          linkUrl: `/gear-log`,
          badge: g.expectedReturnDate < today ? 'OVERDUE' : 'ON LOAN',
          badgeColor: g.expectedReturnDate < today ? '#ef4444' : '#06b6d4',
        })),
      });
    }
  }

  // 2. FOR PRODUCERS (Zach, Barbara, etc.)
  if (isProducer && !isAdmin) {
    // Filming schedule today
    const myFilmingToday = db.productions.filter(
      (p) => p.producerId === user.id && p.status === 'ACTIVE' && p.filmingDate === today
    );
    if (myFilmingToday.length > 0) {
      sections.push({
        title: "Today's Filming Schedule",
        icon: '🎬',
        badgeColor: '#3b82f6',
        items: myFilmingToday.map((p) => ({
          title: p.title,
          subtitle: `Stage: ${p.currentStage} • Assigned Editor: ${db.users.find((u) => u.id === p.editorId)?.name || 'TBD'}`,
          linkUrl: `/productions/${p.id}`,
          priority: p.priority,
          badge: 'FILMING TODAY',
          badgeColor: '#3b82f6',
        })),
      });
      totalActionItems += myFilmingToday.length;
    }

    // Packages you need to write
    const packagesToComplete = db.productions.filter(
      (p) => p.producerId === user.id && p.status === 'ACTIVE' && p.currentStage === 'PRODUCER_PACKAGE'
    );
    if (packagesToComplete.length > 0) {
      sections.push({
        title: 'Producer Packages Ready to Write',
        icon: '📝',
        badgeColor: '#f97316',
        items: packagesToComplete.map((p) => ({
          title: p.title,
          subtitle: `Footage is uploaded in control room. Editor awaiting your assembly notes & B-roll instructions.`,
          linkUrl: `/productions/${p.id}`,
          priority: p.priority,
          badge: 'NOTES NEEDED',
          badgeColor: '#f97316',
        })),
      });
      totalActionItems += packagesToComplete.length;
    }

    // Drafts waiting for your review
    const draftsToReview = db.productions.filter(
      (p) => p.producerId === user.id && p.status === 'ACTIVE' && p.currentStage === 'PRODUCER_REVIEW'
    );
    if (draftsToReview.length > 0) {
      sections.push({
        title: 'Drafts Waiting for Your Review',
        icon: '🔍',
        badgeColor: '#eab308',
        items: draftsToReview.map((p) => {
          const cycle = p.revisionCycles[p.revisionCycles.length - 1];
          return {
            title: `${p.title} (Draft ${cycle?.draftNumber || 1})`,
            subtitle: `Submitted by ${db.users.find((u) => u.id === p.editorId)?.name || 'Editor'}. Decision needed (Approve vs Revision Required).`,
            linkUrl: `/productions/${p.id}`,
            priority: p.priority,
            badge: 'REVIEW READY',
            badgeColor: '#eab308',
          };
        }),
      });
      totalActionItems += draftsToReview.length;
    }

    // My tasks
    const myTasks = db.productions
      .flatMap((p) => p.tasks.map((t) => ({ task: t, prod: p })))
      .filter(({ task }) => task.assignedUserId === user.id && task.status !== 'COMPLETED');
    if (myTasks.length > 0 && sections.length === 0) {
      sections.push({
        title: 'Your Open Tasks',
        icon: '📋',
        badgeColor: '#64748b',
        items: myTasks.slice(0, 5).map(({ task, prod }) => ({
          title: `${prod.title}: ${task.title}`,
          subtitle: `Status: ${task.status.replace(/_/g, ' ')} • Priority: ${task.priority}`,
          linkUrl: `/productions/${prod.id}`,
          priority: task.priority,
          badge: task.status,
        })),
      });
      totalActionItems += myTasks.length;
    }
  }

  // 3. FOR VIDEO EDITORS (Ryan, Olga, Ksenia, etc.)
  if (isEditor && !isAdmin) {
    // Active editing cuts
    const activeEdits = db.productions.filter(
      (p) => p.editorId === user.id && p.status === 'ACTIVE' && p.currentStage === 'EDITING'
    );
    if (activeEdits.length > 0) {
      sections.push({
        title: 'Cuts & Drafts Assigned for Editing',
        icon: '✂️',
        badgeColor: '#10b981',
        items: activeEdits.map((p) => {
          const cycle = p.revisionCycles[p.revisionCycles.length - 1];
          const isRevision = cycle && cycle.draftNumber > 1;
          return {
            title: `${p.title} — Draft ${cycle?.draftNumber || 1}${isRevision ? ' (Revision)' : ''}`,
            subtitle: `Deadline: ${p.editingDeadline || 'Standard turnaround'} • Producer: ${db.users.find((u) => u.id === p.producerId)?.name || 'Producer'}`,
            linkUrl: `/productions/${p.id}`,
            priority: p.priority,
            badge: isRevision ? 'REVISION DUE' : 'EDIT IN PROGRESS',
            badgeColor: isRevision ? '#ef4444' : '#10b981',
          };
        }),
      });
      totalActionItems += activeEdits.length;
    }

    // Final upload tasks
    const finalUploads = db.productions.filter(
      (p) => p.editorId === user.id && p.status === 'ACTIVE' && p.currentStage === 'FINAL_UPLOAD'
    );
    if (finalUploads.length > 0) {
      sections.push({
        title: 'Approved — Final Master Uploads Due',
        icon: '🚀',
        badgeColor: '#8b5cf6',
        items: finalUploads.map((p) => ({
          title: p.title,
          subtitle: `Episode approved! Render and upload final master files to YouTube and Dropbox.`,
          linkUrl: `/productions/${p.id}`,
          priority: 'HIGH',
          badge: 'UPLOAD MASTER',
          badgeColor: '#8b5cf6',
        })),
      });
      totalActionItems += finalUploads.length;
    }
  }

  // 4. FOR STUDIO (Ahron)
  if (isStudio && !isAdmin) {
    // Studio shoot times and rentals
    const studioShoots = db.productions.filter((p) => p.status === 'ACTIVE' && (p.filmingDate === today || p.type === 'RENTAL'));
    if (studioShoots.length > 0) {
      sections.push({
        title: 'Studio Schedule & Shoot Times Today',
        icon: '🎙️',
        badgeColor: '#3b82f6',
        items: studioShoots.map((p) => ({
          title: p.title,
          subtitle: p.type === 'RENTAL' ? `Client Rental: ${p.rentalDetails?.clientName || 'Client'} (${p.rentalDetails?.recordingTime || 'Day booking'})` : `Studio Production • Producer: ${db.users.find((u) => u.id === p.producerId)?.name || 'Producer'}`,
          linkUrl: `/productions/${p.id}`,
          badge: p.type === 'RENTAL' ? 'CLIENT RENTAL' : 'STUDIO SHOOT',
          badgeColor: p.type === 'RENTAL' ? '#8b5cf6' : '#3b82f6',
        })),
      });
      totalActionItems += studioShoots.length;
    }

    // Raw Footage Uploads needed
    const uploadsPending = db.productions.filter(
      (p) => p.status === 'ACTIVE' && p.currentStage === 'FILES_UPLOADED'
    );
    if (uploadsPending.length > 0) {
      sections.push({
        title: 'Footage Upload Checklist (Control Room Ingest)',
        icon: '📤',
        badgeColor: '#f59e0b',
        items: uploadsPending.map((p) => ({
          title: p.title,
          subtitle: `Ingest ISOs and raw footage to Dropbox/EditShare so producer can prepare notes.`,
          linkUrl: `/productions/${p.id}`,
          badge: 'INGEST REQUIRED',
          badgeColor: '#f59e0b',
        })),
      });
      totalActionItems += uploadsPending.length;
    }

    // Gear loans
    const gearOut = (db.gearCheckouts || []).filter((g) => !g.isReturned);
    if (gearOut.length > 0) {
      sections.push({
        title: 'Active Gear Checkouts & Loans',
        icon: '🎒',
        badgeColor: '#06b6d4',
        items: gearOut.map((g) => ({
          title: `${g.gearName} (Loaned to ${g.checkedOutToName})`,
          subtitle: `Return Due: ${g.expectedReturnDate} • Project: ${g.projectOrShowName || 'On-location'}`,
          linkUrl: `/gear-log`,
          badge: g.expectedReturnDate < today ? 'OVERDUE' : 'ON LOAN',
          badgeColor: g.expectedReturnDate < today ? '#ef4444' : '#06b6d4',
        })),
      });
    }
  }

  // Fallback if no specific section populated
  if (sections.length === 0) {
    const activeProds = db.productions.filter((p) => p.status === 'ACTIVE').slice(0, 4);
    sections.push({
      title: 'Current Active Pipeline',
      icon: '📌',
      badgeColor: '#64748b',
      items: activeProds.map((p) => ({
        title: p.title,
        subtitle: `Stage: ${p.currentStage.replace(/_/g, ' ')} • Producer: ${db.users.find((u) => u.id === p.producerId)?.name || 'Producer'}`,
        linkUrl: `/productions/${p.id}`,
        badge: p.currentStage,
      })),
    });
  }

  const subject = `JNS Morning Call-Sheet — ${dateFormatted} (${user.name})`;
  const headline = `Good morning, ${user.name}`;
  const summary = totalActionItems > 0
    ? `You have ${totalActionItems} active production item${totalActionItems > 1 ? 's' : ''} on your call-sheet today.`
    : `All clear! Here is your quick production status overview for ${dateFormatted}.`;

  // Construct styled HTML email
  const sectionHtml = sections
    .map((sec) => {
      const itemsHtml = sec.items
        .map(
          (item) => `
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 12px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 14px; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">
                      <a href="${appUrl}${item.linkUrl}" style="color: #f8fafc; text-decoration: none;">${item.title}</a>
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                      ${item.subtitle}
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle; white-space: nowrap; padding-left: 12px;">
                    ${
                      item.badge
                        ? `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: ${item.badgeColor || '#334155'}; color: #ffffff;">${item.badge}</span>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
        )
        .join('');

      return `
        <div style="margin-bottom: 24px;">
          <div style="font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">${sec.icon}</span> ${sec.title}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; border-radius: 8px; border: 1px solid #1e293b; overflow: hidden;">
            ${itemsHtml}
          </table>
        </div>
      `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #030712; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #090d16; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; background: linear-gradient(135deg, #111827 0%, #030712 100%); border-bottom: 1px solid #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #ef4444; margin-bottom: 6px;">
                      DAILY CALL-SHEET • 08:30 DIGEST
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
                      ${headline}
                    </div>
                    <div style="font-size: 13px; color: #94a3b8;">
                      ${dateFormatted} • Role: <strong style="color: #cbd5e1;">${user.positionDisplay || user.role}</strong>
                    </div>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <div style="padding: 6px 12px; background-color: #1e293b; border-radius: 6px; font-size: 12px; font-weight: 700; color: #f8fafc;">
                      ${totalActionItems} Active Items
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary banner -->
          <tr>
            <td style="padding: 16px 28px; background-color: #0d1321; border-bottom: 1px solid #1e293b; font-size: 13px; color: #cbd5e1;">
              ${summary}
            </td>
          </tr>

          <!-- Body Sections -->
          <tr>
            <td style="padding: 24px 28px;">
              ${sectionHtml}

              <!-- Direct Link Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto 8px auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #dc2626;">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #dc2626; border: 1px solid #ef4444;">
                      Open JNS Video Production Hub &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #030712; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">
                Sent automatically every morning at 08:30 AM via JNS Production Operations
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Reply to <a href="mailto:production@jns.org" style="color: #94a3b8; text-decoration: underline;">production@jns.org</a> for support or updates.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return {
    recipient: user,
    targetDate: today,
    subject,
    headline,
    summary,
    sections,
    totalActionItems,
    html,
  };
}

export async function dispatchDailyCallSheets(targetUserId?: string): Promise<{
  dispatchedCount: number;
  results: Array<{ userId: string; userName: string; email: string; success: boolean; itemsCount: number; error?: string }>;
}> {
  const db = getDb();
  let recipients = db.users.filter((u) => u.isActive && u.email);

  if (targetUserId) {
    recipients = recipients.filter((u) => u.id === targetUserId);
  }

  const results: Array<{ userId: string; userName: string; email: string; success: boolean; itemsCount: number; error?: string }> = [];

  for (const user of recipients) {
    try {
      const callSheet = generateUserCallSheet(user);
      const sent = await sendEmail({
        to: user.email,
        subject: callSheet.subject,
        html: callSheet.html,
        text: `${callSheet.headline}\n\n${callSheet.summary}\n\nView full details on JNS Hub: ${appUrl}`,
      });

      results.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        success: sent,
        itemsCount: callSheet.totalActionItems,
      });
    } catch (err: any) {
      results.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        success: false,
        itemsCount: 0,
        error: err.message || 'Failed to dispatch call-sheet',
      });
    }
  }

  return {
    dispatchedCount: results.filter((r) => r.success).length,
    results,
  };
}
