import { useSignal } from "@preact/signals";

/** Message composer for a forum channel. Posting is enforced server-side. */
export default function ForumComposer({ channel }: { channel: string }) {
  const text = useSignal("");
  const busy = useSignal(false);
  const error = useSignal<string | null>(null);

  async function send() {
    const body = text.value.trim();
    if (!body || busy.value) return;
    busy.value = true;
    error.value = null;
    const res = await fetch("/api/forum/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "post", channel, body }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    busy.value = false;
    if (json.ok) {
      location.reload();
      return;
    }
    error.value = json.message ?? "Could not post.";
  }

  return (
    <div class="mt-3">
      <div class="flex gap-2">
        <input
          type="text"
          value={text.value}
          disabled={busy.value}
          placeholder="Write a message…"
          onInput={(e) => (text.value = (e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          class="flex-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-400/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy.value}
          class="rounded-lg border border-amber-400/50 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/25 disabled:opacity-50"
        >
          Post
        </button>
      </div>
      {error.value && <p class="mt-2 text-xs text-rose-300">{error.value}</p>}
    </div>
  );
}
