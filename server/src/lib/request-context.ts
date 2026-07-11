import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { auth } from './auth.js';

const ROOMLY_SESSION_COOKIE = 'roomly_session_id';

export type RequestOwner = {
  sessionId: string;
  authUserId: string | null;
  authUserEmail: string | null;
};

export function getOrCreateRoomlySessionId(c: Context): string {
  const existing = getCookie(c, ROOMLY_SESSION_COOKIE);
  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  setCookie(c, ROOMLY_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return sessionId;
}

export async function getRequestOwner(c: Context): Promise<RequestOwner> {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  return {
    sessionId: getOrCreateRoomlySessionId(c),
    authUserId: session?.user.id ?? null,
    authUserEmail: session?.user.email ?? null,
  };
}
