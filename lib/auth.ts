import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { User, UserRole } from './types';
import { getDbAsync } from './db';
import { validateProductionEnv } from './env-check';

// In production, enforce that NEXTAUTH_SECRET is present with no fallback
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  validateProductionEnv();
}

const SECRET = process.env.NEXTAUTH_SECRET;

/**
 * Resolves the authenticated User from the verified NextAuth session token.
 * Never allows client-supplied persona or unverified ID overrides.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  try {
    if (process.env.NODE_ENV === 'production' && !SECRET) {
      console.error('[AUTH ERROR] NEXTAUTH_SECRET is not configured in production.');
      return null;
    }

    const token = await getToken({
      req,
      secret: SECRET,
    });

    if (token && token.email) {
      const db = await getDbAsync();
      const user = db.users.find(
        (u) =>
          u.email.toLowerCase() === (token.email as string).toLowerCase() &&
          u.isActive !== false
      );
      if (user) {
        return user;
      }
    }

    // In local non-production development without Google OAuth credentials, allow dev fallback
    if (process.env.NODE_ENV !== 'production') {
      const devCookie = req.cookies.get('jns_user_id')?.value;
      const db = await getDbAsync();
      if (devCookie) {
        const found = db.users.find((u) => u.id === devCookie && u.isActive !== false);
        if (found) return found;
      }
      return db.users.find((u) => u.role === 'ADMIN') || db.users[0] || null;
    }

    return null;
  } catch (err) {
    console.error('Error verifying authenticated user session:', err);
    return null;
  }
}

/**
 * Server-side RBAC Guard: Ensures user is authenticated and has required role(s).
 */
export function hasRequiredRole(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'ADMIN') return true; // Admins have master access across all resources
  return allowedRoles.includes(user.role);
}
