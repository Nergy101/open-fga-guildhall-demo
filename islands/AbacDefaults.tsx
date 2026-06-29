import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  ARTHAS_WITHDRAW_LIMIT,
  MEMBER_WITHDRAW_LIMIT,
  SIGNUP_WINDOW,
} from "@/data/seed.ts";

type When = "before" | "now" | "after";

/**
 * The dashboard's default ABAC context, made configurable. Changing the
 * withdrawal amount or the signup window reloads the page with the new values
 * as query params, so every badge — and the allowed/total tally — re-checks
 * under the chosen context. These are the same two conditions the ABAC Lab
 * exercises, surfaced right next to the persona's allowed actions.
 */
export default function AbacDefaults(
  { amount, when }: { amount: number; when: When },
) {
  const amt = useSignal(amount);

  // Changing a control reloads the page so the server re-checks every badge.
  // Stash the scroll position first and restore it on arrival, so tweaking the
  // slider doesn't yank you back to the top of the page.
  useEffect(() => {
    const saved = sessionStorage.getItem("dashboard-scroll");
    if (saved === null) return;
    sessionStorage.removeItem("dashboard-scroll");
    globalThis.scrollTo(0, Number(saved));
  }, []);

  function apply(next: { amount?: number; when?: When }) {
    sessionStorage.setItem("dashboard-scroll", String(globalThis.scrollY));
    const url = new URL(location.href);
    url.searchParams.set("amount", String(next.amount ?? amt.value));
    url.searchParams.set("when", next.when ?? when);
    location.href = url.toString();
  }

  const windows: { id: When; label: string }[] = [
    { id: "before", label: "Before window" },
    { id: "now", label: "Now" },
    { id: "after", label: "After window" },
  ];

  return (
    <div class="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 md:grid-cols-2">
      {/* Withdrawal limit — condition withdrawal_within_limit */}
      <div>
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="text-sm font-semibold text-amber-200/90">
            🏦 Withdrawal amount
          </h2>
          <span class="font-mono text-sm text-amber-200">{amt.value}g</span>
        </div>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-400">
          Condition{" "}
          <code>withdrawal_within_limit</code>: officers withdraw freely; Arthas
          up to{" "}
          <span class="text-amber-300">{ARTHAS_WITHDRAW_LIMIT}g</span>; members
          (incl. recruits) up to{" "}
          <span class="text-amber-300">{MEMBER_WITHDRAW_LIMIT}g</span>;
          banned/outsiders denied. Drives every deposit &amp; withdraw badge
          below.
        </p>
        <input
          type="range"
          min={0}
          max={1500}
          step={50}
          value={amt.value}
          onInput={(
            e,
          ) => (amt.value = Number((e.target as HTMLInputElement).value))}
          onChange={() => apply({ amount: amt.value })}
          class="mt-2 w-full accent-amber-400"
        />
      </div>

      {/* Signup window — condition within_signup_window */}
      <div>
        <h2 class="text-sm font-semibold text-amber-200/90">
          🔥 Raid signup window
        </h2>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-400">
          Condition{" "}
          <code>within_signup_window</code>: members may sign up only between
          {" "}
          <span class="text-amber-300">
            {SIGNUP_WINDOW.opens_at.slice(0, 10)}
          </span>{" "}
          and{" "}
          <span class="text-amber-300">
            {SIGNUP_WINDOW.closes_at.slice(0, 10)}
          </span>. Choose where the checks' <code>current_time</code>{" "}
          falls — drives every signup badge.
        </p>
        <div class="mt-2 flex gap-2">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => apply({ when: w.id })}
              class={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                when === w.id
                  ? "border-amber-400 bg-amber-400/15 text-amber-100"
                  : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
