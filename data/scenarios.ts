/**
 * Demo "scenarios" — each a small, presenter-friendly story about the guilds
 * and their heroes, backed by one interactive lab. Listed on /labs; each opens
 * its own focused page at /labs/<id> so a demo can stay bite-sized.
 */
export type LabId =
  | "rank-ladder"
  | "ban-toggle"
  | "abac-withdraw"
  | "abac-signup"
  | "cooldown"
  | "reachability"
  | "council";

export interface Scenario {
  /** URL slug under /labs. */
  id: string;
  emoji: string;
  title: string;
  /** One-line teaser for the list card. */
  hook: string;
  /** The fuller narrative a presenter reads aloud on the detail page. */
  story: string;
  /** The OpenFGA feature it shows off (rendered as a tag). */
  concept: string;
  /** Who the story is about. */
  cast: string;
  /** Which lab component the detail page renders. */
  lab: LabId;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "recruit-climb",
    emoji: "🌱",
    title: "The Recruit's Climb",
    hook:
      "A wide-eyed newcomer signs Ironforge's charter — promote them rung by rung and watch the keys to the kingdom appear.",
    story:
      "Every hero starts somewhere. A fresh recruit can barely read the guild board — but promote them to raider, then officer, then guildmaster, and each tier unlocks new powers. Every rank quietly inherits everything the rank above it can do: that's concentric relations at work. (The rank is granted as a contextual tuple — nothing is written to the store.)",
    concept: "Concentric ranks",
    cast: "A newcomer to Ironforge",
    lab: "rank-ladder",
  },
  {
    id: "fall-from-grace",
    emoji: "☠️",
    title: "Fall from Grace",
    hook:
      "Gul'dan was one of us — until he wasn't. Flip the blocklist and watch every privilege vanish in a single stroke.",
    story:
      "Trust is hard to earn and easy to lose. The moment a member lands on the blocklist, every member-derived perk goes dark at once — the bank, the channels, raid signups — while the public tavern board stays open to all. A single exclusion rule (member: recruit but not banned) does all the work.",
    concept: "Exclusion / blocklist",
    cast: "Gul'dan (and anyone you ban)",
    lab: "ban-toggle",
  },
  {
    id: "vault-limit",
    emoji: "💰",
    title: "The Vault Limit",
    hook:
      "The treasurer eyes the gold. How much can each hero actually withdraw before the rules say 'no'?",
    story:
      "Officers move gold freely. Everyone else is capped — members to 100g, Arthas to a generous 500g — and the cap is checked at the moment of withdrawal against the amount requested. Slide the amount and watch each hero's badge flip as the attribute-based rule weighs the request.",
    concept: "ABAC — withdrawal_within_limit",
    cast: "The whole roster",
    lab: "abac-withdraw",
  },
  {
    id: "signup-window",
    emoji: "🔥",
    title: "Molten Core's Signup Window (Ironforge-only)",
    hook:
      "Molten Core is Ironforge's alone — and its roster opens on a clock. Show up too early, too late, or from the wrong guild, and the door is shut.",
    story:
      "Molten Core is an Ironforge-only raid — it is not shared with the alliance, so allied heroes cannot sign up at all. For Ironforge's own members, signups open only within a set window: travel to before, during, or after and watch who gets in as the condition compares the current time against the window at check time.",
    concept: "ABAC — within_signup_window",
    cast: "Ironforge members",
    lab: "abac-signup",
  },
  {
    id: "withdrawal-cooldown",
    emoji: "⏳",
    title: "One Withdrawal at a Time",
    hook:
      "No draining the vault dry. A cooldown holds members to one withdrawal per window — officers excepted.",
    story:
      "After a member withdraws, a cooldown locks them out until enough time has passed. Set how long ago they last dipped in and watch the gate lift — OpenFGA does the temporal math from the request context. Officers, of course, bypass it entirely.",
    concept: "ABAC — cooldown_elapsed",
    cast: "Members vs officers",
    lab: "cooldown",
  },
  {
    id: "reachability",
    emoji: "🧭",
    title: "Who Can Reach What?",
    hook:
      "Turn the question inside out: not 'can this hero do X?' but 'everything this hero can reach.'",
    story:
      "The access matrix asks 'can persona X do Y on object Z?'. This flips it: for each hero, list every object of a type they can reach (ListObjects) — channels, raids, vaults — side by side. It's the mirror image of a Check, and a quick way to spot who is over- or under-powered.",
    concept: "Reverse query — ListObjects",
    cast: "All heroes, compared",
    lab: "reachability",
  },
  {
    id: "council-vote",
    emoji: "🗳️",
    title: "The Vote to Depose",
    hook:
      "One guildmaster has overstepped. It takes a majority of the council to show them the door.",
    story:
      "OpenFGA can't count — so 'a majority of guildmasters' lives in the app. Cast votes on the motion and watch the tally; once a majority agrees, the app grants `passed`. Even then, only another guildmaster — never the target — can open the can_remove gate: the model decides who may act, the app supplies the count.",
    concept: "App-level counting + model gate",
    cast: "Ironforge's guildmasters",
    lab: "council",
  },
];
