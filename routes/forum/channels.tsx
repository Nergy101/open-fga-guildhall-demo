import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import { RESOURCES } from "@/data/catalog.ts";
import { getPersona } from "@/data/personas.ts";
import { getMessages } from "@/lib/forumState.ts";
import { ForumShell } from "@/components/ForumShell.tsx";
import ForumComposer from "@/islands/ForumComposer.tsx";
import ForumActionButton from "@/islands/ForumActionButton.tsx";

interface MsgView {
  id: string;
  emoji: string;
  name: string;
  body: string;
  time: string;
}
interface ChannelView {
  object: string;
  name: string;
  emoji: string;
  blurb: string;
  canPost: boolean;
  canModerate: boolean;
  messages: MsgView[];
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
      .map((c) => ({
        object: c.object,
        name: c.name.replace(/^Channel:\s*/, ""),
        emoji: c.emoji,
        blurb: c.blurb,
        canPost: r[`${c.key}_post`],
        canModerate: r[`${c.key}_mod`],
        messages: getMessages(c.object).map((m) => {
          const p = getPersona(m.author.replace(/^user:/, ""));
          return {
            id: m.id,
            emoji: p.emoji,
            name: p.name,
            body: m.body,
            time: new Date(m.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }),
      }));

    return page({ views });
  },
});

export default define.page<typeof handler>(function Channels({ data, state }) {
  const { views } = data;
  return (
    <ForumShell forum={state.forum!} active="channels">
      <h1 class="text-xl font-bold text-amber-100">💬 Channels</h1>
      <p class="mt-1 text-sm text-slate-400">
        Message boards you're allowed to read. Posting and moderating are gated
        per channel — and enforced on the server.
      </p>

      <div class="mt-5 space-y-5">
        {views.map((c) => (
          <section
            key={c.object}
            class="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">{c.emoji}</span>
              <h2 class="font-semibold text-slate-100">{c.name}</h2>
              {c.canModerate && (
                <span class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                  Moderator
                </span>
              )}
            </div>
            <p class="text-[11px] text-slate-500">{c.blurb}</p>

            <ul class="mt-3 space-y-2">
              {c.messages.length === 0
                ? <li class="text-xs text-slate-600">No messages yet.</li>
                : c.messages.map((m) => (
                  <li
                    key={m.id}
                    class="flex items-start gap-2 rounded-lg border border-slate-800/70 bg-slate-800/30 px-3 py-2"
                  >
                    <span class="mt-0.5">{m.emoji}</span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-baseline gap-2">
                        <span class="text-sm font-semibold text-slate-200">
                          {m.name}
                        </span>
                        <span class="text-[10px] text-slate-600">{m.time}</span>
                      </div>
                      <p class="text-sm text-slate-300">{m.body}</p>
                    </div>
                    {c.canModerate && (
                      <ForumActionButton
                        kind="deleteMessage"
                        payload={{ channel: c.object, messageId: m.id }}
                        label="Remove"
                        tone="danger"
                        size="xs"
                      />
                    )}
                  </li>
                ))}
            </ul>

            {c.canPost
              ? <ForumComposer channel={c.object} />
              : (
                <p class="mt-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2 text-xs text-slate-500">
                  🔒 You can read this board but not post to it.
                </p>
              )}
          </section>
        ))}
      </div>
    </ForumShell>
  );
});
