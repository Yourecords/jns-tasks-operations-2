import { NextRequest, NextResponse } from 'next/server';
import { getDb, SEED_USERS } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const urlUser = req.nextUrl.searchParams.get('asUser');
  const headerUserId = req.headers.get('x-user-id');
  const cookieUserId = req.cookies.get('jns_user_id')?.value;
  const targetId = urlUser || headerUserId || cookieUserId;

  const currentUser = targetId ? (db.users.find((u) => u.id === targetId) || null) : null;

  const res = NextResponse.json({
    user: currentUser,
    allUsers: db.users,
  });

  if (urlUser && currentUser) {
    res.cookies.set('jns_user_id', currentUser.id, { path: '/', maxAge: 60 * 60 * 24 * 30 });
  }

  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const res = NextResponse.json({ success: true, user });
  res.cookies.set('jns_user_id', user.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
