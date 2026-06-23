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
    </div>
  );
}
