import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkAndSendDeadlineAlerts } from '@/lib/email';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "PRODUCER")) {
    return NextResponse.json({ error: "Unauthorized: Only Administrators and Producers can check deadlines." }, { status: 403 });
  }
  try {
    const result = await checkAndSendDeadlineAlerts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('Error in /api/email/check-deadlines GET:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Administrators and Producers can trigger deadline checks.' },
        { status: 403 }
      );
    }

    const result = await checkAndSendDeadlineAlerts();
    return NextResponse.json({
      success: true,
      message: `Scanned ${result.scanned} active productions. Sent ${result.alertsSent} deadline alerts.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in /api/email/check-deadlines POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
