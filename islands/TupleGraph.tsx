import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

/**
 * Live tuple-store node-graph. Reads every tuple from OpenFGA (via /api/tuples →
 * the Read API) and renders it as an interactive vis-network graph: one node per
 * object/userset, one edge per tuple (labelled by relation).
 *
 * Two layouts, toggleable live:
 *  - Tree  — hierarchical, layered by node type, top-down (UD) or left-right (LR);
 *  - Force — force-directed with live sliders (repulsion, edge length, …) and a
 *            Freeze button so you can lock it and drag nodes that stay put.
 *
 * vis-network touches the DOM/canvas, so it's imported lazily (client-only).
 */

interface Tuple {
  user: string;
  relation: string;
  object: string;
  condition?: { name: string } | null;
}

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

// Tree depth per type: platform ▸ alliance ▸ guild ▸ objects ▸ tabs ▸ users.
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

type Dir = "UD" | "LR";

const treeOptions = (dir: Dir) => ({
  layout: {
    hierarchical: {
      enabled: true,
      direction: dir,
      sortMethod: "directed",
      levelSeparation: 150,
      nodeSpacing: 110,
      treeSpacing: 180,
      parentCentralization: true,
      blockShifting: true,
      edgeMinimization: true,
    },
  },
  physics: false,
  edges: {
    smooth: {
      enabled: true,
      type: "cubicBezier",
      forceDirection: dir === "UD" ? "vertical" : "horizontal",
      roundness: 0.5,
    },
  },
});

interface VisNetwork {
  destroy(): void;
  fit(): void;
  once(event: string, cb: () => void): void;
  setOptions(opts: unknown): void;
}

interface VisDataSet {
  update(data: Record<string, unknown> | Record<string, unknown>[]): unknown;
}

