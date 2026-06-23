import { define } from "@/utils.ts";
import { getCookie } from "@/lib/cookies.ts";
import { getPersona, personaUser } from "@/data/personas.ts";

// Resolve the active persona from the `persona` cookie and expose it (plus the
// matching OpenFGA user id) to every downstream route and component.
export default define.middleware((ctx) => {
  const persona = getPersona(getCookie(ctx.req, "persona"));
  ctx.state.persona = persona;
  ctx.state.user = personaUser(persona.id);
  return ctx.next();
});
