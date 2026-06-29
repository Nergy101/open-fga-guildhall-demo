import { define } from "@/utils.ts";
import { SCENARIOS } from "@/data/scenarios.ts";

export default define.page(function Labs() {
  return (
    <div class="space-y-6">
      <section>
        <h1 class="text-xl font-bold text-amber-100">🧪 Interactive Labs</h1>
        <p class="mt-1 text-sm text-slate-400">
          Each card is a bite-sized <strong>scenario</strong>{" "}
          — a small story about the guilds and their heroes, backed by a live
          OpenFGA lab. Open one to walk it through; every badge is a real{" "}
          <code>Check</code>.
        </p>
      </section>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SCENARIOS.map((s) => (
          <a
            key={s.id}
            href={`/labs/${s.id}`}
            class="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:border-amber-400/60 hover:bg-slate-900/70"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl">{s.emoji}</span>
              <div>
                <h2 class="font-bold text-amber-100 group-hover:text-amber-50">
                  {s.title}
                </h2>
                <span class="text-[11px] uppercase tracking-wide text-slate-500">
                  {s.cast}
                </span>
              </div>
            </div>
            <p class="mt-3 flex-1 text-sm text-slate-400">{s.hook}</p>
            <div class="mt-4 flex items-center justify-between gap-2">
              <span class="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-400/30">
                {s.concept}
              </span>
              <span class="text-xs text-slate-500 group-hover:text-amber-300">
                Open scenario →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
});
