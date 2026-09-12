import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { submitProblemReport } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ problemReports: db.anonymousProblemReports });
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const data = await req.json();

  try {
    submitProblemReport(data, user);
    const db = getDb();
    return NextResponse.json({ success: true, problemReports: db.anonymousProblemReports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit report' }, { status: 400 });
  }
}
