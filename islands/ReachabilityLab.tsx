import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { runListObjects } from "@/lib/labClient.ts";
import { PERSONAS, personaUser } from "@/data/personas.ts";

/**
 * Reachability Lab — the REVERSE query. Instead of "can persona X do Y on
 * object Z?" (Check), it asks "which objects of a type can X reach?"
 * (ListObjects). Pick a query and compare the reachable set per persona side by
 * side — the inverse view of the access matrix.
 */

interface Query {
  id: string;
  label: string;
  type: string;
  relation: string;
}

const QUERIES: Query[] = [
  {
    id: "ch_read",
    label: "Channels I can read",
    type: "channel",
    relation: "can_read",
  },
  {
    id: "ch_post",
    label: "Channels I can post in",
    type: "channel",
    relation: "can_post",
  },
  {
    id: "raid_view",
    label: "Raids I can view",
    type: "raid",
    relation: "can_view",
  },
  {
    id: "raid_loot",
    label: "Raids I can loot",
    type: "raid",
    relation: "can_loot",
  },
  {
    id: "vault_view",
    label: "Vaults I can view",
    type: "vault",
    relation: "can_view",
  },
];

type ByPersona = Record<string, string[]>;

/** "channel:tavern_board" -> "tavern_board". */
function shortId(object: string): string {
  const i = object.indexOf(":");
  return i === -1 ? object : object.slice(i + 1);
}

// A stable color per object name, so identical tags (e.g. every "general")
// read the same across personas — making the per-persona differences easy to
// scan. Names are assigned palette slots in sorted order.
const TAG_COLORS = [
  "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  "bg-rose-500/15 text-rose-300 ring-rose-500/30",
];

function tagColor(name: string, order: string[]): string {
  const i = order.indexOf(name);
  return TAG_COLORS[(i < 0 ? 0 : i) % TAG_COLORS.length];
}

export default function ReachabilityLab() {
  const query = useSignal<Query>(QUERIES[0]);
  const objects = useSignal<ByPersona>({});
  const loading = useSignal(false);

  async function refresh(q: Query) {
    loading.value = true;
    const lists = await Promise.all(
      PERSONAS.map((p) =>
        runListObjects({
          user: personaUser(p.id),
          relation: q.relation,
          type: q.type,
        })
      ),
    );
    const next: ByPersona = {};
    PERSONAS.forEach((p, i) => {
      next[p.id] = lists[i].slice().sort();
    });
    objects.value = next;
    loading.value = false;
  }

  useEffect(() => {
    refresh(query.value);
  }, []);

  const allNames = [
    ...new Set(
      PERSONAS.flatMap((p) => (objects.value[p.id] ?? []).map(shortId)),
    ),
  ].sort();

  return (
    <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p class="text-xs text-slate-400">
        <code>ListObjects</code>{" "}
        walks the model backwards: pick a query and see the full set of objects
        each persona can reach — the mirror image of the matrix above.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        {QUERIES.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => {
              query.value = q;
              refresh(q);
            }}
            class={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              query.value.id === q.id
                ? "border-amber-400 bg-amber-400/15 text-amber-100"
                : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <p class="mt-3 font-mono text-[11px] text-slate-500">
        ListObjects(user,{" "}
        <span class="text-amber-300">{query.value.relation}</span>,
        <span class="text-amber-300">{query.value.type}</span>)
      </p>

      <div class="mt-2 space-y-1.5">
        {PERSONAS.map((p) => {
          const ids = objects.value[p.id] ?? [];
          return (
            <div
              key={p.id}
              class="flex items-start gap-3 rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2"
            >
              <div class="flex w-32 shrink-0 items-center gap-2">
                <span>{p.emoji}</span>
                <span class="truncate text-xs text-slate-300">{p.name}</span>
              </div>
              <div class="flex flex-1 flex-wrap gap-1.5">
                {loading.value
                  ? <span class="text-[11px] text-slate-600">…</span>
                  : ids.length === 0
                  ? <span class="text-[11px] text-rose-400/70">— none —</span>
                  : ids.map((o) => (
                    <span
                      key={o}
                      class={`rounded px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-inset ${
                        tagColor(shortId(o), allNames)
                      }`}
                    >
                      {shortId(o)}
                    </span>
                  ))}
              </div>
              <span class="shrink-0 text-[11px] tabular-nums text-slate-500">
                {loading.value ? "" : ids.length}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
