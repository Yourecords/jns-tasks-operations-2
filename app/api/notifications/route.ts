import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const db = getDb();
  const userNotifs = db.notifications.filter((n) => n.userId === user.id);
  return NextResponse.json({ notifications: userNotifs });
}

export async function PATCH(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const { id } = await req.json();
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === id && n.userId === user.id);
  if (notif) {
    notif.isRead = true;
    saveDb(db);
  }
  return NextResponse.json({ success: true });
}
