import { assert, assertEquals } from "jsr:@std/assert@^1";
import { batchCheck, check, listObjects } from "@/lib/fga.ts";
import { buildItems } from "@/lib/access.ts";
import { checkId } from "@/data/catalog.ts";
import { personaUser } from "@/data/personas.ts";

// These tests run against the live, seeded OpenFGA store.
// Prereqs: `docker compose up -d` && `deno task seed`.

const T = true;
const F = false;
const DURING = "2026-07-01T00:00:00Z"; // inside the signup window

// Persona order for every row below.
const PERSONAS = [
  "thrall",
  "jaina",
  "arthas",
  "rexxar",
  "guldan",
  "medivh",
  "guest",
];

// [object, relation, context | undefined, expected per persona (in PERSONAS order)]
const MATRIX: [
  string,
  string,
  Record<string, unknown> | undefined,
  boolean[],
][] = [
  // Guild: rank ladder + blocklist
  ["guild:ironforge", "can_read", undefined, [T, T, T, T, F, F, F]],
  ["guild:ironforge", "can_invite", undefined, [T, T, F, F, F, F, F]],
  ["guild:ironforge", "can_kick", undefined, [T, T, F, F, F, F, F]],
  ["guild:ironforge", "can_edit_motd", undefined, [T, T, F, F, F, F, F]],
  ["guild:ironforge", "can_manage_ranks", undefined, [T, F, F, F, F, F, F]],
  ["guild:ironforge", "can_disband", undefined, [T, F, F, F, F, F, F]],
  // Vault: parent-child + ABAC (default 250g)
  ["vault:ironforge_bank", "can_view", undefined, [T, T, T, T, F, F, F]],
  ["vault:ironforge_bank", "can_deposit", undefined, [T, T, T, F, F, F, F]],
  ["vault:ironforge_bank", "can_withdraw", { requested_amount: 250 }, [
    T,
    T,
    T,
    F,
    F,
    F,
    F,
  ]],
  // Vault tab: 3-level hierarchy
  ["vault_tab:legendary", "can_view", undefined, [T, T, T, T, F, F, F]],
  ["vault_tab:legendary", "can_withdraw", { requested_amount: 250 }, [
    T,
    T,
    T,
    F,
    F,
    F,
    F,
  ]],
  // Raid: signup (group+condition), loot (intersection)
  ["raid:molten_core", "can_view", undefined, [T, T, T, T, F, F, F]],
  ["raid:molten_core", "can_signup", { current_time: DURING }, [
    T,
    T,
    T,
    T,
    F,
    F,
    F,
  ]],
  ["raid:molten_core", "can_loot", undefined, [T, F, T, F, F, F, F]],
  ["raid:molten_core", "can_view_tactics", undefined, [T, T, T, F, F, F, F]],
  ["raid:molten_core", "can_edit", undefined, [T, T, F, F, F, F, F]],
  // Raid 2: Blackwing Lair — Jaina attended this one (Thrall did not)
  ["raid:blackwing_lair", "can_view", undefined, [T, T, T, T, F, F, F]],
  ["raid:blackwing_lair", "can_signup", { current_time: DURING }, [
    T,
    T,
    T,
    T,
    F,
    F,
    F,
  ]],
  ["raid:blackwing_lair", "can_loot", undefined, [F, T, T, F, F, F, F]],
  ["raid:blackwing_lair", "can_view_tactics", undefined, [T, T, T, F, F, F, F]],
  ["raid:blackwing_lair", "can_edit", undefined, [T, T, F, F, F, F, F]],
  // Channels: public + groups + nested group
  ["channel:tavern_board", "can_read", undefined, [T, T, T, T, T, T, T]],
  ["channel:tavern_board", "can_post", undefined, [T, T, T, T, F, F, F]],
  ["channel:general", "can_read", undefined, [T, T, T, T, F, F, F]],
  ["channel:war_council", "can_read", undefined, [T, T, F, F, F, F, F]],
  ["channel:war_council", "can_moderate", undefined, [T, T, F, F, F, F, F]],
  ["channel:pact_hall", "can_read", undefined, [T, T, T, T, F, T, F]],
];

Deno.test("access matrix matches the design for every persona", async (t) => {
  for (const [object, relation, context, expected] of MATRIX) {
    for (let i = 0; i < PERSONAS.length; i++) {
      const persona = PERSONAS[i];
      await t.step(`${persona} ${relation} ${object}`, async () => {
        const got = await check({
          user: personaUser(persona),
          relation,
          object,
          context,
        });
        assertEquals(got, expected[i]);
      });
    }
  }
});

