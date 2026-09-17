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
 * If the authenticated user is an Administrator and an impersonation cookie is set,
 * returns the impersonated user context (unless options.ignoreImpersonation is true).
 */
export async function getAuthenticatedUser(
  req: NextRequest,
  options?: { ignoreImpersonation?: boolean }
): Promise<User | null> {
  try {
    if (process.env.NODE_ENV === 'production' && !SECRET) {
      console.error('[AUTH ERROR] NEXTAUTH_SECRET is not configured in production.');
      return null;
    }

    let realUser: User | null = null;
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
        realUser = user;
      }
    }

    // In local non-production development without Google OAuth credentials, allow dev fallback ONLY if dev cookie is explicitly present
    if (!realUser && process.env.NODE_ENV !== 'production') {
      const devCookie = req.cookies.get('jns_user_id')?.value;
      if (devCookie) {
        const db = await getDbAsync();
        const found = db.users.find((u) => u.id === devCookie && u.isActive !== false);
        if (found) realUser = found;
      }
    }

    if (!realUser) return null;

    // View-As / Impersonation Mode:
    // If authenticated user is an Administrator (or in dev mode) and has active impersonation cookie
    if (!options?.ignoreImpersonation && (realUser.role === 'ADMIN' || process.env.NODE_ENV !== 'production')) {
      const impersonateId = req.cookies.get('jns_impersonate_user_id')?.value;
      if (impersonateId && impersonateId !== realUser.id) {
        const db = await getDbAsync();
        const impersonatedUser = db.users.find((u) => u.id === impersonateId && u.isActive !== false);
        if (impersonatedUser) {
          return {
            ...impersonatedUser,
            isImpersonated: true,
            realUser: {
              id: realUser.id,
              name: realUser.name,
              role: realUser.role,
              email: realUser.email,
            },
          };
        }
      }
    }

    return realUser;
  } catch (err) {
    console.error('Error verifying authenticated user session:', err);
    return null;
  }
}

/**
 * Resolves the true underlying authenticated user (ignoring any active View-As impersonation).
 */
export async function getRealAuthenticatedUser(req: NextRequest): Promise<User | null> {
  return getAuthenticatedUser(req, { ignoreImpersonation: true });
}

/**
 * Server-side RBAC Guard: Ensures user is authenticated and has required role(s).
 */
export function hasRequiredRole(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'ADMIN') return true; // Admins have master access across all resources
  return allowedRoles.includes(user.role);
}
