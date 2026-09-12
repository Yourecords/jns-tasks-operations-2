import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const db = getDb();
  const currentUser = await getAuthenticatedUser(req);

  return NextResponse.json({
    user: currentUser,
    allUsers: currentUser?.role === 'ADMIN' ? db.users : db.users.filter((u) => u.isActive !== false),
  });
}

export async function POST(req: NextRequest) {
  // Disallow user switching in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'User switching is disabled in production. Authenticate with Google Workspace.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { userId } = body;
  const db = getDb();
  const user = db.users.find((u) => u.id === userId && u.isActive !== false);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const res = NextResponse.json({ success: true, user });
  res.cookies.set('jns_user_id', user.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
