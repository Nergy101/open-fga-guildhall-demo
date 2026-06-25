import { useSignal } from "@preact/signals";

/**
 * Discord-style message bar for a forum channel, pinned to the bottom of the
 * chat window. Posting is enforced server-side; on success we reload so the new
 * message (and any freshly-allowed actions) render.
 */
export default function ForumComposer(
  { channel, name }: { channel: string; name?: string },
) {
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
    <div>
      <div class="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-700/25 px-3 py-1.5 transition-colors focus-within:border-amber-400/50">
        <span class="select-none text-lg leading-none text-slate-500">＋</span>
        <input
          type="text"
          value={text.value}
          disabled={busy.value}
          placeholder={name ? `Message #${name}` : "Write a message…"}
          onInput={(e) => (text.value = (e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          class="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy.value || !text.value.trim()}
          class="shrink-0 rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/25 disabled:opacity-40"
        >
          {busy.value ? "…" : "Send"}
        </button>
      </div>
      {error.value && (
        <p class="mt-1 px-1 text-xs text-rose-300">{error.value}</p>
      )}
    </div>
  );
}
