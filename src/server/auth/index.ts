import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@/server/db';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh every 24h
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'master',
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
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
