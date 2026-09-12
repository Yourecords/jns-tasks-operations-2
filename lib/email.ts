import nodemailer from 'nodemailer';
import { User, Production } from './types';
import { getDb, saveDb } from './db';

// Transporter configuration with fallback
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === 'false' ? false : true,
  auth: {
    user: process.env.SMTP_USER || 'production@jns.org',
    pass: process.env.SMTP_PASS || 'nothrwwiitbuokxk',
  },
};

const defaultFrom = process.env.SMTP_FROM || '"JNS Video Production" <production@jns.org>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let transporterInstance: any = null;

function getTransporter(): any {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport(smtpConfig);
  }
  return transporterInstance;
}

/**
 * Verify current SMTP connection
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: `SMTP verified successfully via ${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.auth.user})` };
  } catch (error: any) {
    console.error('SMTP verification failed:', error);
    return { success: false, message: error.message || 'Failed to connect to SMTP server' };
  }
}

/**
 * Branded HTML Email Template Generator
 */
export function generateEmailHtml({
  recipientName,
  badgeText,
  badgeColor = '#ef4444',
  headline,
  summary,
  details,
  actionText = 'Open in JNS Task Hub',
  actionUrl,
}: {
  recipientName: string;
  badgeText: string;
  badgeColor?: string;
  headline: string;
  summary: string;
  details?: Array<{ label: string; value: string }>;
  actionText?: string;
  actionUrl: string;
}): string {
  const fullActionUrl = actionUrl.startsWith('http') ? actionUrl : `${appUrl}${actionUrl}`;

  const detailsRows = details && details.length > 0
    ? details
        .map(
          (d) => `
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8; width: 140px; border-bottom: 1px solid #1e293b;">
              <strong>${d.label}</strong>
            </td>
            <td style="padding: 8px 12px; font-size: 13px; color: #f1f5f9; border-bottom: 1px solid #1e293b;">
              ${d.value}
            </td>
          </tr>`
        )
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f17; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f293d; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 24px; border-bottom: 2px solid #ef4444;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: #dc2626; color: #ffffff; font-weight: 800; font-size: 13px; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.5px;">
                      JNS
                    </div>
                    <span style="font-size: 14px; font-weight: 600; color: #cbd5e1; margin-left: 10px; letter-spacing: 0.3px;">
                      VIDEO PRODUCTION TASK OPERATIONS
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffffff; background-color: ${badgeColor}; padding: 4px 8px; border-radius: 9999px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 24px 24px 24px;">
              <p style="margin: 0 0 12px; font-size: 15px; color: #94a3b8;">
                Shalom <strong>${recipientName}</strong>,
              </p>
              
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${headline}
              </h2>

              <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid ${badgeColor};">
                <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.6;">
                  ${summary.replace(/\n/g, '<br/>')}
                </p>
              </div>

              ${
                details && details.length > 0
                  ? `
              <!-- Key Information Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0f172a; border-radius: 8px; margin-bottom: 24px; border: 1px solid #1e293b;">
                ${detailsRows}
              </table>`
                  : ''
              }

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px auto 16px auto;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #dc2626;">
                    <a href="${fullActionUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #dc2626; border: 1px solid #ef4444;">
                      ${actionText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f17; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">
                Sent automatically by JNS Video Production Operations Hub
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Need help or have questions? Email <a href="mailto:production@jns.org" style="color: #94a3b8; text-decoration: underline;">production@jns.org</a>
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
}

/**
 * Dispatch an email notification safely
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const cleanText = text || subject;

    const info = await transporter.sendMail({
      from: defaultFrom,
      to,
      subject,
      text: cleanText,
      html,
    });

    console.log(`Email dispatched successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

/**
 * High-level helper to dispatch notification email based on user ID and event details
 */
export async function dispatchWorkflowEmail({
  userId,
  eventType,
  title,
  message,
  linkUrl,
  details,
}: {
  userId: string;
  eventType: 'STAGE_HANDOFF' | 'TASK_ASSIGNED' | 'REVISION_REQUESTED' | 'APPROVAL_REQUIRED' | 'DEADLINE_ALERT' | 'INFO';
  title: string;
  message: string;
  linkUrl: string;
  details?: Array<{ label: string; value: string }>;
}): Promise<boolean> {
  try {
    const db = getDb();
    
    // Check if email notifications are enabled
    if (db.systemSettings && (db.systemSettings as any).emailNotificationsEnabled === false) {
      console.log('Email notifications are globally disabled in system settings.');
      return false;
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user || !user.email) {
      console.warn(`Cannot send email: User ${userId} not found or has no email.`);
      return false;
    }

    let badgeText = 'Update';
    let badgeColor = '#3b82f6';

    switch (eventType) {
      case 'STAGE_HANDOFF':
        badgeText = 'Stage Handoff';
        badgeColor = '#8b5cf6'; // purple
        break;
      case 'TASK_ASSIGNED':
        badgeText = 'Task Assigned';
        badgeColor = '#0284c7'; // sky
        break;
      case 'REVISION_REQUESTED':
        badgeText = 'Revision Requested';
        badgeColor = '#f59e0b'; // amber
        break;
      case 'APPROVAL_REQUIRED':
        badgeText = 'Approval Required';
        badgeColor = '#e11d48'; // rose
        break;
      case 'DEADLINE_ALERT':
        badgeText = 'Deadline Alert';
        badgeColor = '#dc2626'; // red
        break;
      default:
        badgeText = 'Notification';
        badgeColor = '#3b82f6';
    }

    const html = generateEmailHtml({
      recipientName: user.name,
      badgeText,
      badgeColor,
      headline: title,
      summary: message,
      details,
      actionText: 'View Task & Production Details',
      actionUrl: linkUrl,
    });

    return await sendEmail({
      to: user.email,
      subject: `[JNS Video Operations] ${title}`,
      html,
    });
  } catch (err) {
    console.error('Error in dispatchWorkflowEmail:', err);
    return false;
  }
}

/**
 * Scan active productions for upcoming or overdue deadlines and send alerts
 */
export async function checkAndSendDeadlineAlerts(): Promise<{
  scanned: number;
  alertsSent: number;
  details: Array<{ productionTitle: string; stage: string; recipient: string; deadline: string }>;
}> {
  const db = getDb();
  const now = new Date().getTime();
  const alertsSentList: Array<{ productionTitle: string; stage: string; recipient: string; deadline: string }> = [];

  // Consider productions that are ACTIVE and not completed
  const activeProds = db.productions.filter((p) => p.status === 'ACTIVE');

  for (const prod of activeProds) {
    // Check if there is an active stage task with a dueDate
    const currentTask = prod.tasks.find((t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED');
    if (!currentTask || !currentTask.dueDate) continue;

    const dueTime = new Date(currentTask.dueDate).getTime();
    if (isNaN(dueTime)) continue;

    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    // If due within 24 hours (diffHours <= 24 and diffHours >= -48)
    if (diffHours <= 24 && diffHours >= -48) {
      const recipientUser = db.users.find((u) => u.id === currentTask.assignedUserId);
      if (!recipientUser) continue;

      const isOverdue = diffHours < 0;
      const timeStr = isOverdue
        ? `Overdue by ${Math.abs(Math.round(diffHours))} hours`
        : `Due in approx ${Math.max(1, Math.round(diffHours))} hours`;

      const subject = isOverdue
        ? `🚨 OVERDUE: ${prod.title} (${currentTask.stageName})`
        : `⏰ DEADLINE ALERT: ${prod.title} (${currentTask.stageName})`;

      const message = isOverdue
        ? `Your task for ${prod.title} (${currentTask.title}) is currently overdue. Target completion date was ${currentTask.dueDate}. Please update the status or notify the team.`
        : `Upcoming deadline reminder for ${prod.title} (${currentTask.title}). This task is scheduled for completion on ${currentTask.dueDate} (${timeStr}).`;

      const details = [
        { label: 'Production', value: prod.title },
        { label: 'Stage', value: currentTask.stageName },
        { label: 'Assigned Role', value: recipientUser.positionDisplay || recipientUser.role },
        { label: 'Due Date', value: currentTask.dueDate },
        { label: 'Status', value: isOverdue ? '<span style="color: #ef4444; font-weight: bold;">OVERDUE</span>' : '<span style="color: #f59e0b; font-weight: bold;">DUE SOON</span>' },
      ];

      const sent = await dispatchWorkflowEmail({
        userId: recipientUser.id,
        eventType: 'DEADLINE_ALERT',
        title: subject,
        message,
        linkUrl: `/productions/${prod.id}`,
        details,
      });

      if (sent) {
        alertsSentList.push({
          productionTitle: prod.title,
          stage: currentTask.stageName,
          recipient: `${recipientUser.name} (${recipientUser.email})`,
          deadline: currentTask.dueDate,
        });
      }
    }
  }

  return {
    scanned: activeProds.length,
    alertsSent: alertsSentList.length,
    details: alertsSentList,
  };
}
