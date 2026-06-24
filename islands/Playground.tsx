import { useSignal } from "@preact/signals";
import { Badge } from "@/components/Badge.tsx";

const CHECK_EXAMPLES: {
  label: string;
  user: string;
  relation: string;
  object: string;
  context: string;
}[] = [
  {
    label: "Arthas withdraws 900g (over limit)",
    user: "user:arthas",
    relation: "can_withdraw",
    object: "vault:ironforge_bank",
    context: '{ "requested_amount": 900 }',
  },
  {
    label: "Arthas withdraws 250g",
    user: "user:arthas",
    relation: "can_withdraw",
    object: "vault:ironforge_bank",
    context: '{ "requested_amount": 250 }',
  },
  {
    label: "Rexxar (recruit) signs up",
    user: "user:rexxar",
    relation: "can_signup",
    object: "raid:molten_core",
    context: '{ "current_time": "2026-07-01T00:00:00Z" }',
  },
  {
    label: "Gul'dan (banned) reads guild",
    user: "user:guldan",
    relation: "can_read",
    object: "guild:ironforge",
    context: "",
  },
  {
    label: "Medivh reads Pact hall",
    user: "user:medivh",
    relation: "can_read",
    object: "channel:pact_hall",
    context: "",
  },
  {
    label: "Medivh reads his own guild's channel",
    user: "user:medivh",
    relation: "can_read",
    object: "channel:orgrimmar_hall",
    context: "",
  },
  {
    label: "Jaina disbands guild",
    user: "user:jaina",
    relation: "can_disband",
    object: "guild:ironforge",
    context: "",
  },
];

const LIST_EXAMPLES: {
  label: string;
  user: string;
  relation: string;
  type: string;
}[] = [
  {
    label: "Channels Arthas can read",
    user: "user:arthas",
    relation: "can_read",
    type: "channel",
  },
  {
    label: "Channels a guest can read",
    user: "user:guest",
    relation: "can_read",
    type: "channel",
  },
  {
    label: "Channels Medivh can read",
    user: "user:medivh",
    relation: "can_read",
    type: "channel",
  },
];

const LISTUSERS_EXAMPLES: {
  label: string;
  object: string;
  relation: string;
}[] = [
  {
    label: "Who can read the War Council?",
    object: "channel:war_council",
    relation: "can_read",
  },
  {
    label: "Who can withdraw the bank?",
    object: "vault:ironforge_bank",
    relation: "can_withdraw",
  },
  {
    label: "Who can read the Tavern (public)?",
    object: "channel:tavern_board",
    relation: "can_read",
  },
  {
    label: "Who can disband Ironforge?",
    object: "guild:ironforge",
    relation: "can_disband",
  },
];

const EXPAND_EXAMPLES: { label: string; object: string; relation: string }[] = [
  {
    label: "member (but not banned)",
    object: "guild:ironforge",
    relation: "member",
  },
  { label: "loot (intersection)", object: "raid:onyxia", relation: "can_loot" },
  {
    label: "view (guild OR alliance)",
    object: "raid:onyxia",
    relation: "can_view",
  },
  {
    label: "withdraw (ABAC + officer)",
    object: "vault:ironforge_bank",
    relation: "can_withdraw",
  },
];

const WHATIF_EXAMPLES: {
  label: string;
  user: string;
  relation: string;
  object: string;
  context: string;
  tuples: string;
}[] = [
  {
    label: "Promote Rexxar to officer → can kick?",
    user: "user:rexxar",
    relation: "can_kick",
    object: "guild:ironforge",
    context: "",
    tuples:
      '[{ "user": "user:rexxar", "relation": "officer", "object": "guild:ironforge" }]',
  },
  {
    label: "Ban Arthas → still read guild?",
    user: "user:arthas",
    relation: "can_read",
    object: "guild:ironforge",
    context: "",
    tuples:
      '[{ "user": "user:arthas", "relation": "banned", "object": "guild:ironforge" }]',
  },
  {
    label: "Make Guest an Orgrimmar recruit → view shared raid?",
    user: "user:guest",
    relation: "can_view",
    object: "raid:onyxia",
    context: "",
    tuples:
      '[{ "user": "user:guest", "relation": "recruit", "object": "guild:orgrimmar" }]',
  },
];

