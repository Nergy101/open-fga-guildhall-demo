import type { BatchItem } from "@/lib/fga.ts";
import { abacContext, checkId, RESOURCES } from "@/data/catalog.ts";

/**
 * Builds one BatchCheck item per (resource, action) for a persona. ABAC actions
 * get default condition context unless overridden via `opts`.
 * Shared by the dashboard, the access matrix, and the tests.
 */
export function buildItems(
  personaId: string,
  user: string,
  opts?: { currentTime?: string; amount?: number },
): BatchItem[] {
  const items: BatchItem[] = [];
  for (const r of RESOURCES) {
    for (const a of r.actions) {
      items.push({
        id: checkId(personaId, r.key, a.key),
        user,
        relation: a.relation,
        object: r.object,
        context: abacContext(a.abac, opts),
      });
    }
  }
  return items;
}
