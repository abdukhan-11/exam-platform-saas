import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { UserJWT, AppRole } from '@/types/auth';
import { UserRole } from '@prisma/client';
import { env } from '@/lib/env';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 day
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Try to find user first
        const user = await db.user.findUnique({ 
          where: { email: credentials.email } 
        });
        
        if (user && user.isActive && (await verifyPassword(credentials.password, user.password))) {
          return { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            collegeId: user.collegeId, 
            image: user.avatar 
          };
        }

        // If not found, try super admin
        const superAdmin = await db.superAdmin.findUnique({ 
          where: { email: credentials.email } 
        });
        
        if (superAdmin && superAdmin.isActive && (await verifyPassword(credentials.password, superAdmin.password))) {
          return { 
            id: superAdmin.id, 
            name: superAdmin.name, 
            email: superAdmin.email, 
            role: 'SUPER_ADMIN' as AppRole, 
            image: null // SuperAdmin doesn't have avatar field
          };
        }
        
        return null;
      },
    }),
    // Only add Google provider if credentials are available
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Type assertion for custom user properties
        const customUser = user as { role?: AppRole; collegeId?: string };
        token.role = customUser.role as AppRole;
        token.collegeId = customUser.collegeId;
      }
      
      // Handle Google OAuth
      if (account?.provider === 'google') {
        // For Google OAuth, we might need to create or find the user
        // This is a simplified version - you might want to enhance this
        const existingUser = await db.user.findUnique({
          where: { email: token.email! },
        });
        
        if (existingUser) {
          token.id = existingUser.id;
          token.role = existingUser.role as AppRole;
          token.collegeId = existingUser.collegeId;
        } else {
          // Create new user for Google OAuth
          const newUser = await db.user.create({
            data: {
              name: token.name!,
              email: token.email!,
              password: '', // Google users don't have passwords
              role: UserRole.STUDENT, // Default role
              isActive: true,
            },
          });
          token.id = newUser.id;
          token.role = newUser.role as AppRole;
        }
      }
      
      return token as UserJWT;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Type assertion for custom session user properties
        const customUser = session.user as any;
        customUser.id = token.id as string;
        customUser.role = token.role as AppRole;
        customUser.collegeId = token.collegeId as string | undefined;
      }
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
};


