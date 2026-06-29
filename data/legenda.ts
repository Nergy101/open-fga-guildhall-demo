/**
 * Builds Mermaid diagram definitions for the Legenda page, generated from the
 * seeded data (so they stay accurate as the world changes).
 */
import { TUPLES } from "@/data/seed.ts";
import { PERSONAS } from "@/data/personas.ts";
import { RESOURCES } from "@/data/catalog.ts";

const RANKS = ["guildmaster", "officer", "raider", "recruit"];
const RANK_EMOJI: Record<string, string> = {
  guildmaster: "👑",
  officer: "🛡️",
  raider: "⚔️",
  recruit: "🌱",
};
const id = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");

/** A readable "<emoji> <short name>" label for an object id. */
function label(object: string): string {
  const r = RESOURCES.find((x) => x.object === object);
  if (r) return `${r.emoji} ${r.name.replace(/^[^:]*:\s*/, "")}`;
  if (object.startsWith("alliance:")) return "🤝 Azeroth Pact";
  if (object.startsWith("platform:")) return "🎮 The Game: GuildHall";
  return object;
}

function persona(user: string): { emoji: string; name: string } {
  const p = PERSONAS.find((x) => `user:${x.id}` === user);
  if (p) return { emoji: p.emoji, name: p.name };
  const raw = user.replace(/^user:/, "");
  return { emoji: "👑", name: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function audience(userset: string): string {
  if (userset === "user:*") return "🌍 everyone (public)";
  if (userset.startsWith("alliance:")) {
    return userset.includes("#officer")
      ? "🛡️ any alliance officer+"
      : "🤝 any alliance member";
  }
  const m = userset.match(/^guild:([^#]+)#(\w+)/);
  if (!m) return userset;
  const guild = m[1][0].toUpperCase() + m[1].slice(1);
  const byRank: Record<string, string> = {
    member: `✅ members of ${guild}`,
    recruit: `🌱 recruits+ of ${guild}`,
    raider: `⚔️ raiders+ of ${guild}`,
    officer: `🛡️ officers+ of ${guild}`,
    guildmaster: `👑 guildmaster of ${guild}`,
  };
  // The "+" marks concentric ranks: a higher rank inherits the access.
  return byRank[m[2]] ?? `${m[2]}s of ${guild}`;
}

/** Alliance ▸ guilds ▸ members (with ranks; banned highlighted). Laid out left
 * to right so members stack vertically — taller and easier to read. */
export function guildsChart(): string {
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 26, "rankSpacing": 110}}}%%`,
    "graph LR",
  ];
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("alliance:")) {
      lines.push(
        `  ${id(t.object)}["${label(t.object)}"] --> ${id(t.user)}["${
          label(t.user)
        }"]`,
      );
    }
  }
  const banned = new Set(
    TUPLES.filter((t) => t.relation === "banned").map((t) =>
      `${t.object}|${t.user}`
    ),
  );
  for (const t of TUPLES) {
    if (
      RANKS.includes(t.relation) && t.object.startsWith("guild:") &&
      t.user.startsWith("user:")
    ) {
      const p = persona(t.user);
      const isBanned = banned.has(`${t.object}|${t.user}`);
      const node = `${id(t.user)}_${id(t.object)}`;
      const text = `${p.emoji} ${p.name} · ${t.relation}${
        isBanned ? " 🚫 banned" : ""
      }`;
      lines.push(
        `  ${id(t.object)} --> ${node}["${text}"]${
          isBanned ? ":::banned" : ""
        }`,
      );
    }
  }
  lines.push("  classDef banned fill:#3f1d1d,stroke:#ef4444,color:#fecaca;");
  return lines.join("\n");
}

/** Guild ▸ vault ▸ tab (the bank hierarchy). */
export function bankChart(): string {
  const lines = ["graph LR"];
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("vault:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] --> ${id(t.object)}["${
          label(t.object)
        }"]`,
      );
    }
  }
  for (const t of TUPLES) {
    if (t.relation === "vault" && t.object.startsWith("vault_tab:")) {
      lines.push(`  ${id(t.user)} --> ${id(t.object)}["${label(t.object)}"]`);
    }
  }
  return lines.join("\n");
}

/** Ironforge ▸ its gold-capped bank ▸ tabs, plus who can withdraw and their
 * per-grant cap. Officers withdraw freely via the model (`officer from guild`);
 * the seed's grants set the member and Arthas caps; the banned/outsiders get
 * nothing. Generated for the "Vault Limit" scenario. */
