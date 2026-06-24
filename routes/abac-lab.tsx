import { define } from "@/utils.ts";
import AbacControls from "@/islands/AbacControls.tsx";

export default define.page(function AbacLab() {
  return (
    <div class="space-y-6">
      <section>
        <h1 class="text-xl font-bold text-amber-100">⚙️ ABAC Lab</h1>
        <p class="mt-1 text-sm text-slate-400">
          Attribute-based conditions are evaluated at check time. Move the
          withdrawal slider / change the signup window and watch each persona's
          result flip — every badge is a live <code>Check</code>{" "}
          with the context shown. Click a badge to see why.
        </p>
      </section>
      <AbacControls />
    </div>
  );
});
