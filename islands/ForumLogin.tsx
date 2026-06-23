import { PERSONAS } from "@/data/personas.ts";
import { useSignal } from "@preact/signals";

/**
 * Login selection for the Guild Forum. Picking a persona sets the forum's
 * session cookie, then opens the forum in a new tab — logged in as that user.
 */
export default function ForumLogin() {
  const busy = useSignal<string | null>(null);
  const last = useSignal<string | null>(null);

  async function login(id: string) {
    if (busy.value) return;
    busy.value = id;
    // Open the tab synchronously (inside the click) so it isn't popup-blocked,
    // then point it at /forum once the session cookie is set.
    const tab = globalThis.open("about:blank", "_blank");
    try {
      await fetch("/api/forum/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona: id }),
      });
      if (tab) tab.location.href = "/forum";
      else globalThis.location.href = "/forum"; // popup blocked → same tab
      last.value = id;
    } finally {
      busy.value = null;
    }
  }

  return (
    <div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PERSONAS.map((p) => (
          <button
            type="button"
            key={p.id}
            disabled={busy.value !== null}
            onClick={() => login(p.id)}
            class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-left transition-colors hover:border-amber-400/60 hover:bg-slate-700/60 disabled:opacity-50"
          >
            <span class="text-2xl leading-none">{p.emoji}</span>
            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-slate-100">{p.name}</span>
              <span class="block text-[11px] uppercase tracking-wide text-amber-300/80">
                {p.role}
              </span>
              <span class="mt-0.5 block truncate text-xs text-slate-400">
                {p.blurb}
              </span>
            </span>
            <span class="shrink-0 text-sm text-amber-300">
              {busy.value === p.id ? "…" : "Sign in →"}
            </span>
          </button>
        ))}
      </div>
      {last.value && (
        <p class="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
          Opened the forum in a new tab. Sign in as a different persona to open
          another tab and compare side by side.
        </p>
      )}
    </div>
  );
}
