import { createDefine } from "fresh";
import type { Persona } from "@/data/personas.ts";

// Shared request state, populated by routes/_middleware.ts.
export interface State {
  /** The active demo persona (from the `persona` cookie). */
  persona: Persona;
  /** The persona's OpenFGA user id, e.g. "user:thrall". */
  user: string;
  /** Forum session (set by routes/forum/_middleware.ts when logged in). */
  forum?: ForumState;
}

/** Which forum sections the logged-in user may reach (drives the side-nav). */
export interface ForumNav {
  home: boolean;
  bank: boolean;
  raids: boolean;
  channels: boolean;
  officer: boolean;
}

/** The forum's own login session, independent of the explorer `persona` cookie. */
export interface ForumState {
  persona: Persona;
  user: string;
  nav: ForumNav;
}

export const define = createDefine<State>();
