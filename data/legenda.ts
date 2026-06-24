/**
 * Builds Mermaid diagram definitions for the Legenda page, generated from the
 * seeded data (so they stay accurate as the world changes).
 */
import { TUPLES } from "@/data/seed.ts";
import { PERSONAS } from "@/data/personas.ts";
import { RESOURCES } from "@/data/catalog.ts";

const RANKS = ["guildmaster", "officer", "raider", "recruit"];
const id = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");

/** A readable "<emoji> <short name>" label for an object id. */
function label(object: string): string {
  const r = RESOURCES.find((x) => x.object === object);
  if (r) return `${r.emoji} ${r.name.replace(/^[^:]*:\s*/, "")}`;
  if (object.startsWith("alliance:")) return "🤝 Azeroth Pact";
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
  if (userset.startsWith("alliance:")) return "🤝 any alliance member";
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

/** Owning guild ▸ raids ▸ attendees — attendees tagged with their guild, and
 * alliance-shared raids shown opening to every allied guild. */
export function raidsChart(): string {
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 30, "rankSpacing": 90}}}%%`,
    "graph LR",
  ];
  // Which guild each user belongs to (from their rank tuple).
  const userGuild = new Map<string, string>();
  for (const t of TUPLES) {
    if (
      RANKS.includes(t.relation) && t.object.startsWith("guild:") &&
      t.user.startsWith("user:") && !userGuild.has(t.user)
    ) {
      const g = t.object.replace("guild:", "");
      userGuild.set(t.user, g.charAt(0).toUpperCase() + g.slice(1));
    }
  }
  const allianceGuilds = TUPLES
    .filter((t) => t.relation === "guild" && t.object.startsWith("alliance:"))
    .map((t) => t.user);
  // Owning guild ▸ raid.
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("raid:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] -->|owns| ${id(t.object)}["${
          label(t.object)
        }"]`,
      );
    }
  }
  // Alliance-shared raids: the pact and every *other* allied guild can join.
  for (const t of TUPLES) {
    if (t.relation === "alliance" && t.object.startsWith("raid:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] -. shared .-> ${id(t.object)}`,
      );
      const owner = TUPLES.find((x) =>
        x.relation === "guild" && x.object === t.object
      )?.user;
      for (const g of allianceGuilds) {
        if (g !== owner) {
          lines.push(
            `  ${id(t.object)} -. open to .-> ${id(g)}["${label(g)}"]`,
          );
        }
      }
    }
  }
  // Attendees, tagged with their guild (so Medivh clearly reads as Orgrimmar).
  for (const t of TUPLES) {
    if (t.relation === "attendee" && t.user.startsWith("user:")) {
      const p = persona(t.user);
      const g = userGuild.get(t.user);
      const node = `att_${id(t.user)}_${id(t.object)}`;
      lines.push(
        `  ${id(t.object)} -. attended .-> ${node}(["${p.emoji} ${p.name}${
          g ? ` · ${g}` : ""
        }"])`,
      );
    }
  }
  return lines.join("\n");
}

/** Guild ▸ its channels ▸ the rank needed to read / post. */
export function channelsChart(): string {
  const lines = [
    `%%{init: {"themeVariables": {"fontSize": "16px"}, "flowchart": {"nodeSpacing": 28, "rankSpacing": 90}}}%%`,
    "graph LR",
  ];
  // Owning guild ▸ channel.
  const owner = new Map<string, string>();
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("channel:")) {
      owner.set(t.object, t.user);
    }
  }
  for (const [chan, g] of owner) {
    lines.push(
      `  ${id(g)}["${label(g)}"] -->|owns| ${id(chan)}["${label(chan)}"]`,
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
