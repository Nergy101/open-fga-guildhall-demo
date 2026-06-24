import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { getPersona, personaUser } from "@/data/personas.ts";
import { WITHDRAW_COOLDOWN_SECONDS } from "@/data/seed.ts";
import { runChecks } from "@/lib/labClient.ts";

/**
 * Cooldown Lab — live part. Each row really runs OpenFGA's `can_withdraw_now`
 * check (the `cooldown_elapsed` condition) on click. A throttled member starts
 * an animated countdown and can't withdraw again until it elapses; an officer
 * bypasses the cooldown and can withdraw freely.
 */

const VAULT = "vault:ironforge_bank";
const ROWS = ["jaina", "arthas"]; // officer (bypass) vs member (throttled)
const CD = WITHDRAW_COOLDOWN_SECONDS;

interface RowState {
  lastWithdrawal: number; // ms since epoch; 0 = never
  remaining: number; // seconds left on cooldown; 0 = ready
  busy: boolean;
  note: string;
  noteOk: boolean;
}

const fresh = (): RowState => ({
  lastWithdrawal: 0,
  remaining: 0,
  busy: false,
  note: "",
  noteOk: true,
});

export default function CooldownTimers() {
  const rows = useSignal<Record<string, RowState>>(
    Object.fromEntries(ROWS.map((id) => [id, fresh()])),
  );

  // Smoothly tick the remaining cooldown down to zero.
  useEffect(() => {
    const t = setInterval(() => {
      let changed = false;
      const next = { ...rows.value };
      for (const id of ROWS) {
        const r = next[id];
        if (r.remaining > 0) {
          const rem = Math.max(0, CD - (Date.now() - r.lastWithdrawal) / 1000);
          next[id] = { ...r, remaining: rem };
          changed = true;
        }
      }
      if (changed) rows.value = next;
    }, 100);
    return () => clearInterval(t);
  }, []);

  async function withdraw(id: string) {
    const r = rows.value[id];
    if (r.busy || r.remaining > 0) return;
    rows.value = { ...rows.value, [id]: { ...r, busy: true, note: "" } };

    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    const allowed = (await runChecks([{
      id: "w",
      user: personaUser(id),
      relation: "can_withdraw_now",
      object: VAULT,
      context: {
        current_time: iso(now),
        last_withdrawal: r.lastWithdrawal ? iso(r.lastWithdrawal) : iso(0),
      },
    }]))["w"] === true;

    if (!allowed) {
      rows.value = {
        ...rows.value,
        [id]: {
          ...r,
          busy: false,
          note: "🔒 Still on cooldown.",
          noteOk: false,
        },
      };
      return;
    }

    // Allowed. Does a cooldown now apply? Probe with last_withdrawal = now:
    // a member is blocked (cooldown), an officer is still allowed (bypass).
    const cooldownApplies = (await runChecks([{
      id: "p",
      user: personaUser(id),
      relation: "can_withdraw_now",
      object: VAULT,
      context: { current_time: iso(now), last_withdrawal: iso(now) },
    }]))["p"] !== true;

    rows.value = {
      ...rows.value,
      [id]: {
        lastWithdrawal: cooldownApplies ? now : 0,
        remaining: cooldownApplies ? CD : 0,
        busy: false,
        note: cooldownApplies
          ? "✓ Withdrew — cooldown started."
          : "✓ Withdrew — officers have no cooldown.",
        noteOk: true,
      },
    };
  }

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 class="font-semibold text-amber-100">⏱️ Try it live</h3>
      <p class="mt-1 text-xs text-slate-400">
        Click <strong>Withdraw</strong>. A member starts a{" "}
        <span class="text-amber-300">{CD}s</span>{" "}
        cooldown and is blocked until it runs out; an officer has none. The gate
        is OpenFGA's <code>can_withdraw_now</code> check on every click.
      </p>

      <div class="mt-3 space-y-2.5">
        {ROWS.map((id) => {
          const r = rows.value[id];
          const p = getPersona(id);
          const onCooldown = r.remaining > 0;
          const pct = onCooldown ? (r.remaining / CD) * 100 : 0;
          return (
            <div
              key={id}
              class="rounded-lg border border-slate-700 bg-slate-800/40 p-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">{p.emoji}</span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-slate-200">
                    {p.name}{" "}
                    <span class="text-[11px] font-normal text-slate-500">
                      · {p.role}
                    </span>
                  </div>
                  {r.note && (
                    <div
                      class={`text-[11px] ${
                        r.noteOk ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {r.note}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={r.busy || onCooldown}
                  onClick={() => withdraw(id)}
                  class={`w-28 shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                    onCooldown
                      ? "border-slate-700 bg-slate-800 text-slate-500"
                      : "border-amber-400/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25 disabled:opacity-50"
                  }`}
                >
                  {r.busy
                    ? "…"
                    : onCooldown
                    ? `⏳ ${r.remaining.toFixed(1)}s`
                    : "💸 Withdraw"}
                </button>
              </div>

              <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
                <div
                  class="h-full rounded-full bg-amber-400 transition-[width] duration-100 ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
