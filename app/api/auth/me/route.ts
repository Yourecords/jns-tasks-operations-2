import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getAuthenticatedUser, getRealAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const realUser = await getRealAuthenticatedUser(req);
  if (!realUser) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required.' },
      { status: 401 }
    );
  }

  const effectiveUser = await getAuthenticatedUser(req);
  const db = await getDbAsync();

  const isImpersonating = Boolean(
    realUser.role === 'ADMIN' && effectiveUser && effectiveUser.id !== realUser.id
  );

  return NextResponse.json({
    user: effectiveUser,
    realUser: realUser.role === 'ADMIN' ? realUser : undefined,
    isImpersonating,
    canImpersonate: realUser.role === 'ADMIN' || process.env.NODE_ENV !== 'production',
    allUsers: (realUser.role === 'ADMIN' || effectiveUser?.role === 'ADMIN')
      ? db.users
      : db.users.filter((u) => u.isActive !== false),
  });
}

export async function POST(req: NextRequest) {
  const realUser = await getRealAuthenticatedUser(req);
  if (!realUser) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required.' },
      { status: 401 }
    );
  }

  const isDev = process.env.NODE_ENV !== 'production';
  // Strictly enforce that only Administrator (or dev mode) can use View-As mode
  if (realUser.role !== 'ADMIN' && !isDev) {
    return NextResponse.json(
      { error: 'Forbidden: Only Administrators can use View As mode.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { userId } = body;
  const db = await getDbAsync();

  // If userId is empty, null, or matches the realUser's id, exit View-As mode
  if (!userId || userId === realUser.id) {
    const res = NextResponse.json({
      success: true,
      user: realUser,
      realUser,
      isImpersonating: false,
    });
    res.cookies.delete('jns_impersonate_user_id');
    if (isDev) {
      res.cookies.set('jns_user_id', realUser.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  }

  const targetUser = db.users.find((u) => u.id === userId && u.isActive !== false);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userPayload = {
    ...targetUser,
    isImpersonated: true,
    realUser: {
      id: realUser.id,
      name: realUser.name,
      role: realUser.role,
      email: realUser.email,
    },
  };

  const res = NextResponse.json({
    success: true,
    user: userPayload,
    realUser,
    isImpersonating: true,
  });

  // Set the impersonation cookie
  res.cookies.set('jns_impersonate_user_id', targetUser.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // 12 hours
  });

  if (isDev) {
    res.cookies.set('jns_user_id', targetUser.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
