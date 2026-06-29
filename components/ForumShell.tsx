import type { ComponentChildren } from "preact";
import type { ForumState } from "@/utils.ts";

interface NavItem {
  key: string;
  href: string;
  label: string;
  emoji: string;
  show: boolean;
}

/**
 * The Guild Forum's app shell: a left side-nav that only lists the sections the
 * logged-in user can actually reach (gating resolved in routes/forum/_middleware
 * via live OpenFGA checks), plus the signed-in identity and a sign-out link.
 */
export function ForumShell(
  { forum, active, children, fill = false }: {
    forum: ForumState;
    active: string;
    children: ComponentChildren;
    /** Full-bleed, viewport-height main (no centered max-width) — used by the chat-style Channels view. */
    fill?: boolean;
  },
) {
  const { persona, nav } = forum;
  const items: NavItem[] = [
    {
      key: "home",
      href: "/forum",
      label: "Guild Hall",
      emoji: "🏰",
      show: nav.home,
    },
    {
      key: "bank",
      href: "/forum/bank",
      label: "Bank",
      emoji: "🏦",
      show: nav.bank,
    },
    {
      key: "raids",
      href: "/forum/raids",
      label: "Raids",
      emoji: "⚔️",
      show: nav.raids,
    },
    {
      key: "channels",
      href: "/forum/channels",
      label: "Channels",
      emoji: "💬",
      show: nav.channels,
    },
    {
      key: "inventory",
      href: "/forum/inventory",
      label: "Inventory",
      emoji: "🎒",
      show: nav.inventory,
    },
  ];
  const visible = items.filter((i) => i.show);

  return (
    <div class={`flex ${fill ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <aside class="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/70 p-4">
        <div class="flex items-center gap-2">
          <img
            src="/favicon.svg"
            width="28"
            height="28"
            alt=""
            class="h-7 w-7"
          />
          <div class="text-sm font-bold leading-tight text-amber-200">
            Ironforge<br />Guild Forum
          </div>
        </div>

        <div class="mt-4 rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-slate-500">
            Signed in as
          </div>
          <div class="mt-0.5 flex items-center gap-2">
            <span class="text-lg leading-none">{persona.emoji}</span>
            <div class="leading-tight">
              <div class="text-sm font-semibold text-slate-100">
                {persona.name}
              </div>
              <div class="text-[11px] text-slate-400">{persona.role}</div>
            </div>
          </div>
        </div>

        <nav class="mt-4 flex flex-col gap-1">
          {visible.map((i) => (
            <a
              key={i.key}
              href={i.href}
              class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                i.key === active
                  ? "bg-amber-400/15 text-amber-100"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>{i.emoji}</span>
              {i.label}
            </a>
          ))}
        </nav>

        <p class="mt-3 text-[11px] leading-snug text-slate-600">
          Only the sections you're allowed to reach appear here — each is a live
          OpenFGA check.
        </p>

        <div class="mt-auto flex flex-col gap-1 border-t border-slate-800 pt-3 text-xs">
          <a class="text-slate-400 hover:text-slate-200" href="/forum/logout">
            ↩ Sign out / switch user
          </a>
          <a
            class="text-slate-500 hover:text-slate-300"
            href="/"
            target="_blank"
          >
            ↗ Open the OpenFGA Explorer
          </a>
        </div>
      </aside>

      {fill
        ? <main class="flex min-w-0 flex-1 overflow-hidden">{children}</main>
        : (
          <main class="flex-1 overflow-x-hidden px-6 py-6">
            <div class="mx-auto max-w-4xl">{children}</div>
          </main>
        )}
    </div>
  );
}
