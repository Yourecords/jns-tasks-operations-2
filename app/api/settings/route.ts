import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { logAudit } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ settings: db.systemSettings });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
    return NextResponse.json(
      { error: 'Unauthorized: Only Producers and Department Heads can update system settings and links.' },
      { status: 403 }
    );
  }

  const data = await req.json();
  const db = getDb();

  // If role is PRODUCER, allow updating scheduleUrl and productionEmailUrl
  if (user.role === 'PRODUCER') {
    if (data.scheduleUrl !== undefined) {
      db.systemSettings.scheduleUrl = data.scheduleUrl;
    }
    if (data.productionEmailUrl !== undefined) {
      db.systemSettings.productionEmailUrl = data.productionEmailUrl;
    }
    db.systemSettings.lastUpdated = new Date().toISOString();
    saveDb(db);
    logAudit(undefined, user, 'UPDATE_SCHEDULE_LINK', `Producer ${user.name} updated schedule link to: ${data.scheduleUrl || db.systemSettings.scheduleUrl}`);
    return NextResponse.json({ success: true, settings: db.systemSettings });
  }

  // If role is ADMIN, allow full settings update
  db.systemSettings = {
    ...db.systemSettings,
    ...data,
    lastUpdated: new Date().toISOString(),
  };

  saveDb(db);
  logAudit(undefined, user, 'UPDATE_SETTINGS', `Admin ${user.name} updated system links and settings`);
  return NextResponse.json({ success: true, settings: db.systemSettings });
}
