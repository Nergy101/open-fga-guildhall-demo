import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { PERSONAS } from "@/data/personas.ts";
import { getMotd } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import ForumActionButton from "@/islands/ForumActionButton.tsx";
import MotdEditor from "@/islands/MotdEditor.tsx";

const GUILD = "guild:ironforge";

// Ironforge's own roster (Medivh is allied, the Guest is unaffiliated).
const ROSTER = ["thrall", "jaina", "arthas", "rexxar", "guldan"];

export const handler = define.handlers({
  async GET(ctx) {
    const forum = ctx.state.forum;
    if (!forum) {
      return new Response(null, { status: 303, headers: { location: "/try" } });
    }
    const user = forum.user;
    const c = await batchCheck([
      { id: "read", user, relation: "can_read", object: GUILD },
      { id: "motd", user, relation: "can_edit_motd", object: GUILD },
      { id: "invite", user, relation: "can_invite", object: GUILD },
      { id: "kick", user, relation: "can_kick", object: GUILD },
      { id: "ranks", user, relation: "can_manage_ranks", object: GUILD },
      { id: "disband", user, relation: "can_disband", object: GUILD },
    ]);
    return page({
      member: c.read,
      canEditMotd: c.motd,
      canInvite: c.invite,
      canKick: c.kick,
      canManageRanks: c.ranks,
      canDisband: c.disband,
      motd: getMotd(),
    });
  },
});

export default define.page<typeof handler>(function GuildHall({ data, state }) {
  const forum = state.forum!;
  const {
    member,
    canEditMotd,
    canInvite,
    canKick,
    canManageRanks,
    canDisband,
    motd,
  } = data;

  if (!member) {
    return (
      <ForumShell forum={forum} active="home">
        <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 class="text-xl font-bold text-amber-100">
            🏰 Ironforge Guild Hall
          </h1>
          <p class="mt-2 text-slate-300">
            You're signed in as{" "}
            <span class="text-amber-200">
              {forum.persona.emoji} {forum.persona.name}
            </span>, but you're not a member of Ironforge — so the hall is
            closed to you.
          </p>
          <p class="mt-2 text-sm text-slate-400">
            {forum.persona.id === "guldan"
              ? "You're on the blocklist. Membership perks are revoked — but the public Tavern board is still open."
              : "Only the public Tavern board (and any alliance-shared spaces) are open to you."}
          </p>
          <a
            href="/forum/channels"
            class="mt-4 inline-block rounded-lg border border-amber-400/50 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/25"
          >
            Go to Channels →
          </a>
        </div>
      </ForumShell>
    );
  }

  return (
    <ForumShell forum={forum} active="home">
      <h1 class="text-xl font-bold text-amber-100">🏰 Ironforge Guild Hall</h1>

      <section class="mt-4 rounded-xl border border-amber-500/20 bg-slate-900/40 p-4">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
          Message of the day
        </div>
        <div class="mt-1">
          {canEditMotd
            ? <MotdEditor initial={motd} />
            : <p class="text-amber-100">{motd}</p>}
        </div>
      </section>

      <section class="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-slate-100">Roster</h2>
          {canInvite && (
            <ForumActionButton
              kind="invite"
              label="+ Invite member"
              tone="primary"
              reload={false}
            />
          )}
        </div>
        <ul class="mt-3 divide-y divide-slate-800/70">
          {ROSTER.map((id) => {
            const p = PERSONAS.find((x) => x.id === id)!;
            const banned = id === "guldan";
            return (
              <li key={id} class="flex items-center gap-3 py-2">
                <span class="text-lg">{p.emoji}</span>
                <div class="flex-1">
                  <div class="text-sm text-slate-200">{p.name}</div>
                  <div
                    class={`text-[11px] ${
                      banned ? "text-rose-400" : "text-slate-500"
                    }`}
                  >
                    {p.role}
                  </div>
                </div>
                {canKick && id !== forum.persona.id &&
                  p.role !== "Guildmaster" && (
                  <ForumActionButton
                    kind="kick"
                    payload={{ target: id, body: p.name }}
                    label="Kick"
                    tone="danger"
                    size="xs"
                    reload={false}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {(canManageRanks || canDisband) && (
        <section class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 class="flex items-center gap-2 font-semibold text-amber-100">
            👑 Officer tools
          </h2>
          <p class="text-[11px] text-slate-400">
            Only ranks high enough see these — and the server checks again
            before acting.
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            {canManageRanks && (
              <ForumActionButton
                kind="manageRanks"
                label="Manage ranks"
                tone="primary"
                reload={false}
              />
            )}
            {canDisband && (
              <ForumActionButton
                kind="disband"
                label="Disband guild"
                tone="danger"
                reload={false}
              />
            )}
          </div>
        </section>
      )}
    </ForumShell>
  );
});
