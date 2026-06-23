import { createDefine } from "fresh";
import type { Persona } from "@/data/personas.ts";

// Shared request state, populated by routes/_middleware.ts.
export interface State {
  /** The active demo persona (from the `persona` cookie). */
  persona: Persona;
  /** The persona's OpenFGA user id, e.g. "user:thrall". */
  user: string;
}

export const define = createDefine<State>();
