import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { type Results, runChecks } from "@/lib/labClient.ts";
import { Badge } from "@/components/Badge.tsx";

/**
 * Guild Council Lab — a MAJORITY VOTE, which OpenFGA can't express natively
 * (it has no way to COUNT). Ironforge has three guildmasters; deposing one needs
 * a majority (2 of 3). The store already records Thrall's vote on the motion to
 * depose Magni; toggle Muradin's vote and watch the tally cross the threshold —
 * the app grants `passed`, and OpenFGA's `can_remove` gate flips to Allowed.
 * OpenFGA enforces the rule; the app does the counting.
 */

const MOTION = "kick_motion:depose_magni";
const GM_COUNT = 3; // Thrall, Magni, Muradin
const MAJORITY = Math.floor(GM_COUNT / 2) + 1; // 2 of 3

export default function CouncilLab() {
  // Thrall's vote is seeded in the store; Muradin's is the toggle. Magni is the
  // target, so he doesn't vote.
  const muradinVotes = useSignal(false);
  const result = useSignal<Results>({});

  async function refresh() {
    const yes = muradinVotes.value;
    const votes = 1 + (yes ? 1 : 0);
    const contextualTuples = [
      // Muradin's hypothetical vote (Thrall's is already in the store).
      ...(yes
        ? [{ user: "user:muradin", relation: "vote", object: MOTION }]
        : []),
      // The app grants `passed` once a majority agrees — OpenFGA can't count.
      ...(votes >= MAJORITY
        ? [{ user: "user:*", relation: "passed", object: MOTION }]
        : []),
    ];
    result.value = await runChecks([{
      id: "remove",
      user: "user:thrall",
      relation: "can_remove",
      object: MOTION,
      contextualTuples,
    }]);
  }

  useEffect(() => {
    refresh();
  }, []);

  const votes = 1 + (muradinVotes.value ? 1 : 0);
  const passed = votes >= MAJORITY;
  const removable = result.value.remove ?? false;

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p class="text-xs text-slate-400">
        Ironforge has{" "}
        <span class="text-amber-200">three guildmasters</span>. Deposing one
        needs a majority ({MAJORITY} of {GM_COUNT}). A motion to depose{" "}
        <span class="text-amber-200">Magni</span>{" "}
        is open — Thrall has already voted. Add Muradin's vote and watch the
        gate flip (a contextual tuple — nothing is written to the store).
      </p>

      <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div class="rounded-lg border border-emerald-700/50 bg-emerald-900/10 px-3 py-2">
          <div class="text-sm text-slate-200">👑 Thrall</div>
          <div class="text-[11px] text-emerald-300">
            ✓ voted to depose (seeded)
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            muradinVotes.value = !muradinVotes.value;
            refresh();
          }}
          class={`rounded-lg border px-3 py-2 text-left transition-colors ${
            muradinVotes.value
              ? "border-emerald-500 bg-emerald-500/15"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
          }`}
        >
          <div class="text-sm text-slate-200">👑 Muradin</div>
          <div
            class={`text-[11px] ${
              muradinVotes.value ? "text-emerald-300" : "text-slate-500"
            }`}
          >
            {muradinVotes.value ? "✓ voted to depose" : "○ click to cast vote"}
          </div>
        </button>
        <div class="rounded-lg border border-rose-800/50 bg-rose-900/10 px-3 py-2">
          <div class="text-sm text-slate-200">👑 Magni</div>
          <div class="text-[11px] text-rose-300">⚖️ proposed for removal</div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span class="text-[11px] text-slate-400">
          Tally: <span class="text-amber-200">{votes} of {GM_COUNT}</span>{" "}
          guildmasters · majority needs {MAJORITY}
        </span>
        <span
          class={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
            passed
              ? "border-emerald-600 bg-emerald-500/15 text-emerald-200"
              : "border-slate-700 bg-slate-800/50 text-slate-400"
          }`}
        >
          {passed
            ? "🗳️ Motion passes — app grants passed"
            : "⏳ Motion pending"}
        </span>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2">
        <div class="min-w-0">
          <div class="text-xs text-slate-200">
            OpenFGA gate — depose a guildmaster
          </div>
          <div class="text-[10px] text-slate-500">
            <code>can_remove</code> on <code>{MOTION}</code> · requires{" "}
            <code>passed</code>
          </div>
        </div>
        <Badge allowed={removable} />
      </div>

      <p class="mt-3 text-[11px] text-slate-500">
        OpenFGA can't{" "}
        <em>count</em>, so "a majority of guildmasters" can't live in the model.
        The app tallies the <code>vote</code> tuples and writes{" "}
        <code>passed</code> once a majority agrees; OpenFGA then enforces the
        {" "}
        <code>can_remove: passed</code>{" "}
        gate. (Same split as the cooldown — the app supplies the state, OpenFGA
        enforces the rule.)
      </p>
    </div>
  );
}
