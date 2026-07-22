// src/server/trpc/context.ts
import { db } from '@/server/db';
import { auth } from '@/server/auth';

export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session: session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