export function withdrawAccessChart(): string {
  const VAULT = "vault:ironforge_bank";
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 24, "rankSpacing": 80}}}%%`,
    "graph LR",
  ];
  // Owning guild ▸ the vault ▸ its tabs (the parent ▸ child hierarchy).
  const guild = TUPLES.find((t) => t.relation === "guild" && t.object === VAULT)
    ?.user;
  if (guild) {
    lines.push(
      `  ${id(guild)}["${label(guild)}"] --> ${id(VAULT)}["${label(VAULT)}"]`,
    );
  }
  for (const t of TUPLES) {
    if (t.relation === "vault" && t.user === VAULT) {
      lines.push(`  ${id(VAULT)} --> ${id(t.object)}["${label(t.object)}"]`);
    }
  }
  // Who can withdraw, and their cap — the ABAC grants written in the seed.
  for (const t of TUPLES) {
    if (t.relation === "can_withdraw" && t.object === VAULT) {
      const cap = Number(t.condition?.context?.max_amount);
      let who: string;
      if (t.user.startsWith("user:")) {
        // Name the grantee's rank tier, not the individual: the seed grants the
        // higher cap to Arthas (a raider), but it reads better as "Raiders of
        // Ironforge" in the diagram.
        const rankT = TUPLES.find((x) =>
          RANKS.includes(x.relation) && x.user === t.user &&
          x.object.startsWith("guild:")
        );
        if (rankT) {
          const g = rankT.object.replace("guild:", "");
          who = `${RANK_EMOJI[rankT.relation] ?? "⚔️"} ${
            rankT.relation.charAt(0).toUpperCase() + rankT.relation.slice(1)
          }s of ${g.charAt(0).toUpperCase() + g.slice(1)}`;
        } else {
          const p = persona(t.user);
          who = `${p.emoji} ${p.name}`;
        }
      } else {
        who = audience(t.user);
      }
      lines.push(
        `  ${id(VAULT)} -.->|"≤ ${cap}g"| wd_${id(t.user)}(["${who}"]):::ok`,
      );
    }
  }
  // Officers + the guildmaster withdraw freely (model: officer from guild).
  lines.push(
    `  ${id(VAULT)} -. free .-> wd_officer(["🛡️ officers + guildmaster"]):::ok`,
  );
  // Banned members and outsiders aren't members, so no grant reaches them.
  lines.push(
    `  ${id(VAULT)} -. denied .-> wd_none(["🚫 banned / outsiders"]):::no`,
  );
  lines.push("  classDef ok fill:#0e2a23,stroke:#10b981,color:#a7f3d0;");
  lines.push("  classDef no fill:#3f1d1d,stroke:#ef4444,color:#fecaca;");
  return lines.join("\n");
}

/** Azeroth Pact ▸ its guilds ▸ raids ▸ attendees. The owning guild "owns" each
 * raid; a shared raid also links to every other allied guild, and attendees are
 * tagged with their guild. */
export function raidsChart(): string {
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 30, "rankSpacing": 90}}}%%`,
    "graph LR",
  ];
  // Which guild (object id) each user belongs to (from their first rank tuple).
  const userGuild = new Map<string, string>();
  for (const t of TUPLES) {
    if (
      RANKS.includes(t.relation) && t.object.startsWith("guild:") &&
      t.user.startsWith("user:") && !userGuild.has(t.user)
    ) {
      userGuild.set(t.user, t.object);
    }
  }
  const guildName = (guildObj: string) => {
    const g = guildObj.replace("guild:", "");
    return g.charAt(0).toUpperCase() + g.slice(1);
  };
  const allianceGuilds = TUPLES
    .filter((t) => t.relation === "guild" && t.object.startsWith("alliance:"))
    .map((t) => t.user);

  // One color per guild (dark fill / bright stroke / light text), assigned in
  // alliance order so the palette is stable. A guild's node, the raids it owns
  // and its attendees all share that color — so attendance reads by guild at a
  // glance (Ironforge amber, Orgrimmar emerald).
  const PALETTE = [
    "fill:#3a2e12,stroke:#f59e0b,color:#fde68a",
    "fill:#0e2a23,stroke:#10b981,color:#a7f3d0",
    "fill:#0c1f3a,stroke:#3b82f6,color:#bfdbfe",
    "fill:#2a0e2e,stroke:#d946ef,color:#f5d0fe",
  ];
  const guildClass = new Map<string, string>();
  allianceGuilds.forEach((g, i) => guildClass.set(g, `guild${i}`));
  const tinted = new Map<string, Set<string>>();
  const tint = (node: string, guildObj: string | undefined) => {
    const cls = guildObj ? guildClass.get(guildObj) : undefined;
    if (!cls) return;
    const set = tinted.get(cls) ?? new Set<string>();
    set.add(node);
    tinted.set(cls, set);
  };

  // Alliance ▸ its guilds (the pact sits on top, both guilds underneath).
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("alliance:")) {
      lines.push(
        `  ${id(t.object)}["${label(t.object)}"] --> ${id(t.user)}["${
          label(t.user)
        }"]`,
      );
      tint(id(t.user), t.user);
    }
  }
  // Owning guild ▸ raid (the raid takes its owning guild's color).
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("raid:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] -->|owns| ${id(t.object)}["${
          label(t.object)
        }"]`,
      );
      tint(id(t.object), t.user);
    }
  }
  // Shared raids belong to the alliance, so every *other* allied guild links in
  // too — e.g. Orgrimmar joins Ironforge's Onyxia.
  for (const t of TUPLES) {
    if (t.relation === "alliance" && t.object.startsWith("raid:")) {
      const owner = TUPLES.find((x) =>
        x.relation === "guild" && x.object === t.object
      )?.user;
      for (const g of allianceGuilds) {
        if (g !== owner) {
          lines.push(
            `  ${id(g)}["${label(g)}"] -. shared .-> ${id(t.object)}`,
          );
        }
      }
    }
  }
  // Attendees, colored by their guild (so Medivh clearly reads as Orgrimmar).
  for (const t of TUPLES) {
    if (t.relation === "attendee" && t.user.startsWith("user:")) {
      const p = persona(t.user);
      const guildObj = userGuild.get(t.user);
      const node = `att_${id(t.user)}_${id(t.object)}`;
      lines.push(
        `  ${id(t.object)} -. attended .-> ${node}(["${p.emoji} ${p.name}${
          guildObj ? ` · ${guildName(guildObj)}` : ""
        }"])`,
      );
      tint(node, guildObj);
    }
  }
  // One classDef per guild, then assign every node collected for it.
  allianceGuilds.forEach((_g, i) => {
    lines.push(`  classDef guild${i} ${PALETTE[i % PALETTE.length]};`);
  });
  for (const [cls, nodes] of tinted) {
    lines.push(`  class ${[...nodes].join(",")} ${cls};`);
  }
  return lines.join("\n");
}

