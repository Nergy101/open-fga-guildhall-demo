/**
 * Builds a human-readable explanation of *why* a check is allowed or denied:
 * the relation's DSL rule, any ABAC condition, the relevant relationship tuples,
 * and the Expand userset tree (the "rules graph").
 */
import { check, expand, type ExpandNode, type FgaContext } from "@/lib/fga.ts";
import { TUPLES } from "@/data/seed.ts";
import type { ExplainResult, ExplainTuple } from "@/lib/explainTypes.ts";

// ── Model (DSL) parsing, cached ──────────────────────────────────────────────
let parsed: {
  types: Record<string, string>;
  conditions: Record<string, string>;
} | null = null;

async function parseModel() {
  if (parsed) return parsed;
  const text = await Deno.readTextFile(new URL("./model.fga", import.meta.url));
  const lines = text.split("\n");
  const starts: { name: string; kind: "type" | "condition"; idx: number }[] =
    [];
  lines.forEach((l, i) => {
    const t = l.match(/^type (\w+)/);
    const c = l.match(/^condition (\w+)/);
    if (t) starts.push({ name: t[1], kind: "type", idx: i });
    else if (c) starts.push({ name: c[1], kind: "condition", idx: i });
  });

  const types: Record<string, string> = {};
  const conditions: Record<string, string> = {};
  for (let k = 0; k < starts.length; k++) {
    const s = starts[k];
    const end = k + 1 < starts.length ? starts[k + 1].idx : lines.length;
    const block = lines.slice(s.idx, end);
    // Drop trailing blank/comment lines (they belong to the next block's header).
    while (
      block.length &&
      (block.at(-1)!.trim() === "" || block.at(-1)!.trimStart().startsWith("#"))
    ) {
      block.pop();
    }
    (s.kind === "type" ? types : conditions)[s.name] = block.join("\n");
  }
  parsed = { types, conditions };
  return parsed;
}

// ── Relevant tuples: the object, its parents/usersets, and the user's own ────
function relevantTuples(user: string, object: string): ExplainTuple[] {
  const related = new Set<string>([object]);
  const queue = [object];
  let guard = 0;
  while (queue.length && guard++ < 64) {
    const obj = queue.shift()!;
    for (const t of TUPLES) {
      if (t.object !== obj) continue;
      const base = t.user.split("#")[0]; // strip "#member" etc.
      if (base.includes(":") && !related.has(base)) {
        related.add(base);
        queue.push(base);
      }
    }
  }

  const out: ExplainTuple[] = [];
  for (const t of TUPLES) {
    const userBaseMatch = t.user === user || t.user.split("#")[0] === user;
    if (!related.has(t.object) && !userBaseMatch) continue;
    out.push({
      ...t,
      matchObject: t.object === object,
      matchUser: userBaseMatch,
    });
  }
  return out.slice(0, 40);
}

// ── Expand tree → indented outline ───────────────────────────────────────────
function formatExpandContent(node: ExpandNode, depth: number, lines: string[]) {
  const pad = "  ".repeat(depth);
  if (node.leaf) {
    const lf = node.leaf;
    if (lf.users) {
      lines.push(
        `${pad}• direct: ${(lf.users.users ?? []).join(", ") || "(none)"}`,
      );
    } else if (lf.computed) {
      lines.push(`${pad}• computed → ${lf.computed.userset}`);
    } else if (lf.tupleToUserset) {
      const comp = (lf.tupleToUserset.computed ?? []).map((c) => c.userset)
        .join(", ");
      lines.push(`${pad}• follow '${lf.tupleToUserset.tupleset}' → ${comp}`);
    }
  } else if (node.union) {
    lines.push(`${pad}ANY of (union):`);
    for (const n of node.union.nodes ?? []) {
      formatExpandContent(n, depth + 1, lines);
    }
  } else if (node.intersection) {
    lines.push(`${pad}ALL of (intersection):`);
    for (const n of node.intersection.nodes ?? []) {
      formatExpandContent(n, depth + 1, lines);
    }
  } else if (node.difference) {
    lines.push(`${pad}base:`);
    if (node.difference.base) {
      formatExpandContent(node.difference.base, depth + 1, lines);
    }
    lines.push(`${pad}BUT NOT:`);
    if (node.difference.subtract) {
      formatExpandContent(node.difference.subtract, depth + 1, lines);
    }
  }
}

export async function buildExplanation(
  input: {
    user: string;
    relation: string;
    object: string;
    context?: FgaContext;
  },
): Promise<ExplainResult> {
  const { user, relation, object, context } = input;
  const type = object.split(":")[0];

  const model = await parseModel();
  const typeBlock = model.types[type] ?? "";
  const relationLine =
    typeBlock.split("\n").find((l) =>
      l.trim().startsWith(`define ${relation}:`)
    )?.trim() ?? "";

  // Conditions referenced by THIS relation (via the DSL line or a matching tuple).
  const tuples = relevantTuples(user, object);
  const condNames = new Set<string>();
  for (const m of relationLine.matchAll(/with (\w+)/g)) condNames.add(m[1]);
  for (const t of tuples) {
    if (t.relation === relation && t.condition) condNames.add(t.condition.name);
  }
  const conditions = [...condNames].map((name) => ({
    name,
    block: model.conditions[name] ?? "",
  }));

  const [allowed, root] = await Promise.all([
    check({ user, relation, object, context }),
    expand(relation, object).catch(() => undefined),
  ]);

  const expandOutline: string[] = [];
  if (root) {
    expandOutline.push(`${root.name ?? `${object}#${relation}`}`);
    formatExpandContent(root, 1, expandOutline);
  }

  return {
    allowed,
    user,
    relation,
    object,
    type,
    typeBlock,
    relationLine,
    conditions,
    context,
    tuples,
    expandOutline,
  };
}
