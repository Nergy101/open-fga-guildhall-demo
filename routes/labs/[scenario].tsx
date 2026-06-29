import { page } from "fresh";
import { define } from "@/utils.ts";
import { type LabId, SCENARIOS } from "@/data/scenarios.ts";
import AbacControls from "@/islands/AbacControls.tsx";
import CooldownLab from "@/islands/CooldownLab.tsx";
import CooldownTimers from "@/islands/CooldownTimers.tsx";
import RankLadderLab from "@/islands/RankLadderLab.tsx";
import BanToggleLab from "@/islands/BanToggleLab.tsx";
import ReachabilityLab from "@/islands/ReachabilityLab.tsx";
import CouncilLab from "@/islands/CouncilLab.tsx";
import Mermaid from "@/islands/Mermaid.tsx";
import { withdrawAccessChart } from "@/data/legenda.ts";

export const handler = define.handlers({
  GET(ctx) {
    const i = SCENARIOS.findIndex((s) => s.id === ctx.params.scenario);
    if (i === -1) {
      return new Response(null, {
        status: 307,
        headers: { location: "/labs" },
      });
    }
    return page({
      scenario: SCENARIOS[i],
      prev: i > 0 ? SCENARIOS[i - 1] : null,
      next: i < SCENARIOS.length - 1 ? SCENARIOS[i + 1] : null,
    });
  },
});

/** Renders the one lab island a scenario is built around. */
function Lab({ id }: { id: LabId }) {
  switch (id) {
    case "rank-ladder":
      return <RankLadderLab />;
    case "ban-toggle":
      return <BanToggleLab />;
    case "abac-withdraw":
      return <AbacControls panel="withdraw" />;
    case "abac-signup":
      return <AbacControls panel="signup" />;
    case "cooldown":
      return (
        <div class="space-y-3">
          <CooldownLab />
          <CooldownTimers />
        </div>
      );
    case "reachability":
      return <ReachabilityLab />;
    case "council":
      return <CouncilLab />;
  }
}

export default define.page<typeof handler>(function ScenarioPage({ data }) {
  const { scenario, prev, next } = data;
  return (
    <div class="space-y-6">
      <a href="/labs" class="text-xs text-slate-400 hover:text-amber-300">
        ← All scenarios
      </a>

      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div class="flex items-center gap-3">
          <span class="text-4xl">{scenario.emoji}</span>
          <div>
            <h1 class="text-xl font-bold text-amber-100">{scenario.title}</h1>
            <span class="text-[11px] uppercase tracking-wide text-slate-500">
              {scenario.cast}
            </span>
          </div>
          <span class="ml-auto shrink-0 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-400/30">
            {scenario.concept}
          </span>
        </div>
        <p class="mt-3 text-sm leading-relaxed text-slate-300">
          {scenario.story}
        </p>
      </section>

      {scenario.lab === "abac-withdraw" && (
        <section class="space-y-2">
          <h2 class="text-sm font-semibold text-amber-200/90">
            🏦 The bank at a glance — who can withdraw
          </h2>
          <p class="text-xs text-slate-400">
            Ironforge owns the vault, and its tabs inherit the rules. Officers
            withdraw freely; Arthas and any member are capped; the banned and
            outsiders are shut out entirely.
          </p>
          <Mermaid id="vault-withdraw" chart={withdrawAccessChart()} fill />
        </section>
      )}

      <Lab id={scenario.lab} />

      <nav class="flex items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm">
        {prev
          ? (
            <a
              href={`/labs/${prev.id}`}
              class="text-slate-400 hover:text-amber-300"
            >
              ← {prev.emoji} {prev.title}
            </a>
          )
          : <span />}
        {next && (
          <a
            href={`/labs/${next.id}`}
            class="ml-auto inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-medium text-amber-200 transition-colors hover:bg-amber-400/20"
          >
            <span class="text-amber-300/60">Next</span>
            {next.emoji} {next.title} →
          </a>
        )}
      </nav>
    </div>
  );
});
