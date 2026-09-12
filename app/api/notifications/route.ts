import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ notifications: [] });
  }
  const db = await getDbAsync();
  const userNotifs = db.notifications.filter((n) => n.userId === user.id);
  return NextResponse.json({ notifications: userNotifs });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  const db = await getDbAsync();
  const notif = db.notifications.find((n) => n.id === id && n.userId === user.id);
  if (notif) {
    notif.isRead = true;
    await saveDbAsync(db);
  }
  return NextResponse.json({ success: true });
}