/** Channel owners (a guild, the platform, or the alliance for the shared pact
 * channels) ▸ their channels ▸ the audience that may read / post. */
export function channelsChart(): string {
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 28, "rankSpacing": 90}}}%%`,
    "graph LR",
  ];
  const allianceObj = TUPLES.find((t) =>
    t.relation === "guild" && t.object.startsWith("alliance:")
  )?.object;
  const allianceGuilds = TUPLES
    .filter((t) => t.relation === "guild" && t.object.startsWith("alliance:"))
    .map((t) => t.user);
  // Pact channels are the ones whose audience is the whole alliance (an
  // alliance#… userset reads or posts) — so they're drawn from the Azeroth
  // Pact, not a single guild, with both allied guilds reaching them through it.
  const pactChannels = new Set(
    TUPLES.filter((t) =>
      (t.relation === "viewer" || t.relation === "poster") &&
      t.object.startsWith("channel:") && t.user.startsWith("alliance:")
    ).map((t) => t.object),
  );
  // Owning node ▸ channel: a guild or the platform for their own boards, the
  // alliance for the shared pact channels.
  const owner = new Map<string, string>();
  for (const t of TUPLES) {
    if (
      (t.relation === "guild" || t.relation === "platform") &&
      t.object.startsWith("channel:")
    ) {
      owner.set(t.object, t.user);
    }
  }
  if (allianceObj) {
    for (const chan of pactChannels) owner.set(chan, allianceObj);
  }
  // The pact sits on top: both allied guilds belong to it, so members of either
  // guild reach the shared channels through the Azeroth Pact.
  if (pactChannels.size > 0 && allianceObj) {
    for (const g of allianceGuilds) {
      lines.push(
        `  ${id(allianceObj)}["${label(allianceObj)}"] --> ${id(g)}["${
          label(g)
        }"]`,
      );
    }
  }
  for (const [chan, g] of owner) {
    const verb = pactChannels.has(chan) ? "shared" : "owns";
    lines.push(
      `  ${id(g)}["${label(g)}"] -->|${verb}| ${id(chan)}["${label(chan)}"]`,
    );
  }
  // Each channel ▸ the audience (rank, or higher) that may read / post.
  for (const t of TUPLES) {
    if (t.relation === "viewer" && t.object.startsWith("channel:")) {
      lines.push(
        `  ${id(t.object)} -->|"👁️ read"| ${id(t.object)}_v_${id(t.user)}{{"${
          audience(t.user)
        }"}}`,
      );
    }
    if (t.relation === "poster" && t.object.startsWith("channel:")) {
      lines.push(
        `  ${id(t.object)} -->|"✍️ post"| ${id(t.object)}_p_${id(t.user)}{{"${
          audience(t.user)
        }"}}`,
      );
    }
  }
  return lines.join("\n");
}

/** The concentric rank ladder (static). */
export const RANK_LADDER_CHART = `graph LR
  gm["👑 Guildmaster"] -->|is also| off["🛡️ Officer"]
  off -->|is also| rd["⚔️ Raider"]
  rd -->|is also| rc["🌱 Recruit"]
  rc -->|"⇒ member"| mem["✅ Member"]
  ban["🚫 Banned"] -. excluded from .-> mem
  classDef ban fill:#3f1d1d,stroke:#ef4444,color:#fecaca;
  class ban ban;`;
