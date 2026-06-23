/**
 * Declarative seed data: every relationship tuple written to OpenFGA.
 *
 * The world: guild "Ironforge" (main) + allied guild "Orgrimmar", both part of
 * the "Azeroth Pact" alliance. One vault (with a legendary tab), two raids, and
 * four channels.
 */

export interface SeedTuple {
  user: string;
  relation: string;
  object: string;
  /** Conditional (ABAC) tuple: condition name + the context stored on the tuple. */
  condition?: { name: string; context: Record<string, unknown> };
}

/** Raid signup window (stored on the tuple; `current_time` is supplied at check time). */
export const SIGNUP_WINDOW = {
  opens_at: "2026-06-01T00:00:00Z",
  closes_at: "2026-12-31T23:59:59Z",
};

/** Arthas' personal gold withdrawal cap (stored on the tuple). */
export const ARTHAS_WITHDRAW_LIMIT = 500;

/** Baseline gold withdrawal cap for any member, recruits included (stored on the tuple). */
export const MEMBER_WITHDRAW_LIMIT = 100;

export const TUPLES: SeedTuple[] = [
  // ── Alliance: the Azeroth Pact contains both guilds ──────────────────────
  {
    user: "guild:ironforge",
    relation: "guild",
    object: "alliance:azeroth_pact",
  },
  {
    user: "guild:orgrimmar",
    relation: "guild",
    object: "alliance:azeroth_pact",
  },

  // ── Ironforge ranks (the main guild) ─────────────────────────────────────
  { user: "user:thrall", relation: "guildmaster", object: "guild:ironforge" },
  { user: "user:jaina", relation: "officer", object: "guild:ironforge" },
  { user: "user:arthas", relation: "raider", object: "guild:ironforge" },
  { user: "user:rexxar", relation: "recruit", object: "guild:ironforge" },
  // Gul'dan is a recruit but on the blocklist.
  { user: "user:guldan", relation: "recruit", object: "guild:ironforge" },
  { user: "user:guldan", relation: "banned", object: "guild:ironforge" },

  // ── Orgrimmar (allied guild) ─────────────────────────────────────────────
  { user: "user:medivh", relation: "officer", object: "guild:orgrimmar" },

  // ── Vault + tab ──────────────────────────────────────────────────────────
  {
    user: "guild:ironforge",
    relation: "guild",
    object: "vault:ironforge_bank",
  },
  {
    user: "vault:ironforge_bank",
    relation: "vault",
    object: "vault_tab:legendary",
  },
  // Arthas (raider) gets a capped withdrawal grant (officers withdraw freely).
  {
    user: "user:arthas",
    relation: "can_withdraw",
    object: "vault:ironforge_bank",
    condition: {
      name: "withdrawal_within_limit",
      context: { max_amount: ARTHAS_WITHDRAW_LIMIT },
    },
  },

  // Members (recruits included) may withdraw a small amount; banned are excluded (not members).
  {
    user: "guild:ironforge#member",
    relation: "can_withdraw",
    object: "vault:ironforge_bank",
    condition: {
      name: "withdrawal_within_limit",
      context: { max_amount: MEMBER_WITHDRAW_LIMIT },
    },
  },

  // ── Raid: Molten Core ────────────────────────────────────────────────────
  { user: "guild:ironforge", relation: "guild", object: "raid:molten_core" },
  // All Ironforge members (recruits included) may sign up — but only inside the window.
  {
    user: "guild:ironforge#member",
    relation: "can_signup",
    object: "raid:molten_core",
    condition: { name: "within_signup_window", context: SIGNUP_WINDOW },
  },
  // Who actually showed up (drives the loot intersection).
  { user: "user:thrall", relation: "attendee", object: "raid:molten_core" },
  { user: "user:arthas", relation: "attendee", object: "raid:molten_core" },

  // ── Raid: Blackwing Lair (a 2nd raid Jaina actually attended) ─────────────
  { user: "guild:ironforge", relation: "guild", object: "raid:blackwing_lair" },
  {
    user: "guild:ironforge#member",
    relation: "can_signup",
    object: "raid:blackwing_lair",
    condition: { name: "within_signup_window", context: SIGNUP_WINDOW },
  },
  // Jaina + Arthas showed up to Blackwing Lair (Thrall did not) — so Jaina CAN loot here.
  { user: "user:jaina", relation: "attendee", object: "raid:blackwing_lair" },
  { user: "user:arthas", relation: "attendee", object: "raid:blackwing_lair" },

  // ── Channels ─────────────────────────────────────────────────────────────
  // Public tavern board — readable by everyone (user:*).
  {
    user: "guild:ironforge",
    relation: "guild",
    object: "channel:tavern_board",
  },
  { user: "user:*", relation: "viewer", object: "channel:tavern_board" },
  {
    user: "guild:ironforge#member",
    relation: "poster",
    object: "channel:tavern_board",
  },

  // Members-only general chat.
  { user: "guild:ironforge", relation: "guild", object: "channel:general" },
  {
    user: "guild:ironforge#member",
    relation: "viewer",
    object: "channel:general",
  },
  {
    user: "guild:ironforge#member",
    relation: "poster",
    object: "channel:general",
  },

  // Officers-only war council.
  { user: "guild:ironforge", relation: "guild", object: "channel:war_council" },
  {
    user: "guild:ironforge#officer",
    relation: "viewer",
    object: "channel:war_council",
  },
  {
    user: "guild:ironforge#officer",
    relation: "poster",
    object: "channel:war_council",
  },
  {
    user: "guild:ironforge#officer",
    relation: "moderator",
    object: "channel:war_council",
  },

  // Alliance-wide hall — readable by members of ANY guild in the pact (nested group).
  { user: "guild:ironforge", relation: "guild", object: "channel:pact_hall" },
  {
    user: "alliance:azeroth_pact#member",
    relation: "viewer",
    object: "channel:pact_hall",
  },
];
