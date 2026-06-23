import { define } from "@/utils.ts";
import { batchCheck, type BatchItem } from "@/lib/fga.ts";

// Runs a batch of checks. Used by the ABAC Lab and Playground islands.
// Body: { checks: [{ id, user, relation, object, context? }] } -> { results: { id: allowed } }
export const handler = define.handlers({
  async POST(ctx) {
    let body: { checks?: BatchItem[] };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    const checks = body.checks;
    if (!Array.isArray(checks) || checks.length === 0 || checks.length > 200) {
      return Response.json({ error: "checks must be a 1..200 item array" }, {
        status: 400,
      });
    }
    try {
      const results = await batchCheck(checks);
      return Response.json({ results });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
