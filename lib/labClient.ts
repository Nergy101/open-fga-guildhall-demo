/**
 * Browser-side fetch helpers shared by the explorer "lab" islands.
 * These talk to the app's own /api routes (never OpenFGA directly), so they are
 * safe to import from islands. Server-side code uses lib/fga.ts instead.
 */

export type Results = Record<string, boolean>;

export interface TupleKey {
  user: string;
  relation: string;
  object: string;
}

export interface CheckRequest {
  /** Correlation id, must match ^[\w-]{1,36}$ and be unique within the batch. */
  id: string;
  user: string;
  relation: string;
  object: string;
  /** ABAC condition context, e.g. { requested_amount: 250 }. */
  context?: Record<string, unknown>;
  /** Hypothetical tuples evaluated only for this request (no store mutation). */
  contextualTuples?: TupleKey[];
}

/** POST /api/check — returns { [id]: allowed } for a batch of checks. */
export async function runChecks(checks: CheckRequest[]): Promise<Results> {
  const res = await fetch("/api/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ checks }),
  });
  const json = await res.json();
  return (json.results ?? {}) as Results;
}

/** POST /api/list-objects — object ids of `type` the user has `relation` to. */
export async function runListObjects(
  input: { user: string; relation: string; type: string },
): Promise<string[]> {
  const res = await fetch("/api/list-objects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  return (json.objects ?? []) as string[];
}
