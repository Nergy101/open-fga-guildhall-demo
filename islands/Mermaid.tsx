import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

let initialized = false;

/** Renders a Mermaid diagram definition to SVG (client-side only). */
export default function Mermaid({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const error = useSignal<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Platform-specific exception: mermaid is browser-only — importing it at
        // module top level runs DOM/logging side-effects that crash Deno SSR, so
        // it must be loaded lazily here in the browser.
        const mermaid = (await import("mermaid")).default;
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          });
          initialized = true;
        }
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) {
          error.value = e instanceof Error ? e.message : String(e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      {error.value
        ? (
          <pre class="whitespace-pre-wrap text-xs text-rose-300">
            {error.value}
          </pre>
        )
        : <div ref={ref} class="flex justify-center" />}
    </div>
  );
}
