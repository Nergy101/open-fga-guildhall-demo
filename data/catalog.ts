/**
 * The resources + actions surfaced in the UI and exercised by the tests.
 * Each action maps to an OpenFGA relation on an object; `concept` names the
 * OpenFGA feature it demonstrates; `abac` flags actions whose result depends on
 * request-time condition context.
 */
export type Abac = "withdraw" | "signup" | undefined;

export interface Action {
  key: string;
  label: string;
  relation: string;
  concept: string;
  abac?: Abac;
}

export interface Resource {
  key: string;
  name: string;
  emoji: string;
  /** OpenFGA object id, e.g. "guild:ironforge". */
  object: string;
  type: string;
  /** For vault tabs: the parent vault's object id. */
  parent?: string;
  blurb: string;
  actions: Action[];
}

export interface ResourceGroup {
  key: string;
  title: string;
  subtitle: string;
  /** Resource `type`s that belong to this section. */
  types: string[];
}

/** Dashboard card sections, in display order. */
export const GROUPS: ResourceGroup[] = [
  {
    key: "guild",
    title: "The Guild",
    subtitle: "Rank ladder & blocklist",
    types: ["guild"],
  },
  {
    key: "bank",
    title: "Guild Bank",
    subtitle: "Vaults & tabs — parent ▸ child hierarchy + ABAC gold caps",
    types: ["vault", "vault_tab"],
  },
  {
    key: "raids",
    title: "Guild Raids",
    subtitle: "Attendance-based, some shared with the alliance",
    types: ["raid"],
  },
  {
    key: "channels",
    title: "Channels",
    subtitle: "Groups, nested groups & public access",
    types: ["channel"],
  },
];

/** Sub-sections within the dashboard's Channels group, in display order. */
export interface ChannelScope {
  key: string;
  title: string;
  subtitle: string;
  /** Channel object ids in this scope. */
  objects: string[];
}

export const CHANNEL_SCOPES: ChannelScope[] = [
  {
    key: "public",
    title: "📜 Public",
    subtitle: "Open to everyone — even guests and the banned (user:*)",
    objects: ["channel:tavern_board"],
  },
  {
    key: "guild",
    title: "🏰 Ironforge channels",
    subtitle: "The main guild's own boards — members & officers",
    objects: ["channel:general", "channel:war_council"],
  },
  {
    key: "shared",
    title: "🤝 Shared — Azeroth Pact",
    subtitle: "Members of any guild in the alliance",
    objects: ["channel:pact_hall"],
  },
  {
    key: "allied",
    title: "🪓 Allied guild — Orgrimmar",
    subtitle: "Belongs to a different guild entirely",
    objects: ["channel:orgrimmar_hall"],
  },
];

