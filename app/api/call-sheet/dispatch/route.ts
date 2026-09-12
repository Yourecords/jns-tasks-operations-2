import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { dispatchDailyCallSheets } from '@/lib/callsheet';
import { logAudit } from '@/lib/workflow';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized: Only Administrators can trigger batch call-sheet dispatch.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

    const outcome = await dispatchDailyCallSheets(targetUserId);

    logAudit(
      undefined,
      user,
      'DISPATCH_DAILY_CALLSHEETS',
      `Dispatched morning call-sheets to ${outcome.dispatchedCount} team members.${targetUserId ? ` (Filtered to user ${targetUserId})` : ''}`
    );

    return NextResponse.json({
      success: true,
      dispatchedCount: outcome.dispatchedCount,
      results: outcome.results,
    });
  } catch (err: any) {
    console.error('Call-sheet dispatch error:', err);
    return NextResponse.json({ error: err.message || 'Internal dispatch error' }, { status: 500 });
  }
}
