import { define } from "@/utils.ts";
import { readTuples } from "@/lib/fga.ts";

// Every tuple in the store, for the live Tuple Graph (node-graph) view.
export const handler = define.handlers({
  async GET() {
    try {
      const tuples = await readTuples();
      return Response.json({ tuples });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  },
});