export default function TupleGraph() {
  const ref = useRef<HTMLDivElement>(null);
  const net = useRef<VisNetwork | null>(null);
  const state = useSignal<"loading" | "ready" | "error">("loading");
  const error = useSignal<string | null>(null);
  const counts = useSignal({ nodes: 0, edges: 0 });
  const total = useSignal({ nodes: 0, edges: 0 });

  // Manual exploration: hide whole kinds, or individual nodes within a kind.
  const nodeSet = useRef<VisDataSet | null>(null);
  const edgeSet = useRef<VisDataSet | null>(null);
  const nodeMeta = useRef<{ id: string; kind: string }[]>([]);
  const edgeMeta = useRef<{ id: number; from: string; to: string }[]>([]);
  const disabledKinds = useSignal<Set<string>>(new Set());
  const hiddenIds = useSignal<Set<string>>(new Set());
  const nodesByKind = useSignal<
    { kind: string; color: string; nodes: { id: string; label: string }[] }[]
  >([]);

  const mode = useSignal<"tree" | "force">("tree");
  const dir = useSignal<Dir>("UD");
  const frozen = useSignal(false);

  // Force-layout knobs (forceAtlas2Based).
  const repulsion = useSignal(55); // → gravitationalConstant: -repulsion
  const edgeLength = useSignal(130); // springLength
  const stiffness = useSignal(0.08); // springConstant
  const centerPull = useSignal(0.01); // centralGravity
  const spread = useSignal(0.4); // avoidOverlap
  const damping = useSignal(0.4);

  const physicsObj = () => ({
    enabled: true,
    solver: "forceAtlas2Based",
    forceAtlas2Based: {
      gravitationalConstant: -repulsion.value,
      centralGravity: centerPull.value,
      springLength: edgeLength.value,
      springConstant: stiffness.value,
      avoidOverlap: spread.value,
      damping: damping.value,
    },
  });

  function setTree(d: Dir) {
    mode.value = "tree";
    dir.value = d;
    net.current?.setOptions(treeOptions(d));
    setTimeout(() => net.current?.fit(), 80);
  }
  function setForce() {
    mode.value = "force";
    frozen.value = false;
    net.current?.setOptions({
      layout: { hierarchical: { enabled: false } },
      physics: physicsObj(),
      edges: { smooth: { enabled: true, type: "dynamic" } },
    });
    setTimeout(() => net.current?.fit(), 700);
  }
  function tuneForce() {
    frozen.value = false;
    net.current?.setOptions({ physics: physicsObj() });
  }
  function toggleFreeze() {
    const f = !frozen.value;
    frozen.value = f;
    net.current?.setOptions(f ? { physics: false } : { physics: physicsObj() });
  }

  function applyFilter() {
    const ns = nodeSet.current;
    const es = edgeSet.current;
    if (!ns || !es) return;
    const dis = disabledKinds.value;
    const hid = hiddenIds.value;
    const visible = new Set<string>();
    const nUpd = nodeMeta.current.map((n) => {
      const vis = !dis.has(n.kind) && !hid.has(n.id);
      if (vis) visible.add(n.id);
      return { id: n.id, hidden: !vis, physics: vis };
    });
    let ev = 0;
    const eUpd = edgeMeta.current.map((e) => {
      const vis = visible.has(e.from) && visible.has(e.to);
      if (vis) ev++;
      return { id: e.id, hidden: !vis };
    });
    ns.update(nUpd);
    es.update(eUpd);
    counts.value = { nodes: visible.size, edges: ev };
  }
  function toggleKind(kind: string) {
    const s = new Set(disabledKinds.value);
    if (s.has(kind)) s.delete(kind);
    else s.add(kind);
    disabledKinds.value = s;
    applyFilter();
  }
  function toggleNode(id: string) {
    const s = new Set(hiddenIds.value);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    hiddenIds.value = s;
    applyFilter();
  }
  function showAll() {
    disabledKinds.value = new Set();
    hiddenIds.value = new Set();
    applyFilter();
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tuples");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const tuples: Tuple[] = json.tuples ?? [];

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
            // Usersets (obj#relation) sit one tier above their base type.
            level: Math.max(0, (LEVEL[type] ?? 3) - (userset ? 1 : 0)),
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
          DataSet: new (items: unknown[]) => VisDataSet;
        };
        if (cancelled || !ref.current) return;

        // Metadata + an ordered, grouped kind list for the filter panel.
        nodeMeta.current = nodes.map((n) => ({ id: n.id, kind: typeOf(n.id) }));
        edgeMeta.current = edges.map((e) => ({
          id: e.id,
          from: e.from,
          to: e.to,
        }));
        const order = Object.keys(TYPE_COLOR);
        const byKind = new Map<string, { id: string; label: string }[]>();
        for (const n of nodes) {
          const k = typeOf(n.id);
          let arr = byKind.get(k);
          if (!arr) {
            arr = [];
            byKind.set(k, arr);
          }
          arr.push({ id: n.id, label: n.label });
        }
        nodesByKind.value = [...byKind.keys()]
          .sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) ||
              a.localeCompare(b);
          })
          .map((kind) => ({
            kind,
            color: TYPE_COLOR[kind] ?? FALLBACK,
            nodes: byKind.get(kind)!.sort((a, b) =>
              a.label.localeCompare(b.label)
            ),
          }));

        const nodeData = new mod.DataSet(nodes);
        const edgeData = new mod.DataSet(edges);
        nodeSet.current = nodeData;
        edgeSet.current = edgeData;

        const init = treeOptions("UD");
        net.current = new mod.Network(ref.current, {
          nodes: nodeData,
          edges: edgeData,
        }, {
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
            width: 1.5,
            smooth: init.edges.smooth,
          },
          interaction: { hover: true, tooltipDelay: 120, multiselect: true },
          layout: init.layout,
          physics: init.physics,
        });
        total.value = { nodes: nodes.length, edges: edges.length };
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
      net.current?.destroy();
      net.current = null;
    };
  }, []);

  const seg = (active: boolean) =>
    `px-2.5 py-1 transition-colors ${
      active
        ? "bg-amber-400/20 text-amber-100"
        : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
    }`;
  const isTree = mode.value === "tree";

  const sliders: {
    label: string;
    sig: { value: number };
    min: number;
    max: number;
    step: number;
    fmt: (v: number) => string;
  }[] = [
    {
      label: "Repulsion",
      sig: repulsion,
      min: 0,
      max: 250,
      step: 5,
      fmt: (v) => String(v),
    },
    {
      label: "Edge length",
      sig: edgeLength,
      min: 40,
      max: 400,
      step: 10,
      fmt: (v) => String(v),
    },
    {
      label: "Edge stiffness",
      sig: stiffness,
      min: 0,
      max: 0.3,
      step: 0.005,
      fmt: (v) => v.toFixed(3),
    },
    {
      label: "Center pull",
      sig: centerPull,
      min: 0,
      max: 0.5,
      step: 0.01,
      fmt: (v) => v.toFixed(2),
    },
    {
      label: "Spread",
      sig: spread,
      min: 0,
      max: 1,
      step: 0.05,
      fmt: (v) => v.toFixed(2),
    },
    {
      label: "Damping",
      sig: damping,
      min: 0.05,
      max: 1,
      step: 0.05,
      fmt: (v) => v.toFixed(2),
    },
  ];

  return (
    <div class="space-y-2">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div class="inline-flex items-center gap-1.5">
          <span class="text-slate-500">Layout</span>
          <div class="inline-flex overflow-hidden rounded-md border border-slate-700">
            <button
              type="button"
              class={seg(isTree)}
              onClick={() => setTree(dir.value)}
            >
              🌳 Tree
            </button>
            <button type="button" class={seg(!isTree)} onClick={setForce}>
              🕸️ Force
            </button>
          </div>
        </div>

        <div
          class={`inline-flex items-center gap-1.5 ${
            isTree ? "" : "opacity-40"
          }`}
        >
          <span class="text-slate-500">Direction</span>
          <div class="inline-flex overflow-hidden rounded-md border border-slate-700">
            <button
              type="button"
              disabled={!isTree}
              class={`${seg(dir.value === "UD")} disabled:cursor-not-allowed`}
              onClick={() => setTree("UD")}
            >
              ↓ Top-down
            </button>
            <button
              type="button"
              disabled={!isTree}
              class={`${seg(dir.value === "LR")} disabled:cursor-not-allowed`}
              onClick={() => setTree("LR")}
            >
              → Left-right
            </button>
          </div>
        </div>
      </div>

      {!isTree && (
        <div class="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-300">
              ⚙️ Force controls
            </span>
            <button
              type="button"
              onClick={toggleFreeze}
              class="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              {frozen.value ? "▶ Resume" : "❄️ Freeze"}
            </button>
          </div>
          <div class="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {sliders.map((s) => (
              <label
                key={s.label}
                class="flex items-center gap-2 text-[11px] text-slate-400"
              >
                <span class="w-24 shrink-0">{s.label}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.sig.value}
                  onInput={(e) => {
                    s.sig.value = Number((e.target as HTMLInputElement).value);
                    tuneForce();
                  }}
                  class="h-1 flex-1 accent-amber-400"
                />
                <span class="w-10 text-right tabular-nums text-slate-300">
                  {s.fmt(s.sig.value)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
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

      {state.value === "ready" && nodesByKind.value.length > 0 && (
        <details
          open
          class="rounded-lg border border-slate-800 bg-slate-900/40"
        >
          <summary class="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300">
            <span>🔎 Node filters</span>
            <span class="font-normal text-slate-500">
              {counts.value.nodes}/{total.value.nodes} nodes ·{" "}
              {counts.value.edges}/{total.value.edges} tuples
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                showAll();
              }}
              class="ml-auto rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] font-normal text-slate-300 hover:bg-slate-800"
            >
              Show all
            </button>
          </summary>
          <div class="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodesByKind.value.map(({ kind, color, nodes }) => {
              const kindOn = !disabledKinds.value.has(kind);
              const vis = nodes.filter((n) =>
                !hiddenIds.value.has(n.id)
              ).length;
              return (
                <details
                  key={kind}
                  class="rounded-md border border-slate-800 bg-slate-900/60"
                >
                  <summary class="flex cursor-pointer select-none items-center gap-2 px-2 py-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={kindOn}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleKind(kind)}
                      class="accent-amber-400"
                    />
                    <span
                      class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span
                      class={kindOn
                        ? "text-slate-200"
                        : "text-slate-500 line-through"}
                    >
                      {kind}
                    </span>
                    <span class="ml-auto tabular-nums text-slate-500">
                      {kindOn ? vis : 0}/{nodes.length}
                    </span>
                  </summary>
                  <div class="max-h-44 space-y-0.5 overflow-auto border-t border-slate-800 px-2 py-1.5">
                    {nodes.map((n) => (
                      <label
                        key={n.id}
                        class={`flex items-center gap-1.5 text-[11px] ${
                          kindOn ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!kindOn}
                          checked={kindOn && !hiddenIds.value.has(n.id)}
                          onChange={() => toggleNode(n.id)}
                          class="accent-amber-400"
                        />
                        <span class="truncate" title={n.id}>{n.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </details>
      )}

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
            {counts.value.nodes}/{total.value.nodes} nodes ·{" "}
            {counts.value.edges}/{total.value.edges} tuples
          </div>
        )}
        <div ref={ref} class="h-[72vh] w-full" />
      </div>
    </div>
  );
}
