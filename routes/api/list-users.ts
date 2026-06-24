import { define } from "@/utils.ts";
import { listUsers } from "@/lib/fga.ts";

// Body: { object, relation, userType? } -> { users: string[] }
// "Who has <relation> on <object>?" — the inverse of list-objects.
export const handler = define.handlers({
  async POST(ctx) {
    let body: {
      object?: string;
      relation?: string;
      userType?: string;
      context?: Record<string, unknown>;
    };
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    if (!body.object || !body.relation) {
      return Response.json({ error: "object and relation are required" }, {
        status: 400,
      });
    }
    try {
      const users = await listUsers({
        object: body.object,
        relation: body.relation,
        userType: body.userType,
        context: body.context,
      });
      return Response.json({ users });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