function Field(
  { label, value, onInput }: {
    label: string;
    value: string;
    onInput: (v: string) => void;
  },
) {
  return (
    <label class="block">
      <span class="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
      />
    </label>
  );
}

export default function Playground() {
  // Check state
  const user = useSignal("user:arthas");
  const relation = useSignal("can_withdraw");
  const object = useSignal("vault:ironforge_bank");
  const contextText = useSignal('{ "requested_amount": 900 }');
  const checkResult = useSignal<{ allowed?: boolean; error?: string } | null>(
    null,
  );
  const checking = useSignal(false);

  // ListObjects state
  const lUser = useSignal("user:arthas");
  const lRelation = useSignal("can_read");
  const lType = useSignal("channel");
  const listResult = useSignal<{ objects?: string[]; error?: string } | null>(
    null,
  );
  const listing = useSignal(false);

  // ListUsers state
  const uObject = useSignal("channel:war_council");
  const uRelation = useSignal("can_read");
  const usersResult = useSignal<{ users?: string[]; error?: string } | null>(
    null,
  );
  const listingUsers = useSignal(false);

  // Expand state
  const xObject = useSignal("raid:onyxia");
  const xRelation = useSignal("can_loot");
  const expandResult = useSignal<{ outline?: string[]; error?: string } | null>(
    null,
  );
  const expanding = useSignal(false);

  // What-if state
  const wUser = useSignal("user:rexxar");
  const wRelation = useSignal("can_kick");
  const wObject = useSignal("guild:ironforge");
  const wContext = useSignal("");
  const wTuples = useSignal(
    '[{ "user": "user:rexxar", "relation": "officer", "object": "guild:ironforge" }]',
  );
  const whatifResult = useSignal<{ allowed?: boolean; error?: string } | null>(
    null,
  );
  const whatifing = useSignal(false);

  async function runCheck() {
    checking.value = true;
    checkResult.value = null;
    let context: Record<string, unknown> | undefined;
    const raw = contextText.value.trim();
    if (raw) {
      try {
        context = JSON.parse(raw);
      } catch {
        checkResult.value = { error: "context is not valid JSON" };
        checking.value = false;
        return;
      }
    }
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checks: [{
            id: "q",
            user: user.value,
            relation: relation.value,
            object: object.value,
            context,
          }],
        }),
      });
      const json = await res.json();
      checkResult.value = json.error
        ? { error: json.error }
        : { allowed: json.results?.q === true };
    } catch (err) {
      checkResult.value = { error: String(err) };
    }
    checking.value = false;
  }

  async function runList() {
    listing.value = true;
    listResult.value = null;
    try {
      const res = await fetch("/api/list-objects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user: lUser.value,
          relation: lRelation.value,
          type: lType.value,
        }),
      });
      listResult.value = await res.json();
    } catch (err) {
      listResult.value = { error: String(err) };
    }
    listing.value = false;
  }

  async function runListUsers() {
    listingUsers.value = true;
    usersResult.value = null;
    try {
      const res = await fetch("/api/list-users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          object: uObject.value,
          relation: uRelation.value,
        }),
      });
      usersResult.value = await res.json();
    } catch (err) {
      usersResult.value = { error: String(err) };
    }
    listingUsers.value = false;
  }

  async function runExpand() {
    expanding.value = true;
    expandResult.value = null;
    try {
      const res = await fetch("/api/expand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          object: xObject.value,
          relation: xRelation.value,
        }),
      });
      expandResult.value = await res.json();
    } catch (err) {
      expandResult.value = { error: String(err) };
    }
    expanding.value = false;
  }

  async function runWhatIf() {
    whatifing.value = true;
    whatifResult.value = null;
    let context: Record<string, unknown> | undefined;
    let contextualTuples:
      | { user: string; relation: string; object: string }[]
      | undefined;
    try {
      if (wContext.value.trim()) context = JSON.parse(wContext.value);
      if (wTuples.value.trim()) contextualTuples = JSON.parse(wTuples.value);
    } catch {
      whatifResult.value = { error: "context or tuples is not valid JSON" };
      whatifing.value = false;
      return;
    }
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checks: [{
            id: "q",
            user: wUser.value,
            relation: wRelation.value,
            object: wObject.value,
            context,
            contextualTuples,
          }],
        }),
      });
      const json = await res.json();
      whatifResult.value = json.error
        ? { error: json.error }
        : { allowed: json.results?.q === true };
    } catch (err) {
      whatifResult.value = { error: String(err) };
    }
    whatifing.value = false;
  }

  return (
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Check */}
      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 class="font-semibold text-amber-100">Check</h2>
        <p class="mt-1 text-xs text-slate-400">
          "Does <em>user</em> have <em>relation</em> on <em>object</em>?"
        </p>

        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field
            label="user"
            value={user.value}
            onInput={(v) => (user.value = v)}
          />
          <Field
            label="relation"
            value={relation.value}
            onInput={(v) => (relation.value = v)}
          />
          <Field
            label="object"
            value={object.value}
            onInput={(v) => (object.value = v)}
          />
        </div>
        <label class="mt-2 block">
          <span class="text-[11px] uppercase tracking-wide text-slate-500">
            context (JSON, optional)
          </span>
          <textarea
            value={contextText.value}
            onInput={(
              e,
            ) => (contextText.value = (e.target as HTMLTextAreaElement).value)}
            rows={2}
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
          />
        </label>

        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runCheck}
            disabled={checking.value}
            class="rounded-md bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {checking.value ? "Checking…" : "Run Check"}
          </button>
          {checkResult.value?.error
            ? (
              <span class="text-sm text-rose-400">
                {checkResult.value.error}
              </span>
            )
            : checkResult.value
            ? <Badge allowed={checkResult.value.allowed === true} />
            : null}
        </div>

        <div class="mt-3">
          <div class="text-[11px] uppercase tracking-wide text-slate-500">
            examples
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {CHECK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  user.value = ex.user;
                  relation.value = ex.relation;
                  object.value = ex.object;
                  contextText.value = ex.context;
                  checkResult.value = null;
                }}
                class="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ListObjects */}
      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 class="font-semibold text-amber-100">List Objects</h2>
        <p class="mt-1 text-xs text-slate-400">
          "Which <em>objects</em> of a type does <em>user</em> have{" "}
          <em>relation</em> to?"
        </p>

        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field
            label="user"
            value={lUser.value}
            onInput={(v) => (lUser.value = v)}
          />
          <Field
            label="relation"
            value={lRelation.value}
            onInput={(v) => (lRelation.value = v)}
          />
          <Field
            label="type"
            value={lType.value}
            onInput={(v) => (lType.value = v)}
          />
        </div>

        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runList}
            disabled={listing.value}
            class="rounded-md bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {listing.value ? "Listing…" : "Run List"}
          </button>
        </div>

        {listResult.value?.error
          ? <p class="mt-3 text-sm text-rose-400">{listResult.value.error}</p>
          : listResult.value
          ? (
            <ul class="mt-3 space-y-1">
              {(listResult.value.objects ?? []).length === 0
                ? <li class="text-sm text-slate-500">— none —</li>
                : listResult.value.objects!.map((o) => (
                  <li
                    key={o}
                    class="rounded bg-slate-800/50 px-2 py-1 font-mono text-xs text-emerald-300"
                  >
                    {o}
                  </li>
                ))}
            </ul>
          )
          : null}

        <div class="mt-3">
          <div class="text-[11px] uppercase tracking-wide text-slate-500">
            examples
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {LIST_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  lUser.value = ex.user;
                  lRelation.value = ex.relation;
                  lType.value = ex.type;
                  listResult.value = null;
                }}
                class="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ListUsers */}
      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 class="font-semibold text-amber-100">List Users</h2>
        <p class="mt-1 text-xs text-slate-400">
          "Who has <em>relation</em> on{" "}
          <em>object</em>?" — the inverse of List Objects (usersets expanded to
          people).
        </p>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field
            label="object"
            value={uObject.value}
            onInput={(v) => (uObject.value = v)}
          />
          <Field
            label="relation"
            value={uRelation.value}
            onInput={(v) => (uRelation.value = v)}
          />
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runListUsers}
            disabled={listingUsers.value}
            class="rounded-md bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {listingUsers.value ? "Listing…" : "Run List Users"}
          </button>
        </div>
        {usersResult.value?.error
          ? <p class="mt-3 text-sm text-rose-400">{usersResult.value.error}</p>
          : usersResult.value
          ? (
            <ul class="mt-3 space-y-1">
              {(usersResult.value.users ?? []).length === 0
                ? <li class="text-sm text-slate-500">— none —</li>
                : usersResult.value.users!.map((u) => (
                  <li
                    key={u}
                    class="rounded bg-slate-800/50 px-2 py-1 font-mono text-xs text-emerald-300"
                  >
                    {u}
                  </li>
                ))}
            </ul>
          )
          : null}
        <div class="mt-3">
          <div class="text-[11px] uppercase tracking-wide text-slate-500">
            examples
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {LISTUSERS_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  uObject.value = ex.object;
                  uRelation.value = ex.relation;
                  usersResult.value = null;
                }}
                class="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Expand */}
      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 class="font-semibold text-amber-100">Expand</h2>
        <p class="mt-1 text-xs text-slate-400">
          The rules graph for <em>object#relation</em>{" "}
          — how the relation is composed (union / intersection / exclusion /
          inheritance).
        </p>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field
            label="object"
            value={xObject.value}
            onInput={(v) => (xObject.value = v)}
          />
          <Field
            label="relation"
            value={xRelation.value}
            onInput={(v) => (xRelation.value = v)}
          />
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runExpand}
            disabled={expanding.value}
            class="rounded-md bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {expanding.value ? "Expanding…" : "Run Expand"}
          </button>
        </div>
        {expandResult.value?.error
          ? <p class="mt-3 text-sm text-rose-400">{expandResult.value.error}</p>
          : expandResult.value
          ? (
            <pre class="mt-3 overflow-x-auto rounded-lg bg-slate-950/70 p-3 font-mono text-[11px] leading-relaxed text-slate-300">{(expandResult.value.outline ?? []).join("\n") || "(empty)"}</pre>
          )
          : null}
        <div class="mt-3">
          <div class="text-[11px] uppercase tracking-wide text-slate-500">
            examples
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {EXPAND_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  xObject.value = ex.object;
                  xRelation.value = ex.relation;
                  expandResult.value = null;
                }}
                class="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* What-if */}
      <section class="rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:col-span-2">
        <h2 class="font-semibold text-amber-100">
          What-if (contextual tuples)
        </h2>
        <p class="mt-1 text-xs text-slate-400">
          A Check against hypothetical tuples — simulate a promotion, ban, or
          grant <em>without writing to the store</em>.
        </p>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field
            label="user"
            value={wUser.value}
            onInput={(v) => (wUser.value = v)}
          />
          <Field
            label="relation"
            value={wRelation.value}
            onInput={(v) => (wRelation.value = v)}
          />
          <Field
            label="object"
            value={wObject.value}
            onInput={(v) => (wObject.value = v)}
          />
        </div>
        <label class="mt-2 block">
          <span class="text-[11px] uppercase tracking-wide text-slate-500">
            contextual tuples (JSON array, not written to the store)
          </span>
          <textarea
            value={wTuples.value}
            onInput={(
              e,
            ) => (wTuples.value = (e.target as HTMLTextAreaElement).value)}
            rows={2}
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
          />
        </label>
        <label class="mt-2 block">
          <span class="text-[11px] uppercase tracking-wide text-slate-500">
            context (JSON, optional)
          </span>
          <textarea
            value={wContext.value}
            onInput={(
              e,
            ) => (wContext.value = (e.target as HTMLTextAreaElement).value)}
            rows={1}
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
          />
        </label>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={runWhatIf}
            disabled={whatifing.value}
            class="rounded-md bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {whatifing.value ? "Checking…" : "Run What-if"}
          </button>
          {whatifResult.value?.error
            ? (
              <span class="text-sm text-rose-400">
                {whatifResult.value.error}
              </span>
            )
            : whatifResult.value
            ? <Badge allowed={whatifResult.value.allowed === true} />
            : null}
        </div>
        <div class="mt-3">
          <div class="text-[11px] uppercase tracking-wide text-slate-500">
            examples
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {WHATIF_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  wUser.value = ex.user;
                  wRelation.value = ex.relation;
                  wObject.value = ex.object;
                  wContext.value = ex.context;
                  wTuples.value = ex.tuples;
                  whatifResult.value = null;
                }}
                class="rounded border border-slate-700 bg-slate-800/50 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
