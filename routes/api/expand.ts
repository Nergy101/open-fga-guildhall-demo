import { define } from "@/utils.ts";
import { expandOutline } from "@/lib/explain.ts";

// Body: { relation, object } -> { outline: string[] }
// The Expand userset tree (rules graph) for object#relation — no user involved.
export const handler = define.handlers({
  async POST(ctx) {
    let body: { relation?: string; object?: string };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    if (!body.relation || !body.object) {
      return Response.json({ error: "relation and object are required" }, {
        status: 400,
      });
    }
    try {
      const outline = await expandOutline(body.relation, body.object);
      return Response.json({ outline });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
