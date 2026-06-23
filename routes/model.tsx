import { page } from "fresh";
import { define } from "@/utils.ts";
import { loadFgaConfig } from "@/lib/store.ts";
import { TUPLES } from "@/data/seed.ts";
import { PERSONAS } from "@/data/personas.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    const dsl = await Deno.readTextFile(
      new URL("../lib/model.fga", import.meta.url),
    );
    let cfg: { apiUrl: string; storeId: string; modelId: string } | null = null;
    try {
      cfg = await loadFgaConfig();
    } catch {
      cfg = null;
    }
    return page({ dsl, cfg });
  },
});

export default define.page<typeof handler>(function ModelPage({ data }) {
  const { dsl, cfg } = data;

  return (
    <div class="space-y-6">
      <section>
        <h1 class="text-xl font-bold text-amber-100">The Model</h1>
        <p class="mt-1 text-sm text-slate-400">
          The authorization model (DSL), the seeded relationship tuples, and the
          personas — the full "why" behind every badge.
        </p>
        {cfg && (
          <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-slate-500">
            <span>
              store: <span class="text-slate-400">{cfg.storeId}</span>
            </span>
            <span>
              model: <span class="text-slate-400">{cfg.modelId}</span>
            </span>
            <span>
              api:{" "}
              <a
                class="text-slate-400 underline"
                href={cfg.apiUrl}
                target="_blank"
              >
                {cfg.apiUrl}
              </a>
            </span>
          </div>
        )}
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-amber-100">
          Authorization model (DSL)
        </h2>
        <pre class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300"><code>{dsl}</code></pre>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-amber-100">Personas</h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <div
              key={p.id}
              class="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">{p.emoji}</span>
                <span class="font-semibold text-slate-100">{p.name}</span>
                <span class="text-[11px] uppercase tracking-wide text-slate-500">
                  {p.role}
                </span>
              </div>
              <p class="mt-1 text-xs text-slate-400">{p.blurb}</p>
              <code class="mt-1 block text-[11px] text-slate-600">
                user:{p.id}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-amber-100">
          Relationship tuples{" "}
          <span class="text-sm font-normal text-slate-500">
            ({TUPLES.length})
          </span>
        </h2>
        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-slate-900/80 text-left text-slate-300">
                <th class="px-3 py-2 font-semibold">user</th>
                <th class="px-3 py-2 font-semibold">relation</th>
                <th class="px-3 py-2 font-semibold">object</th>
                <th class="px-3 py-2 font-semibold">condition</th>
              </tr>
            </thead>
            <tbody class="font-mono text-xs">
              {TUPLES.map((t, i) => (
                <tr
                  key={i}
                  class="border-t border-slate-800/60 hover:bg-slate-800/30"
                >
                  <td class="px-3 py-1.5 text-sky-300">{t.user}</td>
                  <td class="px-3 py-1.5 text-amber-300">{t.relation}</td>
                  <td class="px-3 py-1.5 text-emerald-300">{t.object}</td>
                  <td class="px-3 py-1.5 text-slate-400">
                    {t.condition
                      ? `${t.condition.name} ${
                        JSON.stringify(t.condition.context)
                      }`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});
