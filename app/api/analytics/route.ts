import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { getProductionVelocityMetrics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Access denied: Production Analytics & Turnaround Velocity are restricted to Administrators.' },
      { status: 403 }
    );
  }

  const db = await getDbAsync();
  const summary = getProductionVelocityMetrics(db.productions, db.shows, db.users);

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
    summary,
    productions: db.productions,
    shows: db.shows,
    users: db.users
      .filter((u) => u.isActive)
      .map((u) => ({
        id: u.id,
        name: u.name,
        fullName: u.fullName,
        role: u.role,
        jobFunction: u.jobFunction,
        email: u.email,
      })),
  });
}
