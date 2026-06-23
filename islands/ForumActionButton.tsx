import { useSignal } from "@preact/signals";

type Tone = "primary" | "neutral" | "danger";

const TONE: Record<Tone, string> = {
  primary:
    "border-amber-400/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25",
  neutral:
    "border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60",
  danger:
    "border-rose-500/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
};

/**
 * A button that performs a forum mutation via /api/forum/act. The server runs
 * the OpenFGA Check; on success we reload (to reflect new state) unless
 * `reload` is false, in which case the returned message is shown inline.
 */
export default function ForumActionButton(
  { kind, payload, label, tone = "neutral", reload = true, size = "sm" }: {
    kind: string;
    payload?: Record<string, unknown>;
    label: string;
    tone?: Tone;
    reload?: boolean;
    size?: "sm" | "xs";
  },
) {
  const busy = useSignal(false);
  const msg = useSignal<{ ok: boolean; text: string } | null>(null);

  async function go() {
    if (busy.value) return;
    busy.value = true;
    msg.value = null;
    const res = await fetch("/api/forum/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, ...(payload ?? {}) }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    busy.value = false;
    if (json.ok && reload) {
      location.reload();
      return;
    }
    msg.value = {
      ok: !!json.ok,
      text: json.message ?? (json.ok ? "Done." : "Failed."),
    };
  }

  const pad = size === "xs" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <span class="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={go}
        disabled={busy.value}
        class={`rounded-md border font-semibold transition-colors disabled:opacity-50 ${pad} ${
          TONE[tone]
        }`}
      >
        {busy.value ? "…" : label}
      </button>
      {msg.value && (
        <span
          class={`text-[11px] ${
            msg.value.ok ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {msg.value.text}
        </span>
      )}
    </span>
  );
}
