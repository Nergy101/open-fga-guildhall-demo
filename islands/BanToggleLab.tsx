import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { type Results, runChecks } from "@/lib/labClient.ts";
import { getPersona, personaUser } from "@/data/personas.ts";
import { Badge } from "@/components/Badge.tsx";

/**
 * Ban Toggle Lab — demonstrates the BLOCKLIST exclusion (`member: recruit but
 * not banned`). Flip a member onto the blocklist via a contextual tuple and
 * watch every *member-derived* perk go dark at once — while the public tavern
 * board (granted to `user:*`) stays readable. Rank-derived powers and direct
 * grants are unaffected; only access that flows through `member` is revoked.
 */

const GUILD = "guild:ironforge";

// Personas seeded as un-banned Ironforge members. (Gul'dan is already banned in
// the store; contextual tuples can only add, so toggling him off wouldn't work.)
const SUBJECTS = ["thrall", "jaina", "arthas", "rexxar"] as const;

interface Perk {
  id: string;
  label: string;
  object: string;
  relation: string;
  concept: string;
}

// All member-derived — every one of these flips off when the subject is banned.
const PERKS: Perk[] = [
  {
    id: "read",
    label: "Read guild",
    object: GUILD,
    relation: "can_read",
    concept: "member",
  },
  {
    id: "vault",
    label: "View vault",
    object: "vault:ironforge_bank",
    relation: "can_view",
    concept: "member from guild",
  },
  {
    id: "general",
    label: "Read #general",
    object: "channel:general",
    relation: "can_read",
    concept: "group: guild#member",
  },
  {
    id: "post",
    label: "Post in #general",
    object: "channel:general",
    relation: "can_post",
    concept: "group: guild#member",
  },
];

// Public access via user:* — survives the ban (it never flows through member).
const PUBLIC: Perk = {
  id: "tavern",
  label: "Read tavern board",
  object: "channel:tavern_board",
  relation: "can_read",
  concept: "public (user:*)",
};

const ALL = [...PERKS, PUBLIC];

export default function BanToggleLab() {
  const subject = useSignal<string>("arthas");
  const banned = useSignal(false);
  const results = useSignal<Results>({});

  async function refresh() {
    const user = personaUser(subject.value);
    const contextualTuples = banned.value
      ? [{ user, relation: "banned", object: GUILD }]
      : undefined;
    results.value = await runChecks(ALL.map((p) => ({
      id: p.id,
      user,
      relation: p.relation,
      object: p.object,
      contextualTuples,
    })));
  }

  useEffect(() => {
    refresh();
  }, []);

  const persona = getPersona(subject.value);

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p class="text-xs text-slate-400">
        Add a member to the blocklist (a contextual tuple — nothing is written
        to the store). Member-derived access vanishes; the public board does
        not. Rank powers and direct grants would survive.
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        {SUBJECTS.map((id) => {
          const p = getPersona(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                subject.value = id;
                refresh();
              }}
              class={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                subject.value === id
                  ? "border-amber-400 bg-amber-400/15 text-amber-100"
                  : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              {p.emoji} {p.name}
            </button>
          );
        })}

        <div class="ml-auto flex items-center gap-2">
          <span
            class={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              banned.value
                ? "border-rose-500 bg-rose-500/20 text-rose-200"
                : "border-emerald-600 bg-emerald-500/15 text-emerald-200"
            }`}
          >
            {banned.value ? "☠️ Banned" : "✓ In good standing"}
          </span>
          <button
            type="button"
            disabled={banned.value}
            onClick={() => {
              banned.value = true;
              refresh();
            }}
            class="rounded-md border border-rose-500/60 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 disabled:opacity-40"
          >
            🚫 Ban
          </button>
          <button
            type="button"
            disabled={!banned.value}
            onClick={() => {
              banned.value = false;
              refresh();
            }}
            class="rounded-md border border-emerald-600/60 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
          >
            ❎ Unban
          </button>
        </div>
      </div>

      <p class="mt-3 text-[11px] text-slate-500">
        <span class="text-amber-200">{persona.emoji} {persona.name}</span>{" "}
        ({persona.role}) ·{" "}
        {banned.value ? "on the blocklist" : "member in good standing"}
      </p>

      <div class="mt-2 space-y-2">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Member perks
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div
              key={p.id}
              class="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-1.5"
            >
              <div class="min-w-0">
                <div class="truncate text-xs text-slate-200">{p.label}</div>
                <div class="truncate text-[10px] text-slate-500">
                  <code>{p.relation}</code> · {p.concept}
                </div>
              </div>
              <Badge allowed={results.value[p.id] ?? false} />
            </div>
          ))}
        </div>

        <div class="pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Public — survives the ban
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-emerald-900/10 px-3 py-1.5">
          <div class="min-w-0">
            <div class="truncate text-xs text-slate-200">{PUBLIC.label}</div>
            <div class="truncate text-[10px] text-slate-500">
              <code>{PUBLIC.relation}</code> · {PUBLIC.concept}
            </div>
          </div>
          <Badge allowed={results.value[PUBLIC.id] ?? false} />
        </div>
      </div>
    </div>
  );
}
