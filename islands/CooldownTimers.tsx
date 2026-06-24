import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { getPersona } from "@/data/personas.ts";
import { WITHDRAW_COOLDOWN_SECONDS } from "@/data/seed.ts";

/**
 * Cooldown Lab — live part. Each row really withdraws through /api/lab/cooldown,
 * which gates on OpenFGA's `can_withdraw_now` and records the time server-side
 * (shared with the forum). So a member's cooldown is enforced for real — it
 * survives a page reload and can't be bypassed by refreshing.
 */

const ROWS = ["jaina", "arthas"]; // officer (bypass) vs member (throttled)
const CD = WITHDRAW_COOLDOWN_SECONDS;

interface RowState {
  endsAt: number; // ms when the cooldown ends; 0 = ready
  busy: boolean;
  note: string;
  noteOk: boolean;
}

const fresh = (): RowState => ({
  endsAt: 0,
  busy: false,
  note: "",
  noteOk: true,
});

export default function CooldownTimers() {
  const rows = useSignal<Record<string, RowState>>(
    Object.fromEntries(ROWS.map((id) => [id, fresh()])),
  );
  const now = useSignal(Date.now());

  // Restore any in-progress cooldown from the server (survives reloads).
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/lab/cooldown").then((r) => r.json()).catch(
        () => null,
      );
      if (!res?.status) return;
      const t = Date.now();
      const next = { ...rows.value };
      for (const id of ROWS) {
        const secs = res.status[id] ?? 0;
        if (secs > 0) next[id] = { ...next[id], endsAt: t + secs * 1000 };
      }
      rows.value = next;
    })();
    const tick = setInterval(() => (now.value = Date.now()), 100);
    return () => clearInterval(tick);
  }, []);

  async function withdraw(id: string) {
    const r = rows.value[id];
    if (r.busy) return;
    rows.value = { ...rows.value, [id]: { ...r, busy: true, note: "" } };

    const res = await fetch("/api/lab/cooldown", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona: id }),
    }).then((x) => x.json()).catch(() => ({ ok: false, message: "Failed." }));

    const remaining = Number(res.remaining ?? 0);
    const note = res.ok
      ? (res.message ?? "✓ Withdrew.")
      : remaining > 0
      ? `🔒 Denied — ${Math.ceil(remaining)}s left on cooldown.`
      : (res.message ?? "🔒 Denied.");
    rows.value = {
      ...rows.value,
      [id]: {
        endsAt: remaining > 0 ? Date.now() + remaining * 1000 : 0,
        busy: false,
        note,
        noteOk: !!res.ok,
      },
    };
  }

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 class="font-semibold text-amber-100">⏱️ Try it live</h3>
      <p class="mt-1 text-xs text-slate-400">
        Click <strong>Withdraw</strong>. A member starts a{" "}
        <span class="text-amber-300">{CD}s</span>{" "}
        cooldown, enforced server-side via OpenFGA's{" "}
        <code>can_withdraw_now</code>{" "}
        — it survives a refresh. Click again mid-cooldown to see it rejected. An
        officer has none.
      </p>

      <div class="mt-3 space-y-2.5">
        {ROWS.map((id) => {
          const r = rows.value[id];
          const remaining = Math.max(0, (r.endsAt - now.value) / 1000);
          const onCooldown = remaining > 0;
          const pct = onCooldown ? (remaining / CD) * 100 : 0;
          const p = getPersona(id);
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
                  {onCooldown && (
                    <div class="text-[11px] tabular-nums text-amber-300">
                      ⏳ {remaining.toFixed(1)}s until ready
                    </div>
                  )}
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
                  disabled={r.busy}
                  onClick={() => withdraw(id)}
                  class="w-28 shrink-0 rounded-md border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/25 disabled:opacity-50"
                >
                  {r.busy ? "…" : "💸 Withdraw"}
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