Deno.test("ABAC: withdrawal limit is enforced at check time", async () => {
  const vault = "vault:ironforge_bank";
  // Arthas is capped at 500g.
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 500 },
    }),
    true,
  );
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 501 },
    }),
    false,
  );
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 900 },
    }),
    false,
  );
  // Officers withdraw any amount.
  assertEquals(
    await check({
      user: "user:jaina",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 1_000_000 },
    }),
    true,
  );
  // Recruits now get a 100g floor.
  assertEquals(
    await check({
      user: "user:rexxar",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 100 },
    }),
    true,
  );
  assertEquals(
    await check({
      user: "user:rexxar",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 101 },
    }),
    false,
  );
  // Banned users are not members, so they still get nothing.
  assertEquals(
    await check({
      user: "user:guldan",
      relation: "can_withdraw",
      object: vault,
      context: { requested_amount: 1 },
    }),
    false,
  );
  // The limit propagates through the vault tab (3-level inheritance).
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_withdraw",
      object: "vault_tab:legendary",
      context: { requested_amount: 250 },
    }),
    true,
  );
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_withdraw",
      object: "vault_tab:legendary",
      context: { requested_amount: 900 },
    }),
    false,
  );
});

Deno.test("ABAC: raid signup only inside the time window", async () => {
  const raid = "raid:molten_core";
  const before = "2026-01-01T00:00:00Z";
  const after = "2027-01-01T00:00:00Z";
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_signup",
      object: raid,
      context: { current_time: before },
    }),
    false,
  );
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_signup",
      object: raid,
      context: { current_time: DURING },
    }),
    true,
  );
  assertEquals(
    await check({
      user: "user:arthas",
      relation: "can_signup",
      object: raid,
      context: { current_time: after },
    }),
    false,
  );
  // A recruit CAN now sign up inside the window (members may sign up).
  assertEquals(
    await check({
      user: "user:rexxar",
      relation: "can_signup",
      object: raid,
      context: { current_time: DURING },
    }),
    true,
  );
  // But a banned member still cannot, even inside the window.
  assertEquals(
    await check({
      user: "user:guldan",
      relation: "can_signup",
      object: raid,
      context: { current_time: DURING },
    }),
    false,
  );
});

Deno.test("loot is per-raid: Jaina rolls on the raid she attended", async () => {
  // Molten Core — Jaina was absent, so the intersection (attendee AND raider) fails.
  assertEquals(
    await check({
      user: "user:jaina",
      relation: "can_loot",
      object: "raid:molten_core",
    }),
    false,
  );
  // Blackwing Lair — Jaina attended and is a raider (via officer), so she CAN loot.
  assertEquals(
    await check({
      user: "user:jaina",
      relation: "can_loot",
      object: "raid:blackwing_lair",
    }),
    true,
  );
  // Thrall is the mirror image: looted Molten Core, skipped Blackwing Lair.
  assertEquals(
    await check({
      user: "user:thrall",
      relation: "can_loot",
      object: "raid:molten_core",
    }),
    true,
  );
  assertEquals(
    await check({
      user: "user:thrall",
      relation: "can_loot",
      object: "raid:blackwing_lair",
    }),
    false,
  );
});

Deno.test("ListObjects returns the right channels per persona", async () => {
  const asSet = async (user: string) =>
    new Set(await listObjects({ user, relation: "can_read", type: "channel" }));

  assertEquals(
    await asSet("user:thrall"),
    new Set([
      "channel:tavern_board",
      "channel:general",
      "channel:war_council",
      "channel:pact_hall",
    ]),
  );
  assertEquals(
    await asSet("user:arthas"),
    new Set(["channel:tavern_board", "channel:general", "channel:pact_hall"]),
  );
  assertEquals(
    await asSet("user:medivh"),
    new Set(["channel:tavern_board", "channel:pact_hall"]),
  );
  assertEquals(await asSet("user:guest"), new Set(["channel:tavern_board"]));
});

Deno.test("batchCheck chunks >50 checks correctly", async () => {
  // 7 personas x 29 actions = 203 checks, well over the 50/request cap.
  const items = PERSONAS.flatMap((p) =>
    buildItems(p, personaUser(p), { currentTime: DURING })
  );
  assert(items.length > 50, `expected >50 items, got ${items.length}`);
  const results = await batchCheck(items);
  assertEquals(Object.keys(results).length, items.length);
  // Spot-check a few merged results.
  assertEquals(results[checkId("thrall", "guild", "disband")], true);
  assertEquals(results[checkId("rexxar", "guild", "disband")], false);
  assertEquals(results[checkId("guldan", "tavern", "read")], true);
  assertEquals(results[checkId("medivh", "pact", "read")], true);
  assertEquals(results[checkId("guest", "general", "read")], false);
  assertEquals(results[checkId("jaina", "bwl", "loot")], true);
  assertEquals(results[checkId("jaina", "raid", "loot")], false);
});
