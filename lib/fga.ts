/**
 * Minimal, dependency-free OpenFGA HTTP client (uses `fetch`).
 *
 * Only the handful of endpoints this demo needs: Check, BatchCheck, ListObjects.
 * The model + tuples are written by scripts/seed.ts.
 */
import { type FgaConfig, loadFgaConfig } from "./store.ts";

export type FgaContext = Record<string, unknown>;

export interface TupleKey {
  user: string;
  relation: string;
  object: string;
}

export interface CheckInput extends TupleKey {
  /** Condition context (ABAC), e.g. { requested_amount: 250 } or { current_time }. */
  context?: FgaContext;
  /** Extra tuples evaluated only for this request. */
  contextualTuples?: TupleKey[];
}

async function api<T>(
  path: string,
  body: unknown,
  cfg?: FgaConfig,
): Promise<T> {
  const { apiUrl, storeId } = cfg ?? await loadFgaConfig();
  const res = await fetch(`${apiUrl}/stores/${storeId}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`OpenFGA ${path} -> ${res.status}: ${await res.text()}`);
  }
  return await res.json() as T;
}

/** Single relationship check: "does user have relation on object?" */
export async function check(input: CheckInput): Promise<boolean> {
  const cfg = await loadFgaConfig();
  const json = await api<{ allowed?: boolean }>("/check", {
    authorization_model_id: cfg.modelId,
    tuple_key: {
      user: input.user,
      relation: input.relation,
      object: input.object,
    },
    context: input.context,
    contextual_tuples: input.contextualTuples
      ? { tuple_keys: input.contextualTuples }
      : undefined,
  }, cfg);
  return json.allowed === true;
}

export interface BatchItem extends CheckInput {
  /** Correlation id, must match ^[\w-]{1,36}$ and be unique within the batch. */
  id: string;
}

// Batch sizing kept gentle for a small local datastore: a few small requests in
// flight at a time, never one big parallel burst (which trips OpenFGA's
// per-request deadline under load).
const MAX_BATCH = 25;
const BATCH_CONCURRENCY = 2;
/** Re-issue checks the server left unanswered (missing/errored) this many times. */
const MAX_BATCH_ATTEMPTS = 3;

type BatchResultEntry = { allowed?: boolean; error?: unknown };

/** One BatchCheck request; a failed request (e.g. timeout) yields no answers. */
async function batchCheckChunk(
  chunk: BatchItem[],
  cfg: FgaConfig,
): Promise<Record<string, BatchResultEntry>> {
  try {
    const json = await api<{ result?: Record<string, BatchResultEntry> }>(
      "/batch-check",
      {
        authorization_model_id: cfg.modelId,
        checks: chunk.map((it) => ({
          tuple_key: {
            user: it.user,
            relation: it.relation,
            object: it.object,
          },
          context: it.context,
          contextual_tuples: it.contextualTuples
            ? { tuple_keys: it.contextualTuples }
            : undefined,
          correlation_id: it.id,
        })),
      },
      cfg,
    );
    return json.result ?? {};
  } catch {
    return {};
  }
}

/** One pass: chunk into ≤MAX_BATCH, run at most BATCH_CONCURRENCY at a time. */
async function batchCheckPass(
  items: BatchItem[],
  cfg: FgaConfig,
): Promise<Record<string, BatchResultEntry>> {
  const chunks: BatchItem[][] = [];
  for (let i = 0; i < items.length; i += MAX_BATCH) {
    chunks.push(items.slice(i, i + MAX_BATCH));
  }
  const merged: Record<string, BatchResultEntry> = {};
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      const result = await batchCheckChunk(chunk, cfg);
      for (const [id, r] of Object.entries(result)) merged[id] = r;
    }
  }
  const workers = Math.min(BATCH_CONCURRENCY, chunks.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return merged;
}

/**
 * Many checks, chunked into ≤50-per-request batches run in parallel. Returns
 * { [id]: allowed }. An id counts as answered only when the server returns an
 * `allowed` boolean with no error; missing/errored ids (which happen under
 * concurrent load) are retried so a transient gap never masquerades as a denial.
 */
export async function batchCheck(
  items: BatchItem[],
): Promise<Record<string, boolean>> {
  if (items.length === 0) return {};
  const cfg = await loadFgaConfig();

  const out: Record<string, boolean> = {};
  let pending = items;
  for (
    let attempt = 0;
    attempt < MAX_BATCH_ATTEMPTS && pending.length > 0;
    attempt++
  ) {
    const merged = await batchCheckPass(pending, cfg);
    const stillPending: BatchItem[] = [];
    for (const it of pending) {
      const r = merged[it.id];
      if (r && r.error === undefined && typeof r.allowed === "boolean") {
        out[it.id] = r.allowed;
      } else {
        stillPending.push(it);
      }
    }
    pending = stillPending;
  }
  // Still unanswered after every retry: surface as denied (last resort).
  for (const it of pending) out[it.id] ??= false;
  return out;
}

/** List object ids of `type` the user has `relation` to. */
export async function listObjects(
  input: { user: string; relation: string; type: string; context?: FgaContext },
): Promise<string[]> {
  const cfg = await loadFgaConfig();
  const json = await api<{ objects?: string[] }>("/list-objects", {
    authorization_model_id: cfg.modelId,
    user: input.user,
    relation: input.relation,
    type: input.type,
    context: input.context,
  }, cfg);
  return json.objects ?? [];
}

/**
 * The inverse of listObjects: the users (of `userType`, default "user") that
 * have `relation` on `object`. Usersets are expanded to concrete users; a
 * public `user:*` grant comes back as the wildcard "user:*".
 */
export async function listUsers(
  input: { object: string; relation: string; userType?: string },
): Promise<string[]> {
  const cfg = await loadFgaConfig();
  const sep = input.object.indexOf(":");
  const object = {
    type: input.object.slice(0, sep),
    id: input.object.slice(sep + 1),
  };
  const json = await api<{
    users?: Array<{
      object?: { type: string; id: string };
      userset?: { type: string; id: string; relation: string };
      wildcard?: { type: string };
    }>;
  }>("/list-users", {
    authorization_model_id: cfg.modelId,
    object,
    relation: input.relation,
    user_filters: [{ type: input.userType ?? "user" }],
  }, cfg);
  return (json.users ?? []).map((u) =>
    u.object
      ? `${u.object.type}:${u.object.id}`
      : u.wildcard
      ? `${u.wildcard.type}:*`
      : u.userset
      ? `${u.userset.type}:${u.userset.id}#${u.userset.relation}`
      : "?"
  );
}

// ── Expand: the userset tree for an object#relation (the "rules graph") ──────
export interface ExpandLeaf {
  users?: { users?: string[] };
  computed?: { userset?: string };
  tupleToUserset?: { tupleset?: string; computed?: { userset?: string }[] };
}

export interface ExpandNode {
  name?: string;
  leaf?: ExpandLeaf;
  union?: { nodes?: ExpandNode[] };
  intersection?: { nodes?: ExpandNode[] };
  difference?: { base?: ExpandNode; subtract?: ExpandNode };
}

/** Returns the root userset-tree node for `object#relation` (no user, no conditions). */
export async function expand(
  relation: string,
  object: string,
): Promise<ExpandNode | undefined> {
  const cfg = await loadFgaConfig();
  const json = await api<{ tree?: { root?: ExpandNode } }>("/expand", {
    authorization_model_id: cfg.modelId,
    tuple_key: { relation, object },
  }, cfg);
  return json.tree?.root;
}
