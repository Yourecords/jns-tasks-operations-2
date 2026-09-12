import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { submitImprovement } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ improvements: db.improvements });
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const data = await req.json();

  try {
    submitImprovement(data, user);
    const db = getDb();
    return NextResponse.json({ success: true, improvements: db.improvements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit improvement' }, { status: 400 });
  }
}
