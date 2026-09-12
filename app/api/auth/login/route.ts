import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // In production, direct login is completely disabled. Email entry alone must never authenticate anyone.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Direct email login is disabled in production. Authentication must use verified Google OAuth (@jns.org).' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, userId } = body;

    const db = await getDbAsync();
    let targetUser = null;

    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!cleanEmail.endsWith('@jns.org')) {
        return NextResponse.json(
          { error: 'Access denied: Only official @jns.org Google Workspace accounts are permitted to sign in.' },
          { status: 403 }
        );
      }
      targetUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail && u.isActive !== false);
      if (!targetUser) {
        return NextResponse.json(
          { error: `No active team profile found for ${cleanEmail}. Please ask an Administrator to register your account.` },
          { status: 404 }
        );
      }
    } else if (userId) {
      targetUser = db.users.find((u) => u.id === userId && u.isActive !== false);
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Please specify a valid @jns.org user account.' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true, user: targetUser });
    res.cookies.set('jns_user_id', targetUser.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
