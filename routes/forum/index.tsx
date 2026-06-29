import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { getMotd, getVotes } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import ForumActionButton from "@/islands/ForumActionButton.tsx";
import MotdEditor from "@/islands/MotdEditor.tsx";
import { GUILDMASTERS, MAJORITY, MOTION } from "@/lib/council.ts";

const GUILD = "guild:ironforge";

// Ironforge's roster. Magni & Muradin are co-guildmasters — NPCs (not switchable
// personas) who hold guildmaster rank in the store, so the council has 3 GMs.
const ROSTER: { id: string; name: string; emoji: string; role: string }[] = [
  { id: "thrall", name: "Thrall", emoji: "👑", role: "Guildmaster" },
  { id: "magni", name: "Magni", emoji: "👑", role: "Guildmaster" },
  { id: "muradin", name: "Muradin", emoji: "👑", role: "Guildmaster" },
  { id: "jaina", name: "Jaina", emoji: "🛡️", role: "Officer" },
  { id: "arthas", name: "Arthas", emoji: "⚔️", role: "Raider" },
  { id: "rexxar", name: "Rexxar", emoji: "🌱", role: "Recruit" },
  { id: "guldan", name: "Gul'dan", emoji: "☠️", role: "Banned" },
];

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
      { id: "gm", user, relation: "guildmaster", object: GUILD },
    ]);
    const voters = getVotes(MOTION.id).map((v) => v.replace(/^user:/, ""));
    const council = {
      target: MOTION.target,
      targetName: MOTION.targetName,
      initiatorName: MOTION.initiatorName,
      voters,
      youVoted: voters.includes(forum.persona.id),
      passed: voters.length >= MAJORITY,
      majority: MAJORITY,
      total: GUILDMASTERS.length,
      isGuildmaster: c.gm,
    };
    return page({
      member: c.read,
      canEditMotd: c.motd,
      canInvite: c.invite,
      canKick: c.kick,
      canManageRanks: c.ranks,
      canDisband: c.disband,
      motd: getMotd(),
      council,
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
    council,
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

      <section class="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-semibold text-rose-100">
            🗳️ Council Motion — Depose {council.targetName}
          </h2>
          <span class="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-400/40">
            {council.voters.length}/{council.total} votes · needs{" "}
            {council.majority}
          </span>
        </div>
        <p class="mt-1 text-sm text-slate-300">
          <span class="text-rose-200">{council.targetName}</span>{" "}
          is being deposed by{" "}
          <span class="text-amber-200">{council.initiatorName}</span>.{" "}
          {council.passed
            ? "The council has reached a majority — the motion carries."
            : council.isGuildmaster
            ? (council.youVoted
              ? "Your vote is in. Waiting on the rest of the council…"
              : `Cast your vote, ${forum.persona.name}.`)
            : "Only the guild's council — its guildmasters — may vote."}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>Voted so far:</span>
          {council.voters.length === 0
            ? <span class="text-slate-500">— none —</span>
            : council.voters.map((v) => (
              <span
                key={v}
                class="rounded bg-slate-800/70 px-1.5 py-0.5 text-slate-200"
              >
                👑 {v.charAt(0).toUpperCase() + v.slice(1)}
              </span>
            ))}
        </div>
        {council.isGuildmaster && (
          <div class="mt-3">
            {council.passed
              ? (
                <ForumActionButton
                  kind="kick"
                  payload={{ target: council.target, body: council.targetName }}
                  label={`⚖️ Depose ${council.targetName}`}
                  tone="danger"
                  reload={false}
                />
              )
              : council.youVoted
              ? (
                <span class="text-[11px] text-slate-500">
                  One more guildmaster must agree to carry the motion.
                </span>
              )
              : (
                <ForumActionButton
                  kind="vote"
                  payload={{ target: council.target }}
                  label="🗳️ Cast your vote"
                  tone="primary"
                />
              )}
          </div>
        )}
      </section>

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
          {ROSTER.map((m) => {
            const banned = m.id === "guldan";
            const isGm = m.role === "Guildmaster";
            const isSelf = m.id === forum.persona.id;
            return (
              <li key={m.id} class="flex items-center gap-3 py-2">
                <span class="text-lg">{m.emoji}</span>
                <div class="flex-1">
                  <div class="text-sm text-slate-200">{m.name}</div>
                  <div
                    class={`text-[11px] ${
                      banned ? "text-rose-400" : "text-slate-500"
                    }`}
                  >
                    {m.role}
                  </div>
                </div>
                {!isSelf && (
                  isGm
                    ? (canManageRanks && (
                      <ForumActionButton
                        kind="kick"
                        payload={{ target: m.id, body: m.name }}
                        label="🗳️ Depose"
                        tone="danger"
                        size="xs"
                        reload={false}
                      />
                    ))
                    : (canKick && (
                      <span class="flex gap-1.5">
                        <ForumActionButton
                          kind="kick"
                          payload={{ target: m.id, body: m.name }}
                          label="Kick"
                          tone="danger"
                          size="xs"
                          reload={false}
                        />
                        {!banned && (
                          <ForumActionButton
                            kind="ban"
                            payload={{ target: m.id, body: m.name }}
                            label="🚫 Ban"
                            tone="danger"
                            size="xs"
                            reload={false}
                          />
                        )}
                      </span>
                    ))
                )}
              </li>
            );
          })}
        </ul>
        {canManageRanks && (
          <p class="mt-2 text-[11px] text-slate-500">
            🗳️ Deposing a guildmaster isn't unilateral — a{" "}
            <span class="text-amber-200">majority of the council</span>{" "}
            must vote them out (OpenFGA enforces the <code>can_remove</code>
            {" "}
            gate; the app tallies the votes). Use the council motion at the top
            to vote.
          </p>
        )}
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
