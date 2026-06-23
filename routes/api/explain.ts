import { define } from "@/utils.ts";
import { buildExplanation } from "@/lib/explain.ts";

// Body: { user, relation, object, context? } -> ExplainResult
export const handler = define.handlers({
  async POST(ctx) {
    let body: {
      user?: string;
      relation?: string;
      object?: string;
      context?: Record<string, unknown>;
    };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    if (!body.user || !body.relation || !body.object) {
      return Response.json(
        { error: "user, relation and object are required" },
        { status: 400 },
      );
    }
    try {
      const result = await buildExplanation({
        user: body.user,
        relation: body.relation,
        object: body.object,
        context: body.context,
      });
      return Response.json(result);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
