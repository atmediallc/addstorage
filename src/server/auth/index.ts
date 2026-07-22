// src/server/auth/index.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@/server/db';
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from '@/lib/email/resend';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 3600, // 1 hour
  },
  sendVerificationEmail: async ({
    user,
    token,
    url,
  }: {
    user: { email: string; name: string };
    token: string;
    url: string;
  }) => {
    await sendVerificationEmail(user.email, url, user.name);
  },
  forgotPassword: {
    sendResetEmail: async ({
      user,
      token,
      url,
    }: {
      user: { email: string; name: string };
      token: string;
      url: string;
    }) => {
      await sendResetPasswordEmail(user.email, url, user.name);
    },
    expiresIn: 3600, // 1 hour
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh every 24h
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      avatar: {
        type: 'string',
        nullable: true,
      },
      stripeId: {
        type: 'string',
        nullable: true,
      },
      cardBrand: {
        type: 'string',
        nullable: true,
      },
      cardLastFour: {
        type: 'string',
        nullable: true,
      },
      lastLoginAt: {
        type: 'date',
        nullable: true,
      },
      lastActivityAt: {
        type: 'date',
        nullable: true,
      },
      failedLoginAttempts: {
        type: 'number',
        defaultValue: 0,
      },
      lockedUntil: {
        type: 'date',
        nullable: true,
      },
      deletedAt: {
        type: 'date',
        nullable: true,
      },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
});

export type Session = typeof auth.$Infer.Session;
