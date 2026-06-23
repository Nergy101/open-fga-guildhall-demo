import { page } from "fresh";
import { define } from "@/utils.ts";
import { batchCheck } from "@/lib/fga.ts";
import {
  abacContext,
  checkId,
  GROUPS,
  type Resource,
  RESOURCES,
} from "@/data/catalog.ts";
import { buildItems } from "@/lib/access.ts";
import { Badge } from "@/components/Badge.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const { persona, user } = ctx.state;
    const results = await batchCheck(buildItems(persona.id, user));
    const allowed = Object.values(results).filter(Boolean).length;
    return page({ results, allowed, total: Object.keys(results).length });
  },
});

interface CardProps {
  r: Resource;
  results: Record<string, boolean>;
  user: string;
  personaId: string;
}

/** Names the resource kind; Vault (amber) and Tab (violet) read distinctly. */
function TypePill({ type }: { type: string }) {
  if (type === "vault") {
    return (
      <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-500/30">
        Vault
      </span>
    );
  }
  if (type === "vault_tab") {
    return (
      <span class="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300 ring-1 ring-inset ring-violet-500/30">
        Tab
      </span>
    );
  }
  return null;
}

function ActionItems({ r, results, user, personaId }: CardProps) {
  return (
    <ul class="mt-3 space-y-2">
      {r.actions.map((a) => (
        <li key={a.key} class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm text-slate-200">{a.label}</div>
            <div class="truncate text-[11px] text-slate-500">
              <code>{a.relation}</code> — {a.concept}
            </div>
          </div>
          <Badge
            allowed={results[checkId(personaId, r.key, a.key)] ?? false}
            abac={!!a.abac}
            user={user}
            relation={a.relation}
            object={r.object}
            context={abacContext(a.abac)}
            concept={a.concept}
          />
        </li>
      ))}
    </ul>
  );
}

function ResourceCard({ r, results, user, personaId }: CardProps) {
  return (
    <section class="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div class="flex items-center gap-2">
        <span class="text-xl">{r.emoji}</span>
        <h3 class="font-semibold text-slate-100">{r.name}</h3>
        <TypePill type={r.type} />
      </div>
      <p class="mt-1 text-xs text-slate-400">{r.blurb}</p>
      <code class="mt-1 block text-[11px] text-slate-600">{r.object}</code>
      <ActionItems r={r} results={results} user={user} personaId={personaId} />
    </section>
  );
}

/** A vault rendered as a container with its tabs visually nested inside. */
function VaultPanel(
  { vault, tabs, results, user, personaId }: {
    vault: Resource;
    tabs: Resource[];
    results: Record<string, boolean>;
    user: string;
    personaId: string;
  },
) {
  return (
    <div class="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">{vault.emoji}</span>
            <h3 class="font-semibold text-slate-100">{vault.name}</h3>
            <TypePill type={vault.type} />
          </div>
          <p class="mt-1 text-xs text-slate-400">{vault.blurb}</p>
          <code class="mt-1 block text-[11px] text-slate-600">
            {vault.object}
          </code>
          <ActionItems
            r={vault}
            results={results}
            user={user}
            personaId={personaId}
          />
        </div>

        <div class="rounded-lg border border-l-2 border-slate-700/70 border-l-violet-500/50 bg-violet-500/5 p-3">
          <div class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
            <span aria-hidden="true">↳</span>
            {tabs.length} tab{tabs.length === 1 ? "" : "s"} inside this vault
          </div>
          <div class="mt-2 space-y-2">
            {tabs.length === 0
              ? <p class="text-[11px] text-slate-500">No tabs.</p>
              : tabs.map((t) => (
                <div
                  key={t.key}
                  class="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3"
                >
                  <div class="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <h4 class="text-sm font-semibold text-slate-200">
                      {t.name}
                    </h4>
                    <TypePill type={t.type} />
                  </div>
                  <code class="mt-0.5 block text-[10px] text-slate-600">
                    {t.object}
                  </code>
                  <ActionItems
                    r={t}
                    results={results}
                    user={user}
                    personaId={personaId}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default define.page<typeof handler>(function Dashboard({ data, state }) {
  const { results, allowed, total } = data;
  const persona = state.persona;
  const user = state.user;
  const personaId = persona.id;

  return (
    <div class="space-y-6">
      <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div class="flex items-start gap-4">
          <div class="text-4xl">{persona.emoji}</div>
          <div class="flex-1">
            <h1 class="text-xl font-bold text-amber-100">
              {persona.name} <span class="text-slate-500">·</span>{" "}
              <span class="text-base font-medium text-slate-300">
                {persona.role}
              </span>
            </h1>
            <p class="mt-1 text-sm text-slate-400">{persona.blurb}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center">
            <div class="text-2xl font-bold text-amber-200">
              {allowed}
              <span class="text-slate-500">/{total}</span>
            </div>
            <div class="text-[11px] uppercase tracking-wide text-slate-400">
              actions allowed
            </div>
          </div>
        </div>
      </section>

      <div class="space-y-8">
        {GROUPS.map((g) => {
          const cards = RESOURCES.filter((r) => g.types.includes(r.type));
          if (cards.length === 0) return null;

          return (
            <section key={g.key}>
              <div class="mb-3 border-b border-slate-800 pb-1.5">
                <h2 class="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
                  {g.title}
                </h2>
                <p class="text-xs text-slate-500">{g.subtitle}</p>
              </div>

              {g.key === "bank"
                ? (
                  <div class="space-y-4">
                    {cards.filter((r) => r.type === "vault").map((v) => (
                      <VaultPanel
                        key={v.key}
                        vault={v}
                        tabs={cards.filter(
                          (r) =>
                            r.type === "vault_tab" && r.parent === v.object,
                        )}
                        results={results}
                        user={user}
                        personaId={personaId}
                      />
                    ))}
                  </div>
                )
                : (
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map((r) => (
                      <ResourceCard
                        key={r.key}
                        r={r}
                        results={results}
                        user={user}
                        personaId={personaId}
                      />
                    ))}
                  </div>
                )}
            </section>
          );
        })}
      </div>

      <p class="text-center text-xs text-slate-500">
        <span class="text-amber-300">⏰ Allowed*/Denied*</span>{" "}
        = ABAC result under default context (250g withdrawal, current time).
        Tweak it live on the{" "}
        <a class="underline hover:text-slate-300" href="/explorer">
          Access Matrix
        </a>.
      </p>
    </div>
  );
});
