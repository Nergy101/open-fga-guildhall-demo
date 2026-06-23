import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { abacContext, checkId, RESOURCES } from "@/data/catalog.ts";
import { buildItems } from "@/lib/access.ts";
import { Badge } from "@/components/Badge.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const { persona, user } = ctx.state;
    const results = await batchCheck(buildItems(persona.id, user));
    const allowed = Object.values(results).filter(Boolean).length;
    return page({ results, allowed, total: Object.keys(results).length });
  },
});

export default define.page<typeof handler>(function Dashboard({ data, state }) {
  const { results, allowed, total } = data;
  const persona = state.persona;

  return (
    <div class="space-y-6">
      <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div class="flex items-start gap-4">
          <div class="text-4xl">{persona.emoji}</div>
          <div class="flex-1">
            <h1 class="text-xl font-bold text-amber-100">
              {persona.name} <span class="text-slate-500">·</span>{" "}
              <span class="text-base font-medium text-slate-300">
                {persona.role}
              </span>
            </h1>
            <p class="mt-1 text-sm text-slate-400">{persona.blurb}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center">
            <div class="text-2xl font-bold text-amber-200">
              {allowed}
              <span class="text-slate-500">/{total}</span>
            </div>
            <div class="text-[11px] uppercase tracking-wide text-slate-400">
              actions allowed
            </div>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((r) => (
          <section
            key={r.key}
            class="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">{r.emoji}</span>
              <h2 class="font-semibold text-slate-100">{r.name}</h2>
            </div>
            <p class="mt-1 text-xs text-slate-400">{r.blurb}</p>
            <code class="mt-1 block text-[11px] text-slate-600">
              {r.object}
            </code>

            <ul class="mt-3 space-y-2">
              {r.actions.map((a) => (
                <li key={a.key} class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm text-slate-200">{a.label}</div>
                    <div class="truncate text-[11px] text-slate-500">
                      <code>{a.relation}</code> — {a.concept}
                    </div>
                  </div>
                  <Badge
                    allowed={results[checkId(persona.id, r.key, a.key)] ??
                      false}
                    abac={!!a.abac}
                    user={state.user}
                    relation={a.relation}
                    object={r.object}
                    context={abacContext(a.abac)}
                    concept={a.concept}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p class="text-center text-xs text-slate-500">
        <span class="text-amber-300">⏰ Allowed*/Denied*</span>{" "}
        = ABAC result under default context (250g withdrawal, current time).
        Tweak it live on the{" "}
        <a class="underline hover:text-slate-300" href="/explorer">
          Access Matrix
        </a>.
      </p>
    </div>
  );
});
