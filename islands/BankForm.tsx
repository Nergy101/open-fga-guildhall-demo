import { useSignal } from "@preact/signals";

/**
 * Balance + deposit/withdraw controls for one vault or tab. Withdrawals send the
 * amount as ABAC context; the server's Check enforces per-grant gold caps.
 */
export default function BankForm(
  { object, initialBalance, canWithdraw, canDeposit }: {
    object: string;
    initialBalance: number;
    canWithdraw: boolean;
    canDeposit: boolean;
  },
) {
  const balance = useSignal(initialBalance);
  const amount = useSignal(250);
  const busy = useSignal(false);
  const msg = useSignal<{ ok: boolean; text: string } | null>(null);

  async function act(kind: "withdraw" | "deposit") {
    if (busy.value || !(amount.value > 0)) return;
    busy.value = true;
    msg.value = null;
    const res = await fetch("/api/forum/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, vault: object, amount: amount.value }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    busy.value = false;
    if (typeof json.balance === "number") balance.value = json.balance;
    msg.value = { ok: !!json.ok, text: json.message ?? "Failed." };
  }

  return (
    <div>
      <div class="font-mono text-lg text-amber-200">
        {balance.value.toLocaleString()}g
      </div>

      {canWithdraw || canDeposit
        ? (
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step={50}
              value={amount.value}
              disabled={busy.value}
              onInput={(
                e,
              ) => (amount.value = Number(
                (e.target as HTMLInputElement).value,
              ))}
              class="w-24 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:border-amber-400/60 focus:outline-none"
            />
            <span class="text-xs text-slate-500">gold</span>
            {canWithdraw && (
              <button
                type="button"
                onClick={() => act("withdraw")}
                disabled={busy.value}
                class="rounded-md border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 disabled:opacity-50"
              >
                Withdraw
              </button>
            )}
            {canDeposit && (
              <button
                type="button"
                onClick={() => act("deposit")}
                disabled={busy.value}
                class="rounded-md border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700/60 disabled:opacity-50"
              >
                Deposit
              </button>
            )}
          </div>
        )
        : <p class="mt-1 text-xs text-slate-500">View only.</p>}

      {msg.value && (
        <p
          class={`mt-2 text-xs ${
            msg.value.ok ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {msg.value.text}
        </p>
      )}
    </div>
  );
}
