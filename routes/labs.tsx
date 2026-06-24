import { define } from "@/utils.ts";
import AbacControls from "@/islands/AbacControls.tsx";
import CooldownLab from "@/islands/CooldownLab.tsx";
import CooldownTimers from "@/islands/CooldownTimers.tsx";
import RankLadderLab from "@/islands/RankLadderLab.tsx";
import BanToggleLab from "@/islands/BanToggleLab.tsx";
import ReachabilityLab from "@/islands/ReachabilityLab.tsx";

export default define.page(function Labs() {
  return (
    <div class="space-y-8">
      <section>
        <h1 class="text-xl font-bold text-amber-100">🧪 Labs</h1>
        <p class="mt-1 text-sm text-slate-400">
          Interactive sandboxes that re-run live OpenFGA checks as you tweak
          inputs — watch access flip per persona. Click any badge to see why.
        </p>
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">⚙️ ABAC Lab</h2>
          <p class="text-sm text-slate-400">
            Attribute-based conditions are evaluated at check time. Move the
            withdrawal slider / change the signup window and watch results flip
            per persona — each badge is a live <code>Check</code>{" "}
            with the context shown.
          </p>
        </div>
        <AbacControls />
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-bold text-amber-100">⏳ Cooldown Lab</h2>
          <p class="text-sm text-slate-400">
            A time-based control: the <code>cooldown_elapsed</code>{" "}
            condition limits members to one withdrawal per window. Set how long
            ago they last withdrew and watch the cooldown lift — officers bypass
            it.
          </p>
        </div>
        <CooldownLab />
        <CooldownTimers />
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
            mirror image of the Access Matrix.
          </p>
        </div>
        <ReachabilityLab />
      </section>
    </div>
  );
});
