import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateUserCallSheet } from '@/lib/callsheet';

export async function GET(req: NextRequest) {
  const currentUser = getAuthenticatedUser(req);
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId') || currentUser.id;

  const db = getDb();
  const targetUser = db.users.find((u) => u.id === targetUserId) || currentUser;

  const callSheet = generateUserCallSheet(targetUser);

  return NextResponse.json({
    callSheet,
    availableUsers: db.users.filter((u) => u.isActive).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      positionDisplay: u.positionDisplay,
      email: u.email,
    })),
  });
}
