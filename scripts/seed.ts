/**
 * Seeds OpenFGA for the GuildHall demo.
 *
 *   1. Compiles lib/model.fga (DSL) -> JSON authorization model.
 *   2. Deletes any existing "guildhall" store (idempotent re-seed).
 *   3. Creates a fresh store + writes the model.
 *   4. Writes every tuple from data/seed.ts (including conditional tuples).
 *   5. Persists { apiUrl, storeId, modelId } to fga.local.json.
 *
 * Run: deno task seed   (after `docker compose up -d`)
 */
import { transformer } from "@openfga/syntax-transformer";
import { TUPLES } from "@/data/seed.ts";
import { writeFgaConfig } from "@/lib/store.ts";

const API_URL = Deno.env.get("FGA_API_URL") ?? "http://localhost:8088";
const STORE_NAME = "guildhall";

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

async function waitForHealth(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_URL}/healthz`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await delay(1000);
  }
  throw new Error(
    `OpenFGA did not become healthy at ${API_URL}. Is \`docker compose up -d\` running?`,
  );
}

async function main(): Promise<void> {
  console.log(`⚙️  Seeding GuildHall against ${API_URL}`);
  await waitForHealth();

  // 1. Compile the DSL model to JSON.
  const dsl = await Deno.readTextFile(
    new URL("../lib/model.fga", import.meta.url),
  );
  const model = transformer.transformDSLToJSONObject(dsl);
  console.log(
    `📜 Compiled model: ${model.type_definitions?.length ?? 0} types, ` +
      `${Object.keys(model.conditions ?? {}).length} conditions`,
  );

  // 2. Delete an existing "guildhall" store so re-seeding is clean.
  const { stores } = await req<{ stores: { id: string; name: string }[] }>(
    "GET",
    "/stores",
  );
  for (const s of stores ?? []) {
    if (s.name === STORE_NAME) {
      await req("DELETE", `/stores/${s.id}`);
      console.log(`🗑️  Deleted existing store ${s.id}`);
    }
  }

  // 3. Create a fresh store + write the model.
  const store = await req<{ id: string }>("POST", "/stores", {
    name: STORE_NAME,
  });
  const storeId = store.id;
  console.log(`🏪 Created store ${storeId}`);

  const modelRes = await req<{ authorization_model_id: string }>(
    "POST",
    `/stores/${storeId}/authorization-models`,
    model,
  );
  const modelId = modelRes.authorization_model_id;
  console.log(`🧩 Wrote model ${modelId}`);

  // 4. Write all tuples in one call.
  await req("POST", `/stores/${storeId}/write`, {
    authorization_model_id: modelId,
    writes: {
      tuple_keys: TUPLES.map((t) => ({
        user: t.user,
        relation: t.relation,
        object: t.object,
        condition: t.condition,
      })),
    },
  });
  console.log(`🔗 Wrote ${TUPLES.length} tuples`);

  // 5. Persist config for the app + tests.
  await writeFgaConfig({ apiUrl: API_URL, storeId, modelId });
  console.log("✅ Wrote fga.local.json — ready. Run `deno task dev`.");
}

await main();
