import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
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
          }),
        ]
      : []),
    // Credentials provider for local staging or dev when GOOGLE_CLIENT_ID is not configured
    CredentialsProvider({
      id: 'credentials',
      name: 'Google Workspace Simulation',
      credentials: {
        email: { label: 'JNS Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!email.endsWith('@jns.org')) {
          throw new Error('Access Restricted: Only @jns.org Google Workspace accounts are permitted.');
        }
        const db = getDb();
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
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'jns-secure-production-jwt-secret-key-32b',
  },
  secret: process.env.NEXTAUTH_SECRET || 'jns-secure-production-jwt-secret-key-32b',
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
      const db = getDb();
      const existingUser = db.users.find((u) => u.email.toLowerCase() === email && u.isActive !== false);
      if (!existingUser) {
        console.warn(`[AUTH BLOCKED] User not in authorized JNS team database: ${email}`);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const db = getDb();
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
