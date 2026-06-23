/**
 * In-memory forum content (messages, bank balances, raid signups, MOTD).
 *
 * This is the *application* state the Guild Forum reads and mutates — separate
 * from OpenFGA, which only decides *who may* read or mutate it. It lives in the
 * server process (resets on restart), which is plenty to "live the story".
 */

export interface ForumMessage {
  id: string;
  author: string; // OpenFGA user id, e.g. "user:thrall"
  body: string;
  ts: number;
}

let seq = 1;

// channel object id -> messages (oldest first)
const messages = new Map<string, ForumMessage[]>();
// vault / vault_tab object id -> gold balance
const balances = new Map<string, number>();
// raid object id -> set of signed-up user ids
const signups = new Map<string, Set<string>>();
// "user|object" -> last successful withdrawal time (ms), for the cooldown
const lastWithdraw = new Map<string, number>();
let motd =
  "⚔️ Molten Core this weekend — bring fire resist! Officers, post assignments in the War Council.";

function seedMessage(channel: string, author: string, body: string) {
  const list = messages.get(channel) ?? [];
  list.push({ id: `m${seq++}`, author, body, ts: Date.now() });
  messages.set(channel, list);
}

// Seed a little life into the world.
seedMessage(
  "channel:tavern_board",
  "user:thrall",
  "Welcome, travelers! New recruits always wanted.",
);
seedMessage(
  "channel:tavern_board",
  "user:guest",
  "Heard Ironforge pays well. Where do I sign?",
);
seedMessage(
  "channel:general",
  "user:jaina",
  "Repair costs reimbursed from the bank this week.",
);
seedMessage(
  "channel:general",
  "user:arthas",
  "Who's tanking Molten Core? I'll DPS.",
);
seedMessage(
  "channel:war_council",
  "user:thrall",
  "Loot council: BiS first, alts last. No exceptions.",
);
seedMessage(
  "channel:pact_hall",
  "user:medivh",
  "Orgrimmar sends greetings to the Pact. 🤝",
);
seedMessage(
  "channel:orgrimmar_hall",
  "user:medivh",
  "Lok'tar! Orgrimmar war-room — for the Horde and the Pact.",
);

balances.set("vault:ironforge_bank", 18_500);
balances.set("vault:war_chest", 64_000);
balances.set("vault_tab:legendary", 9_200);
balances.set("vault_tab:materials", 3_100);
balances.set("vault_tab:treasury", 41_000);

signups.set("raid:molten_core", new Set(["user:thrall", "user:arthas"]));
signups.set("raid:blackwing_lair", new Set(["user:jaina", "user:arthas"]));
signups.set(
  "raid:onyxia",
  new Set([
    "user:thrall",
    "user:jaina",
    "user:arthas",
    "user:rexxar",
    "user:guldan",
    "user:medivh",
  ]),
);

// ── Messages ─────────────────────────────────────────────────────────────────
export function getMessages(channel: string): ForumMessage[] {
  return messages.get(channel) ?? [];
}

export function addMessage(
  channel: string,
  author: string,
  body: string,
): ForumMessage {
  const msg: ForumMessage = { id: `m${seq++}`, author, body, ts: Date.now() };
  const list = messages.get(channel) ?? [];
  list.push(msg);
  messages.set(channel, list);
  return msg;
}

export function deleteMessage(channel: string, id: string): boolean {
  const list = messages.get(channel);
  if (!list) return false;
  const i = list.findIndex((m) => m.id === id);
  if (i === -1) return false;
  list.splice(i, 1);
  return true;
}

// ── Bank ─────────────────────────────────────────────────────────────────────
export function getBalance(vault: string): number {
  return balances.get(vault) ?? 0;
}

export function adjustBalance(vault: string, delta: number): number {
  const next = getBalance(vault) + delta;
  balances.set(vault, next);
  return next;
}

/** Last time `user` withdrew from `object` (ms since epoch), or 0 if never. */
export function getLastWithdrawal(user: string, object: string): number {
  return lastWithdraw.get(`${user}|${object}`) ?? 0;
}

export function recordWithdrawal(
  user: string,
  object: string,
  at: number,
): void {
  lastWithdraw.set(`${user}|${object}`, at);
}

// ── Raids ────────────────────────────────────────────────────────────────────
export function getSignups(raid: string): string[] {
  return [...(signups.get(raid) ?? [])];
}

export function isSignedUp(raid: string, user: string): boolean {
  return signups.get(raid)?.has(user) ?? false;
}

export function addSignup(raid: string, user: string): void {
  const set = signups.get(raid) ?? new Set<string>();
  set.add(user);
  signups.set(raid, set);
}

// ── MOTD ─────────────────────────────────────────────────────────────────────
export function getMotd(): string {
  return motd;
}

export function setMotd(body: string): void {
  motd = body;
}
