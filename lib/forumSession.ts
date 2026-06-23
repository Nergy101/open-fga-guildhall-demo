/**
 * The Guild Forum's own login session — deliberately separate from the
 * explorer's `persona` cookie so a forum tab stays "logged in as X" while you
 * keep switching personas elsewhere.
 */
import { getCookie } from "@/lib/cookies.ts";
import { type Persona, PERSONAS, personaUser } from "@/data/personas.ts";

export const FORUM_COOKIE = "forum_user";

/** The persona the forum tab is logged in as, or null when signed out. */
export function forumPersona(req: Request): Persona | null {
  const id = getCookie(req, FORUM_COOKIE);
  if (!id) return null;
  return PERSONAS.find((p) => p.id === id) ?? null;
}

/** Set-Cookie header value that logs the forum in as `personaId`. */
export function loginCookie(personaId: string): string {
  return `${FORUM_COOKIE}=${
    encodeURIComponent(personaId)
  }; Path=/; SameSite=Lax; Max-Age=2592000`;
}

/** Set-Cookie header value that signs the forum out. */
export function logoutCookie(): string {
  return `${FORUM_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export { personaUser };
