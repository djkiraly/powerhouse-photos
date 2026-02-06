// NextAuth Configuration
// Uses shared authentication database with Volleyball Fundraiser app

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authDb, users } from "@/lib/db-auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logAuthAudit } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Extract IP and user agent from request headers
        const forwardedFor = request?.headers?.get?.('x-forwarded-for');
        const ipAddress = forwardedFor?.split(',')[0]?.trim() || request?.headers?.get?.('x-real-ip') || null;
        const userAgent = request?.headers?.get?.('user-agent') || null;

        try {
          // Query auth database
          const [user] = await authDb
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (!user) {
            // Log failed login - user not found
            await logAuthAudit({
              action: 'USER_LOGIN_FAILED',
              userId: 'unknown',
              email: credentials.email as string,
              ipAddress,
              userAgent,
            });
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) {
            // Log failed login - wrong password
            await logAuthAudit({
              action: 'USER_LOGIN_FAILED',
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              email: user.email,
              ipAddress,
              userAgent,
            });
            return null;
          }

          // Update last login
          await authDb
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          // Log successful login
          await logAuthAudit({
            action: 'USER_LOGIN',
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            email: user.email,
            ipAddress,
            userAgent,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'player';
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'player';
    };
  }
  
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'player';
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: 'admin' | 'player';
  }
}