export const RESOURCES: Resource[] = [
  {
    key: "guild",
    name: "Guild: Ironforge",
    emoji: "🏰",
    object: "guild:ironforge",
    type: "guild",
    blurb:
      "Rank ladder (guildmaster ▸ officer ▸ raider ▸ recruit) with a blocklist.",
    actions: [
      {
        key: "read",
        label: "Read guild",
        relation: "can_read",
        concept: "membership (minus blocklist)",
      },
      {
        key: "invite",
        label: "Invite members",
        relation: "can_invite",
        concept: "rank: officer+",
      },
      {
        key: "kick",
        label: "Kick members",
        relation: "can_kick",
        concept: "rank: officer+",
      },
      {
        key: "motd",
        label: "Edit MOTD",
        relation: "can_edit_motd",
        concept: "rank: officer+",
      },
      {
        key: "ranks",
        label: "Manage ranks",
        relation: "can_manage_ranks",
        concept: "rank: guildmaster",
      },
      {
        key: "disband",
        label: "Disband guild",
        relation: "can_disband",
        concept: "rank: guildmaster",
      },
    ],
  },
  {
    key: "orgrimmar",
    name: "Guild: Orgrimmar",
    emoji: "🪓",
    object: "guild:orgrimmar",
    type: "guild",
    blurb:
      "The allied guild in the Azeroth Pact. Medivh is an officer here — so he runs Orgrimmar, even though he's a stranger inside Ironforge.",
    actions: [
      {
        key: "read",
        label: "Read guild",
        relation: "can_read",
        concept: "membership (minus blocklist)",
      },
      {
        key: "invite",
        label: "Invite members",
        relation: "can_invite",
        concept: "rank: officer+",
      },
      {
        key: "kick",
        label: "Kick members",
        relation: "can_kick",
        concept: "rank: officer+",
      },
      {
        key: "motd",
        label: "Edit MOTD",
        relation: "can_edit_motd",
        concept: "rank: officer+",
      },
      {
        key: "ranks",
        label: "Manage ranks",
        relation: "can_manage_ranks",
        concept: "rank: guildmaster (none seeded)",
      },
    ],
  },
  {
    key: "vault",
    name: "Vault: Ironforge Bank",
    emoji: "🏦",
    object: "vault:ironforge_bank",
    type: "vault",
    blurb:
      "Belongs to the guild (parent-child). Withdrawals are gold-capped (ABAC).",
    actions: [
      {
        key: "view",
        label: "View vault",
        relation: "can_view",
        concept: "parent: member of guild",
      },
      {
        key: "deposit",
        label: "Deposit gold",
        relation: "can_deposit",
        concept: "ABAC: members ≤100g, Arthas ≤500g, officers free",
        abac: "withdraw",
      },
      {
        key: "withdraw",
        label: "Withdraw gold",
        relation: "can_withdraw",
        concept: "ABAC: members ≤100g, Arthas ≤500g, officers free",
        abac: "withdraw",
      },
    ],
  },
  {
    key: "tab",
    name: "Vault tab: Legendary",
    emoji: "💎",
    object: "vault_tab:legendary",
    type: "vault_tab",
    parent: "vault:ironforge_bank",
    blurb:
      "Three-level hierarchy: tab ▸ vault ▸ guild. Inherits the vault's rules.",
    actions: [
      {
        key: "view",
        label: "View tab",
        relation: "can_view",
        concept: "inherited via tab ▸ vault ▸ guild",
      },
      {
        key: "deposit",
        label: "Deposit to tab",
        relation: "can_deposit",
        concept: "ABAC inherited from vault",
        abac: "withdraw",
      },
      {
        key: "withdraw",
        label: "Withdraw 250g from tab",
        relation: "can_withdraw",
        concept: "ABAC inherited from vault",
        abac: "withdraw",
      },
    ],
  },
  {
    key: "raid",
    name: "Raid: Molten Core",
    emoji: "🔥",
    object: "raid:molten_core",
    type: "raid",
    blurb:
      "Time-boxed signup; loot needs attendance AND raider rank — Jaina skipped this one.",
    actions: [
      {
        key: "view",
        label: "View raid",
        relation: "can_view",
        concept: "parent: member of guild",
      },
      {
        key: "signup",
        label: "Sign up",
        relation: "can_signup",
        concept: "ABAC: members, while window open",
        abac: "signup",
      },
      {
        key: "loot",
        label: "Roll on loot",
        relation: "can_loot",
        concept: "intersection: attendee AND raider",
      },
      {
        key: "tactics",
        label: "View tactics",
        relation: "can_view_tactics",
        concept: "attendee or leader, but not banned",
      },
      {
        key: "edit",
        label: "Edit raid",
        relation: "can_edit",
        concept: "leader (officer+)",
      },
    ],
  },
  {
    key: "bwl",
    name: "Raid: Blackwing Lair",
    emoji: "🐉",
    object: "raid:blackwing_lair",
    type: "raid",
    blurb:
      "Jaina attended this one — so the same loot rule lets her roll here.",
    actions: [
      {
        key: "view",
        label: "View raid",
        relation: "can_view",
        concept: "parent: member of guild",
      },
      {
        key: "signup",
        label: "Sign up",
        relation: "can_signup",
        concept: "ABAC: members, while window open",
        abac: "signup",
      },
      {
        key: "loot",
        label: "Roll on loot",
        relation: "can_loot",
        concept: "intersection: attendee AND raider",
      },
      {
        key: "tactics",
        label: "View tactics",
        relation: "can_view_tactics",
        concept: "attendee or leader, but not banned",
      },
      {
        key: "edit",
        label: "Edit raid",
        relation: "can_edit",
        concept: "leader (officer+)",
      },
    ],
  },
  {
    key: "tavern",
    name: "Channel: Tavern Board",
    emoji: "📜",
    object: "channel:tavern_board",
    type: "channel",
    blurb:
      "Public: readable by everyone via user:* — even guests and the banned.",
    actions: [
      {
        key: "read",
        label: "Read",
        relation: "can_read",
        concept: "public access (user:*)",
      },
      {
        key: "post",
        label: "Post",
        relation: "can_post",
        concept: "members only",
      },
    ],
  },
  {
    key: "general",
    name: "Channel: General",
    emoji: "💬",
    object: "channel:general",
    type: "channel",
    blurb: "Members-only chat (the guild#member userset).",
    actions: [
      {
        key: "read",
        label: "Read",
        relation: "can_read",
        concept: "group: guild#member",
      },
      {
        key: "post",
        label: "Post",
        relation: "can_post",
        concept: "group: guild#member",
      },
    ],
  },
  {
    key: "council",
    name: "Channel: War Council",
    emoji: "⚔️",
    object: "channel:war_council",
    type: "channel",
    blurb: "Officers-only (the guild#officer userset).",
    actions: [
      {
        key: "read",
        label: "Read",
        relation: "can_read",
        concept: "group: guild#officer",
      },
      {
        key: "post",
        label: "Post",
        relation: "can_post",
        concept: "group: guild#officer",
      },
      {
        key: "moderate",
        label: "Moderate",
        relation: "can_moderate",
        concept: "group: guild#officer",
      },
    ],
  },
  {
    key: "pact",
    name: "Channel: Pact Hall",
    emoji: "🤝",
    object: "channel:pact_hall",
    type: "channel",
    blurb: "Alliance-wide: members of ANY guild in the pact (nested group).",
    actions: [
      {
        key: "read",
        label: "Read",
        relation: "can_read",
        concept: "nested group: alliance#member",
      },
    ],
  },
  {
    key: "orgrimmar_hall",
    name: "Channel: Orgrimmar Hall",
    emoji: "🪓",
    object: "channel:orgrimmar_hall",
    type: "channel",
    blurb:
      "Orgrimmar's members-only board — the allied guild's own chat (Medivh reads and posts here).",
    actions: [
      {
        key: "read",
        label: "Read",
        relation: "can_read",
        concept: "group: orgrimmar#member",
      },
      {
        key: "post",
        label: "Post",
        relation: "can_post",
        concept: "group: orgrimmar#member",
      },
    ],
  },
  {
    key: "warchest",
    name: "Vault: War Chest",
    emoji: "⚜️",
    object: "vault:war_chest",
    type: "vault",
    blurb:
      "Officers' reserve: members may view it, but only officers and the guildmaster move gold — deposit and withdraw alike.",
    actions: [
      {
        key: "view",
        label: "View war chest",
        relation: "can_view",
        concept: "parent: member of guild",
      },
      {
        key: "deposit",
        label: "Deposit gold",
        relation: "can_deposit",
        concept: "officers + guildmaster only",
      },
      {
        key: "withdraw",
        label: "Withdraw gold",
        relation: "can_withdraw",
        concept: "officers + guildmaster only",
      },
    ],
  },
  {
    key: "materials",
    name: "Vault tab: Materials",
    emoji: "🧪",
    object: "vault_tab:materials",
    type: "vault_tab",
    parent: "vault:ironforge_bank",
    blurb:
      "A second tab on the main bank — inherits the gold-capped member rules.",
    actions: [
      {
        key: "view",
        label: "View tab",
        relation: "can_view",
        concept: "inherited via tab ▸ vault ▸ guild",
      },
      {
        key: "deposit",
        label: "Deposit to tab",
        relation: "can_deposit",
        concept: "ABAC inherited from vault",
        abac: "withdraw",
      },
      {
        key: "withdraw",
        label: "Withdraw 250g from tab",
        relation: "can_withdraw",
        concept: "ABAC inherited from vault",
        abac: "withdraw",
      },
    ],
  },
  {
    key: "treasury",
    name: "Vault tab: Treasury",
    emoji: "💰",
    object: "vault_tab:treasury",
    type: "vault_tab",
    parent: "vault:war_chest",
    blurb:
      "A tab inside the War Chest — inherits its officers-only withdrawal rule.",
    actions: [
      {
        key: "view",
        label: "View tab",
        relation: "can_view",
        concept: "inherited via tab ▸ vault ▸ guild",
      },
      {
        key: "deposit",
        label: "Deposit to tab",
        relation: "can_deposit",
        concept: "officers + guildmaster (inherited)",
      },
      {
        key: "withdraw",
        label: "Withdraw from tab",
        relation: "can_withdraw",
        concept: "officers + guildmaster (inherited)",
      },
    ],
  },
  {
    key: "onyxia",
    name: "Raid: Onyxia's Lair",
    emoji: "🐲",
    object: "raid:onyxia",
    type: "raid",
    blurb:
      "Shared with the alliance: everyone attended, but banned Gul'dan is denied — while allied Medivh both joins and rolls loot as a raider of an allied guild.",
    actions: [
      {
        key: "view",
        label: "View raid",
        relation: "can_view",
        concept: "member of guild OR allied guild",
      },
      {
        key: "signup",
        label: "Sign up",
        relation: "can_signup",
        concept: "ABAC: guild or alliance members, while window open",
        abac: "signup",
      },
      {
        key: "loot",
        label: "Roll on loot",
        relation: "can_loot",
        concept: "attendee AND raider (own OR allied guild)",
      },
      {
        key: "tactics",
        label: "View tactics",
        relation: "can_view_tactics",
        concept: "attendee or leader, but not banned",
      },
      {
        key: "edit",
        label: "Edit raid",
        relation: "can_edit",
        concept: "leader (officer+)",
      },
    ],
  },
];

/** Default condition context for an ABAC action (overridable by the UI controls). */
export function abacContext(
  abac: Abac,
  opts?: { amount?: number; currentTime?: string },
): Record<string, unknown> | undefined {
  if (abac === "withdraw") return { requested_amount: opts?.amount ?? 250 };
  if (abac === "signup") {
    return { current_time: opts?.currentTime ?? new Date().toISOString() };
  }
  return undefined;
}

/** Stable correlation id for a (persona, resource, action) triple — fits ^[\w-]{1,36}$. */
export function checkId(
  personaId: string,
  resourceKey: string,
  actionKey: string,
): string {
  return `${personaId}-${resourceKey}-${actionKey}`;
}
