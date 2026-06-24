import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { getPersona, personaUser } from "@/data/personas.ts";
import { WITHDRAW_COOLDOWN_SECONDS } from "@/data/seed.ts";
import { type Results, runChecks } from "@/lib/labClient.ts";
import { Badge } from "@/components/Badge.tsx";

/**
 * Cooldown Lab — a TIME-BASED control. OpenFGA can't remember when you last
 * withdrew, but its `cooldown_elapsed` condition can compare timestamps the app
 * supplies. Slide "time since last withdrawal" and watch members come off
 * cooldown once enough time has passed; officers bypass the limit entirely.
 */

const VAULT = "vault:ironforge_bank";
// Officers (bypass) + members (throttled) — the only personas who withdraw here.
const SUBJECTS = ["thrall", "jaina", "arthas", "rexxar"];

const CD = WITHDRAW_COOLDOWN_SECONDS;
const STEPS = [0, Math.floor(CD / 2), CD + 5, CD * 6];

export default function CooldownLab() {
  const elapsed = useSignal(0);
  const results = useSignal<Results>({});

  function context(): Record<string, unknown> {
    const now = Date.now();
    return {
      current_time: new Date(now).toISOString(),
      last_withdrawal: new Date(now - elapsed.value * 1000).toISOString(),
    };
  }

  async function refresh() {
    const ctx = context();
    results.value = await runChecks(SUBJECTS.map((id) => ({
      id,
      user: personaUser(id),
      relation: "can_withdraw_now",
      object: VAULT,
      context: ctx,
    })));
  }

  useEffect(() => {
    refresh();
  }, []);

  const remaining = Math.max(0, CD - elapsed.value);

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p class="text-xs text-slate-400">
        Members may withdraw once per <span class="text-amber-300">{CD}s</span>
        {" "}
        (a short demo window — you'd set 12h in production). OpenFGA's{" "}
        <code>cooldown_elapsed</code> condition compares{" "}
        <code>current_time</code> with the member's <code>last_withdrawal</code>
        {" "}
        (both supplied by the app). Officers bypass it. Pick how long ago they
        last withdrew and watch the cooldown lift.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              elapsed.value = s;
              refresh();
            }}
            class={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              elapsed.value === s
                ? "border-amber-400 bg-amber-400/15 text-amber-100"
                : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
            }`}
          >
            {s === 0 ? "just now" : `${s}s ago`}
          </button>
        ))}
      </div>

      <p class="mt-3 font-mono text-[11px] text-slate-500">
        last_withdrawal ={" "}
        {elapsed.value === 0 ? "now" : `now − ${elapsed.value}s`}
        {" · "}
        {remaining === 0
          ? "cooldown elapsed ✓"
          : `${remaining}s left on the ${CD}s cooldown`}
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        {SUBJECTS.map((id) => {
          const p = getPersona(id);
          return (
            <div
              key={id}
              class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5"
            >
              <span>{p.emoji}</span>
              <span class="text-xs text-slate-300">{p.name}</span>
              <Badge allowed={results.value[id] ?? false} />
            </div>
          );
        })}
      </div>
      <p class="mt-2 text-[11px] text-slate-500">
        ✓ = may withdraw now. 👑🛡️ officers always pass; ⚔️🌱 members wait out
        the cooldown.
      </p>
    </div>
  );
}
