import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { RESOURCES } from "@/data/catalog.ts";
import { getBalance } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import BankForm from "@/islands/BankForm.tsx";

interface TabView {
  object: string;
  name: string;
  emoji: string;
  balance: number;
  canWithdraw: boolean;
  canDeposit: boolean;
}
interface VaultView {
  object: string;
  name: string;
  emoji: string;
  blurb: string;
  balance: number;
  canDeposit: boolean;
  canWithdraw: boolean;
  tabs: TabView[];
}

export const handler = define.handlers({
  async GET(ctx) {
    const forum = ctx.state.forum;
    if (!forum) {
      return new Response(null, { status: 303, headers: { location: "/try" } });
    }
    const user = forum.user;
    const vaults = RESOURCES.filter((r) => r.type === "vault");
    const tabs = RESOURCES.filter((r) => r.type === "vault_tab");

    // Deposit/withdraw are ABAC-gated, so the condition needs an amount to
    // resolve. Probe with a nominal 1g to reveal whether a grant exists at all;
    // the real per-grant cap is enforced when the user submits a real amount.
    const probe = { requested_amount: 1 };
    const r = await batchCheck([
      ...vaults.flatMap((v) => [
        { id: `${v.key}_view`, user, relation: "can_view", object: v.object },
        {
          id: `${v.key}_dep`,
          user,
          relation: "can_deposit",
          object: v.object,
          context: probe,
        },
        {
          id: `${v.key}_wd`,
          user,
          relation: "can_withdraw",
          object: v.object,
          context: probe,
        },
      ]),
      ...tabs.flatMap((t) => [
        { id: `${t.key}_view`, user, relation: "can_view", object: t.object },
        {
          id: `${t.key}_dep`,
          user,
          relation: "can_deposit",
          object: t.object,
          context: probe,
        },
        {
          id: `${t.key}_wd`,
          user,
          relation: "can_withdraw",
          object: t.object,
          context: probe,
        },
      ]),
    ]);

    const views: VaultView[] = vaults
      .filter((v) => r[`${v.key}_view`])
      .map((v) => ({
        object: v.object,
        name: v.name.replace(/^Vault:\s*/, ""),
        emoji: v.emoji,
        blurb: v.blurb,
        balance: getBalance(v.object),
        canDeposit: r[`${v.key}_dep`],
        canWithdraw: r[`${v.key}_wd`],
        tabs: tabs
          .filter((t) => t.parent === v.object && r[`${t.key}_view`])
          .map((t) => ({
            object: t.object,
            name: t.name.replace(/^Vault tab:\s*/, ""),
            emoji: t.emoji,
            balance: getBalance(t.object),
            canWithdraw: r[`${t.key}_wd`],
            canDeposit: r[`${t.key}_dep`],
          })),
      }));

    return page({ views });
  },
});

export default define.page<typeof handler>(function Bank({ data, state }) {
  const { views } = data;
  return (
    <ForumShell forum={state.forum!} active="bank">
      <h1 class="text-xl font-bold text-amber-100">🏦 Guild Bank</h1>
      <p class="mt-1 text-sm text-slate-400">
        Vaults you can see. Withdrawals send the amount to OpenFGA as ABAC
        context — your per-grant gold cap is enforced on the server.
      </p>

      <div class="mt-5 space-y-4">
        {views.map((v) => (
          <div
            key={v.object}
            class="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4"
          >
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xl">{v.emoji}</span>
                  <h2 class="font-semibold text-slate-100">{v.name}</h2>
                  <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Vault
                  </span>
                </div>
                <p class="mb-2 mt-1 text-[11px] text-slate-500">{v.blurb}</p>
                <BankForm
                  object={v.object}
                  initialBalance={v.balance}
                  canWithdraw={v.canWithdraw}
                  canDeposit={v.canDeposit}
                />
              </div>

              <div class="rounded-lg border border-l-2 border-slate-700/70 border-l-violet-500/50 bg-violet-500/5 p-3">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
                  ↳ {v.tabs.length} tab{v.tabs.length === 1 ? "" : "s"}{" "}
                  you can open
                </div>
                <div class="mt-2 space-y-2">
                  {v.tabs.length === 0
                    ? <p class="text-[11px] text-slate-500">None.</p>
                    : v.tabs.map((t) => (
                      <div
                        key={t.object}
                        class="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3"
                      >
                        <div class="flex items-center gap-2">
                          <span>{t.emoji}</span>
                          <h3 class="text-sm font-semibold text-slate-200">
                            {t.name}
                          </h3>
                          <span class="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                            Tab
                          </span>
                        </div>
                        <div class="mt-2">
                          <BankForm
                            object={t.object}
                            initialBalance={t.balance}
                            canWithdraw={t.canWithdraw}
                            canDeposit={t.canDeposit}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ForumShell>
  );
});
