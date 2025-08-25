import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { UserJWT, AppRole, isValidRole } from '@/types/auth';
import { UserRole } from '@prisma/client';
import { env } from '@/lib/env';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 day for regular users
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
  providers: [
    // Admin/Teacher authentication (email/password)
    CredentialsProvider({
      id: 'admin-teacher',
      name: 'Admin/Teacher',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        collegeUsername: { label: 'College Username', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.collegeUsername) {
          return null;
        }

        try {
          // First resolve college
          const college = await db.college.findUnique({
            where: { 
              username: credentials.collegeUsername,
              isActive: true 
            }
          });

          if (!college) {
            return null;
          }

          // Try to find user in the specific college
          const user = await db.user.findFirst({ 
            where: { 
              email: credentials.email,
              collegeId: college.id,
              isActive: true
            } 
          });
          
          if (user && (await verifyPassword(credentials.password, user.password))) {
            // Validate role before returning
            if (isValidRole(user.role) && (user.role === 'TEACHER' || user.role === 'COLLEGE_ADMIN')) {
              return { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role as AppRole, 
                collegeId: user.collegeId, 
                image: null
              };
            }
          }

          return null;
        } catch (error) {
          console.error('Admin/Teacher auth error:', error);
          return null;
        }
      },
    }),

    // Student authentication (rollNo/password)
    CredentialsProvider({
      id: 'student',
      name: 'Student',
      credentials: {
        rollNo: { label: 'Roll Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        collegeUsername: { label: 'College Username', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.rollNo || !credentials?.password || !credentials?.collegeUsername) {
          return null;
        }

        try {
          // First resolve college
          const college = await db.college.findUnique({
            where: { 
              username: credentials.collegeUsername,
              isActive: true 
            }
          });

          if (!college) {
            return null;
          }

          // Try to find student in the specific college
          const student = await db.user.findFirst({ 
            where: { 
              rollNo: credentials.rollNo,
              collegeId: college.id,
              role: 'STUDENT',
              isActive: true
            } 
          });
          
          if (student && (await verifyPassword(credentials.password, student.password))) {
            return { 
              id: student.id, 
              name: student.name, 
              email: student.email, 
              role: 'STUDENT' as AppRole, 
              collegeId: student.collegeId, 
              image: null
            };
          }

          return null;
        } catch (error) {
          console.error('Student auth error:', error);
          return null;
        }
      },
    }),

    // Super Admin authentication (email/password) - no college required
    CredentialsProvider({
      id: 'super-admin',
      name: 'Super Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find super admin
          const superAdmin = await db.superAdmin.findUnique({ 
            where: { email: credentials.email } 
          });
          
          if (superAdmin && superAdmin.isActive && (await verifyPassword(credentials.password, superAdmin.password))) {
            return { 
              id: superAdmin.id, 
              name: superAdmin.name, 
              email: superAdmin.email, 
              role: 'SUPER_ADMIN' as AppRole, 
              collegeId: null, 
              image: null
            };
          }
          
          return null;
        } catch (error) {
          console.error('Super Admin auth error:', error);
          return null;
        }
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
        if (isValidRole(customUser.role || '')) {
          token.role = customUser.role as AppRole;
        }
        token.collegeId = customUser.collegeId;
        
        // Set different token expiration based on role
        if (customUser.role === 'SUPER_ADMIN' || customUser.role === 'COLLEGE_ADMIN') {
          token.exp = Math.floor(Date.now() / 1000) + (8 * 60 * 60); // 8 hours for admins
        } else {
          token.exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours for regular users
        }
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
          if (isValidRole(existingUser.role)) {
            token.role = existingUser.role as AppRole;
          }
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
          if (isValidRole(newUser.role)) {
            token.role = newUser.role as AppRole;
          }
        }
      }
      
      return token as UserJWT;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Type assertion for custom session user properties
        const customUser = session.user as any;
        customUser.id = token.id as string;
        if (isValidRole(token.role as string)) {
          customUser.role = token.role as AppRole;
        }
        customUser.collegeId = token.collegeId as string | undefined;
        
        // Add additional security metadata
        customUser.sessionId = token.jti; // JWT ID for session tracking
        customUser.issuedAt = token.iat; // Token issued at timestamp
        customUser.expiresAt = token.exp; // Token expiration timestamp
      }
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
};


