import { page } from "fresh";
import type { ComponentChildren } from "preact";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { ITEMS } from "@/data/catalog.ts";
import { ForumShell } from "@/components/ForumShell.tsx";

interface ItemView {
  object: string;
  name: string;
  emoji: string;
  rarity: string;
  owner: string;
  blurb: string;
  detail?: string;
  canUse: boolean;
  canTrade: boolean;
  canInspect: boolean;
}

/** Rarity → accent classes for the item tile + label. */
const RARITY: Record<string, string> = {
  Legendary: "text-orange-300 ring-orange-400/50 bg-orange-400/10",
  Epic: "text-fuchsia-300 ring-fuchsia-400/50 bg-fuchsia-400/10",
  Rare: "text-sky-300 ring-sky-400/50 bg-sky-400/10",
  Uncommon: "text-emerald-300 ring-emerald-400/50 bg-emerald-400/10",
  Common: "text-slate-300 ring-slate-500/50 bg-slate-500/10",
};

export const handler = define.handlers({
  async GET(ctx) {
    const forum = ctx.state.forum;
    if (!forum) {
      return new Response(null, { status: 303, headers: { location: "/try" } });
    }
    const user = forum.user;

    const r = await batchCheck(
      ITEMS.flatMap((it) => {
        const k = it.object.replace(/^item:/, "");
        return [
          { id: `${k}_use`, user, relation: "can_use", object: it.object },
          { id: `${k}_trade`, user, relation: "can_trade", object: it.object },
          {
            id: `${k}_inspect`,
            user,
            relation: "can_inspect",
            object: it.object,
          },
        ];
      }),
    );

    const views: ItemView[] = ITEMS.map((it) => {
      const k = it.object.replace(/^item:/, "");
      return {
        object: it.object,
        name: it.name,
        emoji: it.emoji,
        rarity: it.rarity,
        owner: it.owner,
        blurb: it.blurb,
        detail: it.detail,
        canUse: r[`${k}_use`],
        canTrade: r[`${k}_trade`],
        canInspect: r[`${k}_inspect`],
      };
    });

    return page({ views });
  },
});

function Pill(
  { tone, children }: {
    tone: "good" | "warn" | "muted" | "info";
    children: ComponentChildren;
  },
) {
  const TONE: Record<string, string> = {
    good: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    info: "bg-sky-500/15 text-sky-300",
    muted: "bg-slate-700/60 text-slate-400",
  };
  return (
    <span
      class={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        TONE[tone]
      }`}
    >
      {children}
    </span>
  );
}

function ItemCard({ it, mine }: { it: ItemView; mine: boolean }) {
  const accent = RARITY[it.rarity] ?? RARITY.Common;
  return (
    <div class="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div class="flex items-start gap-3">
        <span
          class={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ring-1 ${accent}`}
        >
          {it.emoji}
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-semibold text-slate-100" title={it.name}>
            {it.name}
          </h3>
          <div class="mt-0.5 flex items-center gap-2 text-[11px]">
            <span class={`font-semibold ${accent.split(" ")[0]}`}>
              {it.rarity}
            </span>
            {!mine && <span class="text-slate-500">· held by {it.owner}</span>}
          </div>
        </div>
      </div>

      <p class="mt-2 flex-1 text-xs leading-relaxed text-slate-400">
        {it.blurb}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-1.5">
        {mine
          ? (
            <>
              <Pill tone="good">✓ Yours</Pill>
              {it.canTrade
                ? <Pill tone="info">Tradeable</Pill>
                : <Pill tone="warn">🔒 Soulbound</Pill>}
              {it.detail && <Pill tone="muted">{it.detail}</Pill>}
            </>
          )
          : (
            <>
              <Pill tone="muted">👁 Inspect only</Pill>
              {!it.canTrade && <Pill tone="warn">🔒 Soulbound</Pill>}
            </>
          )}
      </div>
    </div>
  );
}

export default define.page<typeof handler>(function Inventory({ data, state }) {
  const { views } = data;
  const me = state.forum!.persona;
  const backpack = views.filter((v) => v.canUse);
  const armory = views.filter((v) => !v.canUse && v.canInspect);

  return (
    <ForumShell forum={state.forum!} active="inventory">
      <h1 class="text-xl font-bold text-amber-100">🎒 Inventory</h1>
      <p class="mt-1 text-sm text-slate-400">
        What you may <em>use</em>, <em>trade</em>, and <em>inspect</em>{" "}
        is decided live by OpenFGA — so each persona's bags look different.
        You're viewing as{" "}
        <span class="font-semibold text-amber-200">
          {me.emoji} {me.name}
        </span>.
      </p>

      <section class="mt-6">
        <div class="flex items-baseline gap-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Your backpack
          </h2>
          <span class="text-xs text-slate-600">
            {backpack.length} item{backpack.length === 1 ? "" : "s"} you can use
          </span>
        </div>

        {backpack.length === 0
          ? (
            <div class="mt-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-8 text-center text-sm text-slate-500">
              Your bags are empty — you own no items here. Ownership comes from
              {" "}
              <code class="text-slate-400">owner</code>{" "}
              tuples, and you hold none.
            </div>
          )
          : (
            <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {backpack.map((it) => <ItemCard key={it.object} it={it} mine />)}
            </div>
          )}
      </section>

      {armory.length > 0 && (
        <section class="mt-8">
          <div class="flex items-baseline gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Realm armory
            </h2>
            <span class="text-xs text-slate-600">
              public items you may inspect but don't own
            </span>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {armory.map((it) => (
              <ItemCard key={it.object} it={it} mine={false} />
            ))}
          </div>
        </section>
      )}

      <p class="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <span class="font-semibold text-slate-400">Why OpenFGA here?</span>{" "}
        Inventory <em>authorization</em>{" "}
        is a natural fit — ownership, soulbinding (can't trade), guild heirlooms
        (the <code class="text-slate-400">guild#member</code>{" "}
        userset, blocklist included), and public inspection are all
        relationships. What does <em>not</em>{" "}
        belong in OpenFGA: item quantities, stats, and the canonical item list —
        those are high-churn game-database state, not access tuples.
      </p>
    </ForumShell>
  );
});
