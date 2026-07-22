import { db } from '@/server/db';
import { auth } from '@/server/auth';

export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
