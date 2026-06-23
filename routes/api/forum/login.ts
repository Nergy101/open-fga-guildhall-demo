import { define } from "@/utils.ts";
import { PERSONAS } from "@/data/personas.ts";
import { loginCookie, logoutCookie } from "@/lib/forumSession.ts";

// Sets (or, with { logout: true }, clears) the forum's `forum_user` cookie.
// The /try login island POSTs { persona } here, then opens /forum in a new tab.
export const handler = define.handlers({
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => ({})) as {
      persona?: string;
      logout?: boolean;
    };

    if (body.logout) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "set-cookie": logoutCookie() },
      });
    }

    const persona = PERSONAS.find((p) => p.id === body.persona);
    if (!persona) {
      return Response.json({ ok: false, error: "unknown persona" }, {
        status: 400,
      });
    }
    return new Response(JSON.stringify({ ok: true, persona: persona.id }), {
      status: 200,
      headers: { "set-cookie": loginCookie(persona.id) },
    });
  },
});
