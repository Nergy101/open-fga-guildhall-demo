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
  return p ? { emoji: p.emoji, name: p.name } : { emoji: "👤", name: user };
}

function audience(userset: string): string {
  if (userset === "user:*") return "🌍 everyone (public)";
  if (userset.startsWith("alliance:")) return "🤝 any alliance member";
  const m = userset.match(/^guild:([^#]+)#(\w+)/);
  if (!m) return userset;
  const guild = m[1][0].toUpperCase() + m[1].slice(1);
  return `${m[2]}s of ${guild}`;
}

/** Alliance ▸ guilds ▸ members (with ranks; banned highlighted). */
export function guildsChart(): string {
  const lines = ["graph TD"];
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

/** Guild / alliance ▸ raids ▸ attendees. */
export function raidsChart(): string {
  const lines = ["graph TD"];
  for (const t of TUPLES) {
    if (t.relation === "guild" && t.object.startsWith("raid:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] --> ${id(t.object)}["${
          label(t.object)
        }"]`,
      );
    }
    if (t.relation === "alliance" && t.object.startsWith("raid:")) {
      lines.push(
        `  ${id(t.user)}["${label(t.user)}"] -. shared .-> ${id(t.object)}["${
          label(t.object)
        }"]`,
      );
    }
  }
  for (const t of TUPLES) {
    if (t.relation === "attendee" && t.user.startsWith("user:")) {
      const p = persona(t.user);
      const node = `att_${id(t.user)}_${id(t.object)}`;
      lines.push(
        `  ${id(t.object)} -. attended .-> ${node}(["${p.emoji} ${p.name}"])`,
      );
    }
  }
  return lines.join("\n");
}

/** Channel ▸ who may read it. */
export function channelsChart(): string {
  const lines = ["graph LR"];
  for (const t of TUPLES) {
    if (t.relation === "viewer" && t.object.startsWith("channel:")) {
      const aud = `aud_${id(t.user)}`;
      lines.push(
        `  ${id(t.object)}["${label(t.object)}"] --> ${aud}{{"${
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
