/**
 * The demo "personas" you switch between. Each id is an OpenFGA user id
 * (without the `user:` prefix) that has distinct access via the seeded tuples.
 */
export interface Persona {
  id: string;
  name: string;
  role: string;
  emoji: string;
  blurb: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "thrall",
    name: "Thrall",
    role: "Guildmaster",
    emoji: "👑",
    blurb:
      "Founder of Ironforge. Can do anything — including disband the guild.",
  },
  {
    id: "jaina",
    name: "Jaina",
    role: "Officer",
    emoji: "🛡️",
    blurb:
      "Manages members and the bank, leads raids. Can't disband or loot raids she skipped.",
  },
  {
    id: "arthas",
    name: "Arthas",
    role: "Raider",
    emoji: "⚔️",
    blurb:
      "Deposits freely, withdraws up to 500g, signs up while the window is open.",
  },
  {
    id: "rexxar",
    name: "Rexxar",
    role: "Recruit",
    emoji: "🌱",
    blurb:
      "Can't manage anything, but can sign up for raids and withdraw up to 100g.",
  },
  {
    id: "guldan",
    name: "Gul'dan",
    role: "Banned",
    emoji: "☠️",
    blurb:
      "On the blocklist: member perks revoked. Can still read the public tavern board.",
  },
  {
    id: "medivh",
    name: "Medivh",
    role: "Guildmaster · Orgrimmar",
    emoji: "👑",
    blurb:
      "Guildmaster of the allied guild Orgrimmar — full authority in his own guild. In Ironforge he reaches only the Pact hall and alliance-shared raids; nothing else.",
  },
  {
    id: "gamon",
    name: "Gamon",
    role: "Recruit · Orgrimmar",
    emoji: "🐂",
    blurb:
      "A lowly Orgrimmar recruit (and the city's favorite punching bag). Through the Pact he reaches the shared halls and his own guild's board, but leads nothing and moderates no one.",
  },
  {
    id: "guest",
    name: "Wandering Adventurer",
    role: "Guest",
    emoji: "🚶",
    blurb:
      "No guild membership at all. Only the public tavern board is visible.",
  },
];

export const DEFAULT_PERSONA = "thrall";

export function personaUser(id: string): string {
  return `user:${id}`;
}

export function getPersona(id: string | undefined | null): Persona {
  return PERSONAS.find((p) => p.id === id) ??
    PERSONAS.find((p) => p.id === DEFAULT_PERSONA)!;
}
