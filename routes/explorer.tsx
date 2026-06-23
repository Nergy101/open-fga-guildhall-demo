import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { abacContext, checkId, RESOURCES } from "@/data/catalog.ts";
import { buildItems } from "@/lib/access.ts";
import { PERSONAS, personaUser } from "@/data/personas.ts";
import AbacControls from "@/islands/AbacControls.tsx";
import RankLadderLab from "@/islands/RankLadderLab.tsx";
import BanToggleLab from "@/islands/BanToggleLab.tsx";
import ReachabilityLab from "@/islands/ReachabilityLab.tsx";

export const handler = define.handlers({
  async GET(_ctx) {
    const items = PERSONAS.flatMap((p) => buildItems(p.id, personaUser(p.id)));
    const results = await batchCheck(items);
    return page({ results });
  },
});

function Cell(
  { allowed, abac, user, relation, object, context, concept }: {
    allowed: boolean;
    abac?: boolean;
    user: string;
    relation: string;
    object: string;
    context?: Record<string, unknown>;
    concept?: string;
  },
) {
  const cls = allowed
    ? "bg-emerald-500/15 text-emerald-300"
    : "bg-rose-500/10 text-rose-400/80";
  return (
    <button
      type="button"
      class={`explain-chip inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-xs hover:ring-2 hover:brightness-125 ${cls} ${
        abac ? "ring-1 ring-amber-400/40" : ""
      }`}
      data-user={user}
      data-relation={relation}
      data-object={object}
      data-context={context ? JSON.stringify(context) : ""}
      data-concept={concept ?? ""}
      title="Click to see which OpenFGA rules decided this"
    >
      {allowed ? "✓" : "✕"}
    </button>
  );
}

export default define.page<typeof handler>(function Explorer({ data }) {
  const { results } = data;

  return (
    <div class="space-y-6">
      <section>
        <h1 class="text-xl font-bold text-amber-100">Access Matrix</h1>
        <p class="mt-1 text-sm text-slate-400">
          Every persona × action, each cell a live OpenFGA{" "}
          <code>Check</code>. ABAC cells (amber ring) use default context —
          drive them live in the lab below.
        </p>
      </section>

      <div class="overflow-x-auto rounded-xl border border-slate-800">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-900/80">
              <th class="sticky left-0 z-10 bg-slate-900/80 px-3 py-2 text-left font-semibold text-slate-300">
                Action
              </th>
              {PERSONAS.map((p) => (
                <th
                  key={p.id}
                  class="px-2 py-2 text-center font-medium text-slate-300"
                  title={`${p.name} — ${p.role}`}
                >
                  <div class="text-lg leading-none">{p.emoji}</div>
                  <div class="text-[10px] font-normal text-slate-500">
                    {p.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) => (
              <>
                <tr class="bg-slate-900/40">
                  <td
                    colspan={PERSONAS.length + 1}
                    class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200/80"
                  >
                    {r.emoji} {r.name}
                  </td>
                </tr>
                {r.actions.map((a) => (
                  <tr
                    key={`${r.key}-${a.key}`}
                    class="border-t border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td class="sticky left-0 z-10 bg-slate-950/95 px-3 py-1.5">
                      <div class="text-slate-200">{a.label}</div>
                      <div class="text-[11px] text-slate-500">
                        <code>{a.relation}</code>
                        {a.abac ? " ⏰" : ""}
                      </div>
                    </td>
                    {PERSONAS.map((p) => (
                      <td key={p.id} class="px-2 py-1.5 text-center">
                        <Cell
                          allowed={results[checkId(p.id, r.key, a.key)] ??
                            false}
                          abac={!!a.abac}
                          user={personaUser(p.id)}
                          relation={a.relation}
                          object={r.object}
                          context={abacContext(a.abac)}
                          concept={a.concept}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">⚙️ ABAC Lab</h2>
          <p class="text-sm text-slate-400">
            Conditions are evaluated at check time. Move the slider / change the
            window and watch results flip per persona.
          </p>
        </div>
        <AbacControls />
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">🪜 Rank Ladder Lab</h2>
          <p class="text-sm text-slate-400">
            Concentric relations: promote a newcomer up the rank ladder and
            watch permissions unlock in tiers, each rank inheriting the one
            above it.
          </p>
        </div>
        <RankLadderLab />
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">☠️ Ban Toggle Lab</h2>
          <p class="text-sm text-slate-400">
            The <code>but not banned</code>{" "}
            exclusion: blocklist a member and every member-derived perk goes
            dark at once — while the public board stays readable.
          </p>
        </div>
        <BanToggleLab />
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">🧭 Reachability Lab</h2>
          <p class="text-sm text-slate-400">
            The reverse query: <code>ListObjects</code>{" "}
            asks which objects each persona can reach for a relation — the
            mirror image of the matrix above.
          </p>
        </div>
        <ReachabilityLab />
      </section>
    </div>
  );
});
