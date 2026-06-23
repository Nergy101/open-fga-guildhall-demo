import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { ExplainResult } from "@/lib/explainTypes.ts";

interface Payload {
  user: string;
  relation: string;
  object: string;
  context?: unknown;
  concept?: string;
}

/**
 * One delegated listener for every `.explain-chip` on the page. On click it
 * reads the check coordinates from data-* attributes, calls /api/explain, and
 * shows a popup explaining which OpenFGA rules decided the result.
 */
export default function ExplainModal() {
  const open = useSignal(false);
  const loading = useSignal(false);
  const data = useSignal<ExplainResult | null>(null);
  const error = useSignal<string | null>(null);
  const concept = useSignal<string>("");

  useEffect(() => {
    async function load(p: Payload) {
      open.value = true;
      loading.value = true;
      data.value = null;
      error.value = null;
      concept.value = p.concept ?? "";
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user: p.user,
            relation: p.relation,
            object: p.object,
            context: p.context,
          }),
        });
        const json = await res.json();
        if (json.error) error.value = json.error;
        else data.value = json as ExplainResult;
      } catch (err) {
        error.value = String(err);
      }
      loading.value = false;
    }

    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.(".explain-chip") as
        | HTMLElement
        | null;
      if (!el) return;
      e.preventDefault();
      const ctxRaw = el.getAttribute("data-context") || "";
      let context: unknown;
      if (ctxRaw) {
        try {
          context = JSON.parse(ctxRaw);
        } catch { /* ignore malformed context */ }
      }
      load({
        user: el.getAttribute("data-user") ?? "",
        relation: el.getAttribute("data-relation") ?? "",
        object: el.getAttribute("data-object") ?? "",
        context,
        concept: el.getAttribute("data-concept") ?? "",
      });
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") open.value = false;
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open.value) return null;

  const d = data.value;

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => (open.value = false)}
    >
      <div
        class="my-8 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="flex items-start justify-between gap-4 border-b border-slate-800 p-4">
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-500">
              Why this result?
            </div>
            <div class="mt-1 font-mono text-sm text-slate-200">
              <span class="text-sky-300">{d?.user ?? ""}</span>{" "}
              <span class="text-amber-300">{d?.relation ?? ""}</span>{" "}
              <span class="text-emerald-300">{d?.object ?? ""}</span>
            </div>
            {concept.value && (
              <div class="mt-1 text-xs text-slate-400">{concept.value}</div>
            )}
          </div>
          <div class="flex items-center gap-2">
            {d && (
              <span
                class={`rounded-full px-3 py-1 text-sm font-bold ${
                  d.allowed
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {d.allowed ? "✓ Allowed" : "✕ Denied"}
              </span>
            )}
            <button
              type="button"
              onClick={() => (open.value = false)}
              class="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="space-y-5 p-4">
          {loading.value && (
            <p class="text-sm text-slate-400">Resolving rules…</p>
          )}
          {error.value && <p class="text-sm text-rose-400">{error.value}</p>}

          {d && (
            <>
              {/* The rule */}
              <section>
                <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                  The rule (model)
                </h3>
                {d.relationLine && (
                  <pre class="overflow-x-auto rounded-lg bg-amber-400/10 p-2 text-xs text-amber-100"><code>{d.relationLine}</code></pre>
                )}
                <details class="mt-2">
                  <summary class="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                    full <code>type {d.type}</code> definition
                  </summary>
                  <pre class="mt-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"><code>{d.typeBlock}</code></pre>
                </details>
              </section>

              {/* Conditions */}
              {d.conditions.length > 0 && (
                <section>
                  <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                    Condition (ABAC)
                  </h3>
                  {d.conditions.map((c) => (
                    <pre
                      key={c.name}
                      class="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"
                    ><code>{c.block}</code></pre>
                  ))}
                  {d.context && (
                    <p class="mt-1 text-xs text-slate-400">
                      Evaluated with context:{" "}
                      <code class="text-slate-300">
                        {JSON.stringify(d.context)}
                      </code>
                    </p>
                  )}
                </section>
              )}

              {/* Rules graph */}
              {d.expandOutline.length > 0 && (
                <section>
                  <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                    Rules graph (Expand)
                  </h3>
                  <pre class="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-emerald-200/90"><code>{d.expandOutline.join("\n")}</code></pre>
                </section>
              )}

              {/* Relevant tuples */}
              <section>
                <h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                  Relevant tuples{" "}
                  <span class="font-normal text-slate-500">
                    (the data that matters)
                  </span>
                </h3>
                <div class="overflow-x-auto rounded-lg border border-slate-800">
                  <table class="w-full border-collapse text-xs">
                    <tbody class="font-mono">
                      {d.tuples.map((t, i) => (
                        <tr
                          key={i}
                          class={`border-t border-slate-800/60 ${
                            t.matchObject
                              ? "bg-emerald-500/5"
                              : t.matchUser
                              ? "bg-sky-500/5"
                              : ""
                          }`}
                        >
                          <td class="px-2 py-1 text-sky-300">{t.user}</td>
                          <td class="px-2 py-1 text-amber-300">{t.relation}</td>
                          <td class="px-2 py-1 text-emerald-300">{t.object}</td>
                          <td class="px-2 py-1 text-slate-400">
                            {t.condition
                              ? `${t.condition.name} ${
                                JSON.stringify(t.condition.context)
                              }`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p class="mt-1 text-[11px] text-slate-500">
                  <span class="text-emerald-300">green</span> = on this object ·
                  {" "}
                  <span class="text-sky-300">blue</span> = about this user
                </p>
              </section>

              <p class="text-center text-[11px] text-slate-500">
                Explore further in the OpenFGA{" "}
                <a
                  class="underline hover:text-slate-300"
                  href="http://localhost:3000/playground"
                  target="_blank"
                >
                  Playground
                </a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
