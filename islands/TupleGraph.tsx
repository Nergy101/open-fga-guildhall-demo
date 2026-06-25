import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

/**
 * Live tuple-store node-graph. Reads every tuple from OpenFGA (via /api/tuples →
 * the Read API) and renders it as an interactive vis-network graph: one node per
 * object/userset, one edge per tuple (labelled by relation). Drag, zoom, pan.
 * vis-network touches the DOM/canvas, so it's imported lazily (client-only).
 */

interface Tuple {
  user: string;
  relation: string;
  object: string;
  condition?: { name: string } | null;
}

// Node colour per entity type (the prefix before ":").
const TYPE_COLOR: Record<string, string> = {
  platform: "#f59e0b",
  alliance: "#a78bfa",
  guild: "#fbbf24",
  user: "#38bdf8",
  vault: "#34d399",
  vault_tab: "#6ee7b7",
  raid: "#fb7185",
  channel: "#60a5fa",
  kick_motion: "#f472b6",
};
const FALLBACK = "#94a3b8";

// Tree depth per type: the platform owns the alliance ▸ guilds ▸ their objects ▸
// tabs, with users (players/members) as the leaf row.
const LEVEL: Record<string, number> = {
  platform: 0,
  alliance: 1,
  guild: 2,
  vault: 3,
  raid: 3,
  channel: 3,
  kick_motion: 3,
  vault_tab: 4,
  user: 5,
};

const typeOf = (id: string) => id.split(":")[0];
const shortLabel = (id: string) =>
  id === "user:*" ? "everyone (*)" : id.slice(id.indexOf(":") + 1);

interface VisNetwork {
  destroy(): void;
  fit(): void;
  once(event: string, cb: () => void): void;
  setOptions(opts: unknown): void;
}

export default function TupleGraph() {
  const ref = useRef<HTMLDivElement>(null);
  const state = useSignal<"loading" | "ready" | "error">("loading");
  const error = useSignal<string | null>(null);
  const counts = useSignal({ nodes: 0, edges: 0 });

  useEffect(() => {
    let cancelled = false;
    let network: VisNetwork | null = null;
    (async () => {
      try {
        const res = await fetch("/api/tuples");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const tuples: Tuple[] = json.tuples ?? [];

        // Unique nodes: one per object / userset that appears in any tuple.
        const ids = new Set<string>();
        for (const t of tuples) {
          ids.add(t.user);
          ids.add(t.object);
        }

        const nodes = [...ids].map((id) => {
          const type = typeOf(id);
          const userset = id.includes("#");
          return {
            id,
            label: shortLabel(id),
            title: id,
            level: LEVEL[type] ?? 3,
            shape: userset ? "hexagon" : "dot",
            color: {
              background: TYPE_COLOR[type] ?? FALLBACK,
              border: userset ? "#e2e8f0" : "#0f172a",
              highlight: {
                background: TYPE_COLOR[type] ?? FALLBACK,
                border: "#f8fafc",
              },
            },
          };
        });

        const edges = tuples.map((t, i) => {
          const cond = t.condition?.name;
          return {
            id: i,
            from: t.user,
            to: t.object,
            label: cond ? `${t.relation} ⏱` : t.relation,
            title: cond ? `${t.relation} · if ${cond}(…)` : t.relation,
            dashes: !!cond,
            color: cond
              ? { color: "#f59e0b", highlight: "#fbbf24" }
              : { color: "#475569", highlight: "#94a3b8" },
          };
        });

        const mod = await import(
          "vis-network/standalone/esm/vis-network.js"
        ) as {
          Network: new (
            el: HTMLElement,
            data: unknown,
            opts: unknown,
          ) => VisNetwork;
        };
        if (cancelled || !ref.current) return;

        network = new mod.Network(ref.current, { nodes, edges }, {
          nodes: {
            shape: "dot",
            size: 16,
            borderWidth: 2,
            font: {
              color: "#e2e8f0",
              size: 15,
              face: "ui-sans-serif, system-ui",
            },
          },
          edges: {
            arrows: { to: { enabled: true, scaleFactor: 0.55 } },
            font: {
              color: "#cbd5e1",
              size: 11,
              strokeColor: "#0f172a",
              strokeWidth: 3,
              align: "middle",
            },
            smooth: {
              enabled: true,
              type: "cubicBezier",
              forceDirection: "vertical",
              roundness: 0.5,
            },
            width: 1.5,
          },
          layout: {
            hierarchical: {
              enabled: true,
              direction: "UD",
              sortMethod: "directed",
              levelSeparation: 150,
              nodeSpacing: 110,
              treeSpacing: 180,
              parentCentralization: true,
              blockShifting: true,
              edgeMinimization: true,
            },
          },
          // Deterministic tree layout — physics off so dragged nodes stay put.
          physics: false,
          interaction: { hover: true, tooltipDelay: 120, multiselect: true },
        });
        counts.value = { nodes: nodes.length, edges: edges.length };
        state.value = "ready";
      } catch (e) {
        if (!cancelled) {
          error.value = e instanceof Error ? e.message : String(e);
          state.value = "error";
        }
      }
    })();
    return () => {
      cancelled = true;
      network?.destroy();
    };
  }, []);

  const legend = Object.entries(TYPE_COLOR);

  return (
    <div class="space-y-2">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {legend.map(([type, color]) => (
          <span key={type} class="inline-flex items-center gap-1">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            {type}
          </span>
        ))}
        <span class="inline-flex items-center gap-1">
          <span class="inline-block h-0 w-4 border-t-2 border-dashed border-amber-400" />
          conditional (ABAC)
        </span>
        <span class="inline-flex items-center gap-1 text-slate-500">
          ⬡ userset (<code>obj#relation</code>)
        </span>
      </div>

      <div class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        {state.value === "loading" && (
          <div class="absolute inset-0 z-10 flex items-center justify-center text-sm text-slate-400">
            Loading the live tuple store…
          </div>
        )}
        {state.value === "error" && (
          <div class="absolute inset-0 z-10 flex items-center justify-center p-4">
            <pre class="whitespace-pre-wrap text-xs text-rose-300">
              {error.value}
            </pre>
          </div>
        )}
        {state.value === "ready" && (
          <div class="absolute right-2 top-2 z-10 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] text-slate-400">
            {counts.value.nodes} nodes · {counts.value.edges} tuples
          </div>
        )}
        <div ref={ref} class="h-[72vh] w-full" />
      </div>
    </div>
  );
}
