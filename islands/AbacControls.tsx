import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { PERSONAS, personaUser } from "@/data/personas.ts";
import {
  ARTHAS_WITHDRAW_LIMIT,
  MEMBER_WITHDRAW_LIMIT,
  SIGNUP_WINDOW,
} from "@/data/seed.ts";
import { Badge } from "@/components/Badge.tsx";
import { type Results, runChecks } from "@/lib/labClient.ts";

function PersonaResults(
  { results, relation, object, context, concept }: {
    results: Results;
    relation: string;
    object: string;
    context: Record<string, unknown>;
    concept: string;
  },
) {
  return (
    <div class="mt-3 flex flex-wrap gap-2">
      {PERSONAS.map((p) => (
        <div
          key={p.id}
          class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5"
        >
          <span>{p.emoji}</span>
          <span class="text-xs text-slate-300">{p.name}</span>
          <Badge
            allowed={results[p.id] ?? false}
            abac
            user={personaUser(p.id)}
            relation={relation}
            object={object}
            context={context}
            concept={concept}
          />
        </div>
      ))}
    </div>
  );
}

export default function AbacControls(
  { panel }: { panel?: "withdraw" | "signup" },
) {
  const showWithdraw = panel !== "signup";
  const showSignup = panel !== "withdraw";
  const amount = useSignal(250);
  const withdraw = useSignal<Results>({});
  const time = useSignal<"before" | "during" | "after">("during");
  const signup = useSignal<Results>({});

  const opensAt = new Date(SIGNUP_WINDOW.opens_at);
  const closesAt = new Date(SIGNUP_WINDOW.closes_at);
  const day = 86_400_000;
  const times: Record<string, string> = {
    before: new Date(opensAt.getTime() - day).toISOString(),
    during: new Date((opensAt.getTime() + closesAt.getTime()) / 2)
      .toISOString(),
    after: new Date(closesAt.getTime() + day).toISOString(),
  };

  async function refreshWithdraw() {
    withdraw.value = await runChecks(PERSONAS.map((p) => ({
      id: p.id,
      user: personaUser(p.id),
      relation: "can_withdraw",
      object: "vault:ironforge_bank",
      context: { requested_amount: amount.value },
    })));
  }

  async function refreshSignup() {
    signup.value = await runChecks(PERSONAS.map((p) => ({
      id: p.id,
      user: personaUser(p.id),
      relation: "can_signup",
      object: "raid:molten_core",
      context: { current_time: times[time.value] },
    })));
  }

  useEffect(() => {
    if (showWithdraw) refreshWithdraw();
    if (showSignup) refreshSignup();
  }, []);

  return (
    <div class={`grid grid-cols-1 gap-4 ${!panel ? "lg:grid-cols-2" : ""}`}>
      {/* Withdrawal limit */}
      {showWithdraw && (
        <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 class="font-semibold text-amber-100">
            🏦 Withdrawal limit (ABAC)
          </h3>
          <p class="mt-1 text-xs text-slate-400">
            Condition{" "}
            <code>withdrawal_within_limit</code>: officers withdraw freely;
            Arthas up to{" "}
            <span class="text-amber-300">{ARTHAS_WITHDRAW_LIMIT}g</span>;
            members (incl. recruits) up to{" "}
            <span class="text-amber-300">{MEMBER_WITHDRAW_LIMIT}g</span>;
            banned/outsiders denied.
          </p>
          <div class="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1500}
              step={50}
              value={amount.value}
              onInput={(e) => {
                amount.value = Number((e.target as HTMLInputElement).value);
                refreshWithdraw();
              }}
              class="w-full accent-amber-400"
            />
            <span class="w-20 text-right font-mono text-amber-200">
              {amount.value}g
            </span>
          </div>
          <PersonaResults
            results={withdraw.value}
            relation="can_withdraw"
            object="vault:ironforge_bank"
            context={{ requested_amount: amount.value }}
            concept="ABAC: members ≤100g, Arthas ≤500g, officers free"
          />
        </section>
      )}

      {/* Signup window */}
      {showSignup && (
        <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold text-amber-100">
              🔥 Raid signup window (ABAC)
            </h3>
            <span class="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-inset ring-amber-400/50">
              🏰 Molten Core · Ironforge-only
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-400">
            Condition{" "}
            <code>within_signup_window</code>: members (recruits included) may
            sign up only between{" "}
            <span class="text-amber-300">
              {SIGNUP_WINDOW.opens_at.slice(0, 10)}
            </span>{" "}
            and{" "}
            <span class="text-amber-300">
              {SIGNUP_WINDOW.closes_at.slice(0, 10)}
            </span>.
          </p>
          <div class="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs leading-relaxed text-amber-100/90">
            <strong class="text-amber-200">🏰 Ironforge-only raid.</strong>{" "}
            <code>raid:molten_core</code> belongs to{" "}
            <code>guild:ironforge</code> and is <em>not</em>{" "}
            shared with the alliance — so allied heroes (Medivh, Gamon) and the
            guest are denied{" "}
            <em>even inside the window</em>. (The alliance-shared Onyxia's Lair
            lets either guild sign up.)
          </div>
          <div class="mt-3 flex gap-2">
            {(["before", "during", "after"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  time.value = t;
                  refreshSignup();
                }}
                class={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors ${
                  time.value === t
                    ? "border-amber-400 bg-amber-400/15 text-amber-100"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
                }`}
              >
                {t} window
              </button>
            ))}
          </div>
          <p class="mt-2 font-mono text-[11px] text-slate-500">
            current_time = {times[time.value]}
          </p>
          <PersonaResults
            results={signup.value}
            relation="can_signup"
            object="raid:molten_core"
            context={{ current_time: times[time.value] }}
            concept="ABAC: members, while window open"
          />
        </section>
      )}
    </div>
  );
}
