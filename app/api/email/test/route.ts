import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sendEmail, generateEmailHtml, verifySmtpConnection } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (user.role !== 'ADMIN' && user.role !== 'PRODUCER') {
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

    const verification = await verifySmtpConnection();
    if (!verification.success) {
      return NextResponse.json(
        { error: `SMTP Connection error: ${verification.message}` },
        { status: 500 }
      );
    }

    const testHtml = generateEmailHtml({
      recipientName: user.name,
      badgeText: 'Test Dispatch',
      badgeColor: '#10b981',
      headline: 'JNS Video Production Email Dispatcher Verified',
      summary: `This is a live test email sent from the JNS Video Production Task Management System. All automated task assignment, stage handoff, and deadline reminder dispatches are fully active and connected via production@jns.org.`,
      details: [
        { label: 'Sender', value: 'production@jns.org' },
        { label: 'Recipient', value: targetEmail },
        { label: 'Sent By', value: `${user.name} (${user.role})` },
        { label: 'Timestamp', value: new Date().toLocaleString() },
        { label: 'Dispatcher Status', value: '<span style="color: #10b981; font-weight: bold;">ACTIVE & ONLINE</span>' },
      ],
      actionText: 'Open Production Dashboard',
      actionUrl: '/',
    });

    const sent = await sendEmail({
      to: targetEmail,
      subject: `🧪 [Verified] JNS Video Production Email Dispatcher Test (${new Date().toLocaleTimeString()})`,
      html: testHtml,
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send email. Check SMTP server logs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}!`,
    });
  } catch (error: any) {
    console.error('Error in /api/email/test:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
