import { useSignal } from "@preact/signals";

/** Inline editor for the guild Message of the Day. Save is enforced server-side. */
export default function MotdEditor({ initial }: { initial: string }) {
  const text = useSignal(initial);
  const editing = useSignal(false);
  const busy = useSignal(false);
  const error = useSignal<string | null>(null);

  async function save() {
    const body = text.value.trim();
    if (!body || busy.value) return;
    busy.value = true;
    error.value = null;
    const res = await fetch("/api/forum/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "setMotd", body }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    busy.value = false;
    if (json.ok) {
      location.reload();
      return;
    }
    error.value = json.message ?? "Could not save.";
  }

  if (!editing.value) {
    return (
      <div class="flex items-start justify-between gap-3">
        <p class="text-amber-100">{text.value}</p>
        <button
          type="button"
          onClick={() => (editing.value = true)}
          class="shrink-0 rounded-md border border-slate-600 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
        >
          ✎ Edit
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={text.value}
        disabled={busy.value}
        rows={2}
        onInput={(e) => (text.value = (e.target as HTMLTextAreaElement).value)}
        class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-amber-100 focus:border-amber-400/60 focus:outline-none"
      />
      <div class="mt-2 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy.value}
          class="rounded-md border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            text.value = initial;
            editing.value = false;
          }}
          class="rounded-md border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700/60"
        >
          Cancel
        </button>
      </div>
      {error.value && <p class="mt-2 text-xs text-rose-300">{error.value}</p>}
    </div>
  );
}
