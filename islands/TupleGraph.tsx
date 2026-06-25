import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

/**
 * Live tuple-store node-graph (vis-network), read from OpenFGA's Read API.
 * One node per object/userset, one edge per tuple (labelled by relation).
 *
 *  - Tree  — hierarchical, layered by node type (UD / LR).
 *  - Force — force-directed with live sliders + Freeze.
 *  - Member regions — translucent hulls behind the users of each guild, so you
 *    can see at a glance who belongs to which group (drawn on the canvas via the
 *    beforeDrawing hook + getPositions).
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

// Translucent hull colours for the per-guild membership regions.
const GROUP_COLORS = ["#22d3ee", "#f59e0b", "#a3e635", "#fb7185", "#c084fc"];

// Concentric rank relations (a user "belongs" to a guild via any of these).
const RANKS = ["guildmaster", "officer", "raider", "recruit"];

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
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortLabel = (id: string) =>
  id === "user:*" ? "everyone (*)" : id.slice(id.indexOf(":") + 1);

type Dir = "UD" | "LR";
type Pt = { x: number; y: number };

interface Group {
  label: string;
  color: string;
  ids: string[];
}

// Convex hull (Andrew's monotone chain).
function hull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    ) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0
    ) upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

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
  redraw(): void;
  on(event: string, cb: (ctx: CanvasRenderingContext2D) => void): void;
  once(event: string, cb: () => void): void;
  getPositions(ids: string[]): Record<string, Pt>;
  setOptions(opts: unknown): void;
}

export default function TupleGraph() {
  const ref = useRef<HTMLDivElement>(null);
  const net = useRef<VisNetwork | null>(null);
  const state = useSignal<"loading" | "ready" | "error">("loading");
  const error = useSignal<string | null>(null);
  const counts = useSignal({ nodes: 0, edges: 0 });

  const mode = useSignal<"tree" | "force">("tree");
  const dir = useSignal<Dir>("UD");
  const frozen = useSignal(false);
  const showGroups = useSignal(true);
  const groupLegend = useSignal<{ label: string; color: string }[]>([]);

  const repulsion = useSignal(55);
  const edgeLength = useSignal(130);
  const stiffness = useSignal(0.08);
  const centerPull = useSignal(0.01);
  const spread = useSignal(0.4);
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

        // Group players by the guild they hold a rank on (one hull per guild).
        const byGuild = new Map<string, Set<string>>();
        for (const t of tuples) {
          if (
            RANKS.includes(t.relation) && t.object.startsWith("guild:") &&
            t.user.startsWith("user:")
          ) {
            let set = byGuild.get(t.object);
            if (!set) byGuild.set(t.object, set = new Set());
            set.add(t.user);
          }
        }
        const groups: Group[] = [...byGuild.entries()].map((
          [guild, set],
          i,
        ) => ({
          label: `${cap(shortLabel(guild))} members`,
          color: GROUP_COLORS[i % GROUP_COLORS.length],
          ids: [...set],
        }));
        groupLegend.value = groups.map((g) => ({
          label: g.label,
          color: g.color,
        }));

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

        const init = treeOptions("UD");
        const network = new mod.Network(ref.current, { nodes, edges }, {
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
        net.current = network;

        // Translucent membership hull behind each guild's players.
        network.on("beforeDrawing", (ctx: CanvasRenderingContext2D) => {
          if (!showGroups.value) return;
          for (const g of groups) {
            const pos = network.getPositions(g.ids);
            const pts = g.ids.map((id) => pos[id]).filter(Boolean) as Pt[];
            if (pts.length === 0) continue;
            const h = hull(pts);
            ctx.save();
            ctx.beginPath();
            if (h.length === 1) {
              ctx.arc(h[0].x, h[0].y, 48, 0, Math.PI * 2);
            } else {
              ctx.moveTo(h[0].x, h[0].y);
              for (let i = 1; i < h.length; i++) ctx.lineTo(h[i].x, h[i].y);
              ctx.closePath();
            }
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.lineWidth = 95; // pad the hull into a soft rounded blob
            ctx.strokeStyle = g.color + "22";
            ctx.fillStyle = g.color + "1f";
            ctx.stroke();
            ctx.fill();
            const top = pts.reduce((a, b) => (b.y < a.y ? b : a));
            ctx.fillStyle = g.color + "dd";
            ctx.font = "bold 15px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(g.label, top.x, top.y - 64);
            ctx.restore();
          }
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

        <button
          type="button"
          class={`rounded-md border border-slate-700 ${seg(showGroups.value)}`}
          onClick={() => {
            showGroups.value = !showGroups.value;
            net.current?.redraw();
          }}
        >
          ◓ Member regions
        </button>
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
        {showGroups.value &&
          groupLegend.value.map((g) => (
            <span key={g.label} class="inline-flex items-center gap-1">
              <span
                class="inline-block h-2.5 w-3.5 rounded-sm"
                style={{
                  background: g.color + "55",
                  border: `1px solid ${g.color}`,
                }}
              />
              {g.label}
            </span>
          ))}
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
