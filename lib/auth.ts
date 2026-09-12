import { NextRequest } from 'next/server';
import { User } from './types';
import { getDb, SEED_USERS } from './db';

export function getAuthenticatedUser(req: NextRequest): User {
  const cookieUserId = req.cookies.get('jns_user_id')?.value;
  const headerUserId = req.headers.get('x-user-id');
  const targetId = headerUserId || cookieUserId;

  const db = getDb();
  if (targetId) {
    const found = db.users.find((u) => u.id === targetId);
    if (found) return found;
  }
  // Default to Zach (Producer) or Yuri (Admin)
  return db.users.find((u) => u.role === 'PRODUCER') || db.users[0] || SEED_USERS[0];
}
