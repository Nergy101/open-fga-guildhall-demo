import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { RESOURCES } from "@/data/catalog.ts";
import { getPersona } from "@/data/personas.ts";
import { getSignups, isSignedUp } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import ForumActionButton from "@/islands/ForumActionButton.tsx";

interface RaidView {
  object: string;
  name: string;
  emoji: string;
  blurb: string;
  canSignup: boolean;
  canLoot: boolean;
  canTactics: boolean;
  canEdit: boolean;
  signedUp: boolean;
  roster: { emoji: string; name: string }[];
}

export const handler = define.handlers({
  async GET(ctx) {
    const forum = ctx.state.forum;
    if (!forum) {
      return new Response(null, { status: 303, headers: { location: "/try" } });
    }
    const user = forum.user;
    const now = new Date().toISOString();
    const raids = RESOURCES.filter((r) => r.type === "raid");

    const r = await batchCheck(
      raids.flatMap((raid) => [
        {
          id: `${raid.key}_view`,
          user,
          relation: "can_view",
          object: raid.object,
        },
        {
          id: `${raid.key}_signup`,
          user,
          relation: "can_signup",
          object: raid.object,
          context: { current_time: now },
        },
        {
          id: `${raid.key}_loot`,
          user,
          relation: "can_loot",
          object: raid.object,
        },
        {
          id: `${raid.key}_tac`,
          user,
          relation: "can_view_tactics",
          object: raid.object,
        },
        {
          id: `${raid.key}_edit`,
          user,
          relation: "can_edit",
          object: raid.object,
        },
      ]),
    );

    const views: RaidView[] = raids
      .filter((raid) => r[`${raid.key}_view`])
      .map((raid) => ({
        object: raid.object,
        name: raid.name.replace(/^Raid:\s*/, ""),
        emoji: raid.emoji,
        blurb: raid.blurb,
        canSignup: r[`${raid.key}_signup`],
        canLoot: r[`${raid.key}_loot`],
        canTactics: r[`${raid.key}_tac`],
        canEdit: r[`${raid.key}_edit`],
        signedUp: isSignedUp(raid.object, user),
        roster: getSignups(raid.object).map((u) => {
          const p = getPersona(u.replace(/^user:/, ""));
          return { emoji: p.emoji, name: p.name };
        }),
      }));

    return page({ views });
  },
});

export default define.page<typeof handler>(function Raids({ data, state }) {
  const { views } = data;
  return (
    <ForumShell forum={state.forum!} active="raids">
      <h1 class="text-xl font-bold text-amber-100">⚔️ Raids</h1>
      <p class="mt-1 text-sm text-slate-400">
        Raids you can see. Signing up is time-boxed; looting needs attendance
        {" "}
        <em>and</em> raider rank — both checked on the server.
      </p>

      <div class="mt-5 space-y-4">
        {views.map((raid) => (
          <section
            key={raid.object}
            class="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">{raid.emoji}</span>
              <h2 class="font-semibold text-slate-100">{raid.name}</h2>
              {raid.canEdit && (
                <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Leader
                </span>
              )}
            </div>
            <p class="text-[11px] text-slate-500">{raid.blurb}</p>

            <div class="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
              <span class="text-xs text-slate-500">Roster:</span>
              {raid.roster.length === 0
                ? <span class="text-xs text-slate-600">empty</span>
                : raid.roster.map((m) => (
                  <span
                    key={m.name}
                    title={m.name}
                    class="rounded bg-slate-800/60 px-1.5 py-0.5 text-xs"
                  >
                    {m.emoji} {m.name}
                  </span>
                ))}
            </div>

            {raid.canTactics && (
              <div class="mt-3 rounded-lg border border-slate-700/60 bg-slate-800/30 p-3 text-xs text-slate-300">
                <div class="font-semibold text-slate-200">📋 Tactics</div>
                <p class="mt-1">
                  Stack on the marked tank, spread for the fire phase, and save
                  cooldowns for the enrage. (Visible because you attended or
                  lead this raid.)
                </p>
              </div>
            )}

            <div class="mt-3 flex flex-wrap items-center gap-3">
              {raid.signedUp
                ? (
                  <span class="rounded-md border border-emerald-700/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                    ✓ You're on the roster
                  </span>
                )
                : raid.canSignup
                ? (
                  <ForumActionButton
                    kind="signup"
                    payload={{ raid: raid.object }}
                    label="Sign up"
                    tone="primary"
                  />
                )
                : (
                  <span class="text-xs text-slate-500">
                    🔒 Signup closed to you
                  </span>
                )}

              {raid.canLoot && (
                <ForumActionButton
                  kind="loot"
                  payload={{ raid: raid.object }}
                  label="🎲 Roll for loot"
                  tone="primary"
                  reload={false}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </ForumShell>
  );
});
