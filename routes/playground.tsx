import { define } from "@/utils.ts";
import Playground from "@/islands/Playground.tsx";

export default define.page(function PlaygroundPage() {
  return (
    <div class="space-y-6">
      <section>
        <h1 class="text-xl font-bold text-amber-100">Playground</h1>
        <p class="mt-1 text-sm text-slate-400">
          Run arbitrary <code>Check</code> and <code>ListObjects</code>{" "}
          calls against the live store. Edit the fields or click an example.
          This is the same API the dashboard uses.
        </p>
      </section>
      <Playground />
    </div>
  );
});
