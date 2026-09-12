import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  // Clear the jns_user_id cookie
  res.cookies.set('jns_user_id', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
