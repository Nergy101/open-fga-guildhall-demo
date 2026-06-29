import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { CHANNEL_SCOPES, RESOURCES } from "@/data/catalog.ts";
import { getPersona } from "@/data/personas.ts";
import { getMessages } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import ForumComposer from "@/islands/ForumComposer.tsx";
import ForumActionButton from "@/islands/ForumActionButton.tsx";

interface MsgView {
  id: string;
  authorId: string;
  emoji: string;
  name: string;
  body: string;
  time: string;
}
interface ChannelView {
  object: string;
  name: string;
  slug: string;
  emoji: string;
  blurb: string;
  canPost: boolean;
  canModerate: boolean;
  messages: MsgView[];
}
interface ScopeView {
  key: string;
  title: string;
  subtitle: string;
  channels: ChannelView[];
}

/** "War Council" -> "war-council" — the Discord-style channel handle. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const handler = define.handlers({
  async GET(ctx) {
    const forum = ctx.state.forum;
    if (!forum) {
      return new Response(null, { status: 303, headers: { location: "/try" } });
    }
    const user = forum.user;
    const channels = RESOURCES.filter((r) => r.type === "channel");

    const r = await batchCheck(
      channels.flatMap((c) => [
        { id: `${c.key}_read`, user, relation: "can_read", object: c.object },
        { id: `${c.key}_post`, user, relation: "can_post", object: c.object },
        {
          id: `${c.key}_mod`,
          user,
          relation: "can_moderate",
          object: c.object,
        },
      ]),
    );

    const views: ChannelView[] = channels
      .filter((c) => r[`${c.key}_read`])
      .map((c) => {
        const name = c.name.replace(/^Channel:\s*/, "");
        return {
          object: c.object,
          name,
          slug: slugify(name),
          emoji: c.emoji,
          blurb: c.blurb,
          canPost: r[`${c.key}_post`],
          canModerate: r[`${c.key}_mod`],
          messages: getMessages(c.object).map((m) => {
            const authorId = m.author.replace(/^user:/, "");
            const p = getPersona(authorId);
            return {
              id: m.id,
              authorId,
              emoji: p.emoji,
              name: p.name,
              body: m.body,
              time: new Date(m.ts).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          }),
        };
      });

    // Group readable channels under their scope (the Discord "categories"),
    // dropping any scope the persona can't see a single channel in.
    const byObject = new Map(views.map((v) => [v.object, v]));
    const scopes: ScopeView[] = CHANNEL_SCOPES
      .map((s) => ({
        key: s.key,
        title: s.title,
        subtitle: s.subtitle,
        channels: s.objects
          .map((o) => byObject.get(o))
          .filter((c): c is ChannelView => !!c),
      }))
      .filter((s) => s.channels.length > 0);

    const want = new URL(ctx.req.url).searchParams.get("c");
    const active = (want && byObject.get(want)) || views[0] || null;

    return page({ scopes, activeObject: active?.object ?? null });
  },
});

