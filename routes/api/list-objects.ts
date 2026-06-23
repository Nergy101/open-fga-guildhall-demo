import { define } from "@/utils.ts";
import { listObjects } from "@/lib/fga.ts";

// Body: { user, relation, type, context? } -> { objects: string[] }
export const handler = define.handlers({
  async POST(ctx) {
    let body: {
      user?: string;
      relation?: string;
      type?: string;
      context?: Record<string, unknown>;
    };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    if (!body.user || !body.relation || !body.type) {
      return Response.json({ error: "user, relation and type are required" }, {
        status: 400,
      });
    }
    try {
      const objects = await listObjects({
        user: body.user,
        relation: body.relation,
        type: body.type,
        context: body.context,
      });
      return Response.json({ objects });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
