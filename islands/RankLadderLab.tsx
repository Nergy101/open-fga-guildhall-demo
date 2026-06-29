import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { type Results, runChecks } from "@/lib/labClient.ts";
import { Badge } from "@/components/Badge.tsx";

/**
 * Rank Ladder Lab — demonstrates CONCENTRIC relations. We grant a hypothetical
 * newcomer a single rank on the guild via a *contextual tuple* (no store
 * mutation), then re-Check a spread of actions. Promote up the ladder and watch
 * permissions unlock in tiers: each rank inherits everything the rank above it
 * can do (guildmaster > officer > raider > recruit).
 */

const SUBJECT = "user:newcomer";
const GUILD = "guild:ironforge";

type Rank = "none" | "recruit" | "raider" | "officer" | "guildmaster";
const RANKS: Rank[] = ["none", "recruit", "raider", "officer", "guildmaster"];

interface LadderAction {
  id: string;
  label: string;
  object: string;
  relation: string;
  unlock: Rank;
  concept: string;
  context?: Record<string, unknown>;
}

// Ordered by the rank at which each action first turns on.
const LADDER: LadderAction[] = [
  {
    id: "read",
    label: "Read guild",
    object: GUILD,
    relation: "can_read",
    unlock: "recruit",
    concept: "member (recruit, not banned)",
  },
  {
    id: "general",
    label: "Read #general",
    object: "channel:general",
    relation: "can_read",
    unlock: "recruit",
    concept: "group: guild#member",
  },
  {
    id: "deposit",
    label: "Deposit to vault",
    object: "vault:ironforge_bank",
    relation: "can_deposit",
    unlock: "recruit",
    concept: "member, up to gold cap (ABAC)",
    context: { requested_amount: 50 },
  },
  {
    id: "withdraw_cap",
    label: "Withdraw 100g from vault",
    object: "vault:ironforge_bank",
    relation: "can_withdraw",
    unlock: "recruit",
    concept: "member: ≤100g cap (ABAC)",
    context: { requested_amount: 100 },
  },
  {
    id: "invite",
    label: "Invite members",
    object: GUILD,
    relation: "can_invite",
    unlock: "officer",
    concept: "officer+",
  },
  {
    id: "motd",
    label: "Edit MOTD",
    object: GUILD,
    relation: "can_edit_motd",
    unlock: "officer",
    concept: "officer+",
  },
  {
    id: "council",
    label: "Read war council",
    object: "channel:war_council",
    relation: "can_read",
    unlock: "officer",
    concept: "group: guild#officer",
  },
  {
    id: "withdraw_over",
    label: "Withdraw 250g from vault",
    object: "vault:ironforge_bank",
    relation: "can_withdraw",
    unlock: "officer",
    concept: "over the 100g member cap → officers bypass it",
    context: { requested_amount: 250 },
  },
  {
    id: "ranks",
    label: "Manage ranks",
    object: GUILD,
    relation: "can_manage_ranks",
    unlock: "guildmaster",
    concept: "guildmaster",
  },
  {
    id: "disband",
    label: "Disband guild",
    object: GUILD,
    relation: "can_disband",
    unlock: "guildmaster",
    concept: "guildmaster",
  },
];

const RANK_LABEL: Record<Rank, string> = {
  none: "no rank",
  recruit: "🌱 Recruit",
  raider: "⚔️ Raider",
  officer: "🛡️ Officer",
  guildmaster: "👑 Guildmaster",
};

export default function RankLadderLab() {
  const rank = useSignal<Rank>("none");
  const results = useSignal<Results>({});

  async function refresh() {
    const contextualTuples = rank.value === "none"
      ? undefined
      : [{ user: SUBJECT, relation: rank.value, object: GUILD }];
    results.value = await runChecks(LADDER.map((a) => ({
      id: a.id,
      user: SUBJECT,
      relation: a.relation,
      object: a.object,
      context: a.context,
      contextualTuples,
    })));
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p class="text-xs text-slate-400">
        Grant <code>user:newcomer</code>{" "}
        one rank on Ironforge (as a contextual tuple — nothing is written to the
        store) and watch permissions cascade. Each rank <em>inherits</em>{" "}
        the one above it.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        {RANKS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              rank.value = r;
              refresh();
            }}
            class={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              rank.value === r
                ? "border-amber-400 bg-amber-400/15 text-amber-100"
                : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
            }`}
          >
            {RANK_LABEL[r]}
          </button>
        ))}
      </div>

      <p class="mt-3 text-[11px] text-slate-500">
        newcomer is <span class="text-amber-200">{RANK_LABEL[rank.value]}</span>
        {" "}
        — {LADDER.filter((a) => results.value[a.id]).length} of {LADDER.length}
        {" "}
        actions allowed
      </p>

      <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LADDER.map((a) => (
          <div
            key={a.id}
            class="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-1.5"
          >
            <div class="min-w-0">
              <div class="truncate text-xs text-slate-200">{a.label}</div>
              <div class="truncate text-[10px] text-slate-500">
                <code>{a.relation}</code> · {a.concept}
              </div>
            </div>
            <Badge allowed={results.value[a.id] ?? false} />
          </div>
        ))}
      </div>
    </div>
  );
}