/** One message line — Discord groups consecutive posts by the same author. */
function Message(
  { m, cont, channel, canModerate, isMe }: {
    m: MsgView;
    cont: boolean;
    channel: string;
    canModerate: boolean;
    isMe: boolean;
  },
) {
  return (
    <div
      class={`group relative flex gap-3 rounded border-l-2 px-2 hover:bg-slate-800/40 ${
        cont ? "py-0.5" : "mt-4 py-0.5"
      } ${isMe ? "border-amber-400/70 bg-amber-400/5" : "border-transparent"}`}
    >
      <div class="w-10 shrink-0">
        {cont
          ? (
            <span class="hidden pt-1 text-right text-[10px] leading-5 text-slate-600 group-hover:block">
              {m.time}
            </span>
          )
          : (
            <span
              class={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/70 text-xl ${
                isMe ? "ring-2 ring-amber-400/70" : ""
              }`}
            >
              {m.emoji}
            </span>
          )}
      </div>
      <div class="min-w-0 flex-1">
        {!cont && (
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-semibold text-amber-100">{m.name}</span>
            {isMe && (
              <span class="rounded bg-amber-400/20 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                you
              </span>
            )}
            <span class="text-[10px] text-slate-500">{m.time}</span>
          </div>
        )}
        <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
          {m.body}
        </p>
      </div>
      {canModerate && (
        <div class="absolute -top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <ForumActionButton
            kind="deleteMessage"
            payload={{ channel, messageId: m.id }}
            label="Remove"
            tone="danger"
            size="xs"
          />
        </div>
      )}
    </div>
  );
}

export default define.page<typeof handler>(function Channels({ data, state }) {
  const { scopes, activeObject } = data;
  const active = scopes.flatMap((s) =>
    s.channels
  ).find((c) => c.object === activeObject) ?? null;
  const me = state.forum!.persona;

  return (
    <ForumShell forum={state.forum!} active="channels" fill>
      {/* Channel list — Discord's category-grouped left rail. */}
      <nav class="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
        <div class="shrink-0 border-b border-slate-800 px-4 py-3">
          <div class="text-sm font-bold text-amber-100">💬 Channels</div>
          <div class="mt-0.5 text-[11px] leading-snug text-slate-500">
            Only boards you may read appear — each is a live OpenFGA check.
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-3">
          {scopes.map((s) => (
            <details key={s.key} open class="group mb-3">
              <summary class="flex cursor-pointer select-none items-center gap-1 px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300 [&::-webkit-details-marker]:hidden">
                <span class="inline-block w-3 text-[9px] transition-transform group-open:rotate-90">
                  ▶
                </span>
                <span class="truncate" title={s.subtitle}>{s.title}</span>
              </summary>
              <div class="mt-0.5 space-y-0.5">
                {s.channels.map((ch) => {
                  const isActive = ch.object === activeObject;
                  return (
                    <a
                      key={ch.object}
                      href={`?c=${encodeURIComponent(ch.object)}`}
                      aria-current={isActive ? "page" : undefined}
                      class={`flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
                        isActive
                          ? "bg-slate-700/60 text-slate-100"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span
                        class={`text-base leading-none ${
                          isActive ? "text-amber-300" : "text-slate-600"
                        }`}
                      >
                        #
                      </span>
                      <span class="truncate">{ch.slug}</span>
                      {!ch.canPost && (
                        <span
                          class="ml-auto text-[10px] text-slate-600"
                          title="Read-only for you"
                        >
                          🔒
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </nav>

      {/* Chat window — fills the rest, composer pinned to the bottom. */}
      {active
        ? (
          <section class="flex min-w-0 flex-1 flex-col">
            <header class="z-10 flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900/30 px-4 py-3 shadow-sm">
              <span class="text-lg leading-none text-slate-500">#</span>
              <span class="shrink-0 text-lg leading-none">{active.emoji}</span>
              <h1 class="shrink-0 whitespace-nowrap font-semibold text-slate-100">
                {active.slug}
              </h1>
              {active.canModerate && (
                <span class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                  Moderator
                </span>
              )}
              <span class="ml-3 hidden min-w-0 truncate border-l border-slate-700 pl-3 text-xs text-slate-500 lg:block">
                {active.blurb}
              </span>
            </header>

            <div class="flex-1 overflow-y-auto px-4 pb-4">
              {active.messages.length === 0
                ? (
                  <div class="flex h-full flex-col items-center justify-center text-center">
                    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-3xl">
                      {active.emoji}
                    </span>
                    <p class="mt-3 text-base font-semibold text-slate-200">
                      Welcome to #{active.slug}
                    </p>
                    <p class="mt-1 max-w-sm text-xs text-slate-500">
                      {active.blurb}
                    </p>
                  </div>
                )
                : (
                  <div class="py-2">
                    {active.messages.map((m, i) => (
                      <Message
                        key={m.id}
                        m={m}
                        cont={i > 0 &&
                          active.messages[i - 1].authorId === m.authorId}
                        channel={active.object}
                        canModerate={active.canModerate}
                        isMe={m.authorId === me.id}
                      />
                    ))}
                  </div>
                )}
            </div>

            <div class="shrink-0 px-4 pb-5">
              {active.canPost
                ? (
                  <>
                    <div class="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
                      <span>Posting as</span>
                      <span class="text-sm leading-none">{me.emoji}</span>
                      <span class="font-semibold text-amber-200">
                        {me.name}
                      </span>
                      <span class="text-slate-600">· {me.role}</span>
                    </div>
                    <ForumComposer channel={active.object} name={active.slug} />
                  </>
                )
                : (
                  <div class="rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-xs text-slate-500">
                    🔒 You can read{" "}
                    <span class="text-slate-400">#{active.slug}</span>{" "}
                    but not post here — posting is gated server-side by OpenFGA.
                  </div>
                )}
            </div>
          </section>
        )
        : (
          <section class="flex min-w-0 flex-1 items-center justify-center text-sm text-slate-500">
            No channels you can read.
          </section>
        )}
    </ForumShell>
  );
});
