import { define } from "@/utils.ts";
import { getPersona } from "@/data/personas.ts";

// Sets the `persona` cookie. The PersonaSwitcher island POSTs { persona } here
// then reloads the page so server-rendered access badges reflect the new identity.
export const handler = define.handlers({
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => ({})) as { persona?: string };
    const persona = getPersona(body.persona);
    const headers = new Headers({
      // 30 days, site-wide, lax — plenty for a local demo switch.
      "set-cookie": `persona=${
        encodeURIComponent(persona.id)
      }; Path=/; SameSite=Lax; Max-Age=2592000`,
    });
    return new Response(JSON.stringify({ persona: persona.id }), {
      status: 200,
      headers,
    });
  },
});
