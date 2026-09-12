import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  const cookiesToClear = [
    'jns_user_id',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ];

  for (const cookieName of cookiesToClear) {
    res.cookies.set(cookieName, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return res;
}
