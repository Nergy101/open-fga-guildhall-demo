import { PERSONAS } from "@/data/personas.ts";
import { useSignal } from "@preact/signals";

/** Row of persona buttons. Clicking sets the cookie and reloads so the
 * server re-renders every access badge for the chosen identity. */
export default function PersonaSwitcher({ current }: { current: string }) {
  const busy = useSignal(false);

  async function pick(id: string) {
    if (id === current || busy.value) return;
    busy.value = true;
    await fetch("/api/persona", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona: id }),
    });
    location.reload();
  }

  return (
    <div class="flex flex-wrap gap-2">
      {PERSONAS.map((p) => {
        const active = p.id === current;
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => pick(p.id)}
            title={p.blurb}
            disabled={busy.value}
            class={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-50 ${
              active
                ? "border-amber-400 bg-amber-400/15 text-amber-100 shadow-[0_0_0_1px] shadow-amber-400/40"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-700/60"
            }`}
          >
            <span class="text-lg leading-none">{p.emoji}</span>
            <span class="leading-tight">
              <span class="block font-semibold">{p.name}</span>
              <span class="block text-[11px] uppercase tracking-wide opacity-70">
                {p.role}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
