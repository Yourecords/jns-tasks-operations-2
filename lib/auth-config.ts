import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDbAsync } from './db';
import { validateProductionEnv } from './env-check';

// Fail startup in production if any required secrets are missing
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  validateProductionEnv();
}

const isProduction = process.env.NODE_ENV === 'production';

// In production, NEXTAUTH_SECRET is strictly required; no fallback secret allowed
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          hd: 'jns.org',
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    })
  );
}

// CredentialsProvider is ONLY available in non-production environments for local developer simulation.
// In production, it is completely disabled and excluded: email entry alone must NEVER authenticate anyone.
if (!isProduction) {
  providers.push(
    CredentialsProvider({
      id: 'credentials',
      name: 'Google Workspace Simulation (Development Only)',
      credentials: {
        email: { label: 'JNS Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!email.endsWith('@jns.org')) {
          throw new Error('Access Restricted: Only @jns.org Google Workspace accounts are permitted.');
        }
        const db = await getDbAsync();
        const user = db.users.find((u) => u.email.toLowerCase() === email && u.isActive !== false);
        if (!user) {
          throw new Error(`Access Denied: No active team account found for ${email}.`);
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: nextAuthSecret,
  },
  secret: nextAuthSecret,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      const email = user.email.trim().toLowerCase();
      // Must be @jns.org
      if (!email.endsWith('@jns.org')) {
        console.warn(`[AUTH BLOCKED] Non-jns domain attempted login: ${email}`);
        return false;
      }
      const db = await getDbAsync();
      const existingUser = db.users.find((u) => u.email.toLowerCase() === email && u.isActive !== false);
      if (!existingUser) {
        console.warn(`[AUTH BLOCKED] User not in authorized JNS team database: ${email}`);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const db = await getDbAsync();
        const existingUser = db.users.find((u) => u.email.toLowerCase() === user.email?.toLowerCase());
        if (existingUser) {
          token.id = existingUser.id;
          token.role = existingUser.role;
          token.jobFunction = existingUser.jobFunction;
          token.positionDisplay = existingUser.positionDisplay;
          token.name = existingUser.name;
          token.fullName = existingUser.fullName;
          token.avatarUrl = existingUser.avatarUrl;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).jobFunction = token.jobFunction;
        (session.user as any).positionDisplay = token.positionDisplay;
        (session.user as any).fullName = token.fullName;
      }
      return session;
    },
  },
};
