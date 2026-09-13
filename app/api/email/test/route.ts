import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sendEmailWithResult, generateEmailHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Administrators and Producers can send test emails.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body.email && body.email.trim()) ? body.email.trim() : user.email;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Target email is required.' }, { status: 400 });
    }

    const testHtml = generateEmailHtml({
      recipientName: user.name,
      badgeText: 'Test Dispatch',
      badgeColor: '#10b981',
      headline: 'JNS Video Production Email Dispatcher Verified',
      summary: `This is a live test email sent from the JNS Video Production Task Management System. Automated task assignment, stage handoff, and deadline reminder emails are connected through the Resend HTTPS API.`,
      details: [
        { label: 'Sender', value: process.env.RESEND_FROM || 'JNS Video Production <notifications@jns-video.com>' },
        { label: 'Reply To', value: process.env.RESEND_REPLY_TO || 'production@jns.org' },
        { label: 'Recipient', value: targetEmail },
        { label: 'Sent By', value: `${user.name} (${user.role})` },
        { label: 'Timestamp', value: new Date().toLocaleString() },
        { label: 'Dispatcher Status', value: '<span style="color: #10b981; font-weight: bold;">ACTIVE & ONLINE</span>' },
      ],
      actionText: 'Open Production Dashboard',
      actionUrl: '/',
    });

    const result = await sendEmailWithResult({
      to: targetEmail,
      subject: `🧪 [Verified] JNS Video Production Email Dispatcher Test (${new Date().toLocaleTimeString()})`,
      html: testHtml,
      skipGuard: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Resend API error: ${result.error || 'Failed to send email.'}` },
        { status: 500 }
      );
    }

    const isAutomatedEnabled = process.env.ENABLE_EMAIL_DISPATCH === 'true';
    const notice = isAutomatedEnabled
      ? ''
      : ' (Automated workflow alerts currently idle: set ENABLE_EMAIL_DISPATCH=true in Railway to turn on automated triggers)';

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail} via Resend!${notice}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Error in /api/email/test:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
