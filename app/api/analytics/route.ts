import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { getProductionVelocityMetrics } from '@/lib/analytics';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Access denied: Production Analytics & Turnaround Velocity are restricted to Administrators.' },
      { status: 403 }
    );
  }

  const db = getDb();
  const summary = getProductionVelocityMetrics(db.productions, db.shows, db.users);

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
    summary,
  });
}
