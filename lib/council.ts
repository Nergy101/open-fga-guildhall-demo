/**
 * The Guild Council's single demo motion: whether to depose Magni. The forum
 * lets a logged-in guildmaster live through the vote — Muradin has already
 * moved, so the council needs one more vote to reach a majority and open the
 * `can_remove` gate. Shared by the forum page and its action handler.
 */
import { TUPLES } from "@/data/seed.ts";

export const GUILD = "guild:ironforge";

export const MOTION = {
  id: "kick_motion:depose_magni",
  /** The persona id being deposed. */
  target: "magni",
  targetName: "Magni",
  /** Who already moved to depose (their vote is seeded into the forum state). */
  initiatorName: "Muradin",
};

/** The council = every guildmaster of the guild; deposing one needs a majority. */
export const GUILDMASTERS: string[] = TUPLES
  .filter((t) => t.relation === "guildmaster" && t.object === GUILD)
  .map((t) => t.user.replace(/^user:/, ""));

export const MAJORITY = Math.floor(GUILDMASTERS.length / 2) + 1;
