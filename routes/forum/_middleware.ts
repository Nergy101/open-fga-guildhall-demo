import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { forumPersona, personaUser } from "@/lib/forumSession.ts";

const GUILD = "guild:ironforge";

// Gates the whole /forum/* subtree: requires a forum login, and resolves which
// side-nav sections the logged-in user may reach (each a live OpenFGA Check).
export default define.middleware(async (ctx) => {
  const persona = forumPersona(ctx.req);
  if (!persona) {
    return new Response(null, { status: 303, headers: { location: "/try" } });
  }
  const user = personaUser(persona.id);

  const r = await batchCheck([
    { id: "home", user, relation: "can_read", object: GUILD },
    { id: "ranks", user, relation: "can_manage_ranks", object: GUILD },
    { id: "disband", user, relation: "can_disband", object: GUILD },
    { id: "vbank", user, relation: "can_view", object: "vault:ironforge_bank" },
    { id: "vwar", user, relation: "can_view", object: "vault:war_chest" },
    { id: "rmc", user, relation: "can_view", object: "raid:molten_core" },
    { id: "rbwl", user, relation: "can_view", object: "raid:blackwing_lair" },
    { id: "rony", user, relation: "can_view", object: "raid:onyxia" },
    { id: "ctav", user, relation: "can_read", object: "channel:tavern_board" },
  ]);

  ctx.state.forum = {
    persona,
    user,
    nav: {
      home: r.home,
      bank: r.vbank || r.vwar,
      raids: r.rmc || r.rbwl || r.rony,
      channels: r.ctav, // tavern board is public, so this is always reachable
      officer: r.ranks || r.disband,
    },
  };
  return ctx.next();
});
