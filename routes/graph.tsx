import { define } from "@/utils.ts";
import TupleGraph from "@/islands/TupleGraph.tsx";

export default define.page(function Graph() {
  return (
    <div class="space-y-4">
      <section>
        <h1 class="text-xl font-bold text-amber-100">🕸️ Tuple Graph</h1>
        <p class="mt-1 text-sm text-slate-400">
          Every relationship tuple in the live store as one explorable
          node-graph, read straight from OpenFGA's <code>Read</code>{" "}
          API. Each node is an object or userset; each edge is a tuple, labelled
          by its relation. Drag nodes, scroll to zoom, drag the background to
          pan — dashed amber edges are conditional (ABAC) tuples, and bigger
          nodes are more-connected hubs.
        </p>
      </section>
      <TupleGraph />
    </div>
  );
});
