/**
 * Game state (forum posts, bank balances, raid signups, withdrawal cooldowns,
 * MOTD) — the demo's *non-authorization* data. It lives in a SQLite database
 * file (`gamestate.db`) on disk, separate from OpenFGA's Postgres store: OpenFGA
 * owns the authorization tuples; this owns the world's mutable content.
 *
 * The DB is RE-SEEDED on every backend start: tables are created if missing,
 * then wiped and re-filled with the baseline below. So mutations persist across
 * requests (in a real DB you can inspect), but each restart returns a clean,
 * known world — matching the demo's "the model is the source of truth" stance.
 */
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export interface ForumMessage {
  id: string;
  author: string; // OpenFGA user id, e.g. "user:thrall"
  body: string;
  ts: number;
}

const DB_PATH = fileURLToPath(new URL("../gamestate.db", import.meta.url));
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    author  TEXT NOT NULL,
    body    TEXT NOT NULL,
    ts      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages (channel, id);

  CREATE TABLE IF NOT EXISTS balances (
    vault TEXT PRIMARY KEY,
    gold  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS signups (
    raid  TEXT NOT NULL,
    actor TEXT NOT NULL,
    PRIMARY KEY (raid, actor)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    actor  TEXT NOT NULL,
    object TEXT NOT NULL,
    at     INTEGER NOT NULL,
    PRIMARY KEY (actor, object)
  );

  CREATE TABLE IF NOT EXISTS motd (
    id   INTEGER PRIMARY KEY CHECK (id = 1),
    body TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    motion TEXT NOT NULL,
    voter  TEXT NOT NULL,
    PRIMARY KEY (motion, voter)
  );
`);

// Prepared statements (schema-only, reused for every request).
const insertMessage = db.prepare(
  "INSERT INTO messages (channel, author, body, ts) VALUES (?, ?, ?, ?)",
);
const selectMessages = db.prepare(
  "SELECT id, author, body, ts FROM messages WHERE channel = ? ORDER BY id",
);
const removeMessage = db.prepare(
  "DELETE FROM messages WHERE channel = ? AND id = ?",
);
const selectBalance = db.prepare("SELECT gold FROM balances WHERE vault = ?");
const upsertBalance = db.prepare(
  "INSERT INTO balances (vault, gold) VALUES (?, ?) " +
    "ON CONFLICT(vault) DO UPDATE SET gold = excluded.gold",
);
const selectWithdrawal = db.prepare(
  "SELECT at FROM withdrawals WHERE actor = ? AND object = ?",
);
const upsertWithdrawal = db.prepare(
  "INSERT INTO withdrawals (actor, object, at) VALUES (?, ?, ?) " +
    "ON CONFLICT(actor, object) DO UPDATE SET at = excluded.at",
);
const selectSignups = db.prepare(
  "SELECT actor FROM signups WHERE raid = ? ORDER BY actor",
);
const selectSignupOne = db.prepare(
  "SELECT 1 FROM signups WHERE raid = ? AND actor = ?",
);
const insertSignup = db.prepare(
  "INSERT OR IGNORE INTO signups (raid, actor) VALUES (?, ?)",
);
const selectMotd = db.prepare("SELECT body FROM motd WHERE id = 1");
const upsertMotd = db.prepare(
  "INSERT INTO motd (id, body) VALUES (1, ?) " +
    "ON CONFLICT(id) DO UPDATE SET body = excluded.body",
);
const selectVotes = db.prepare(
  "SELECT voter FROM votes WHERE motion = ? ORDER BY voter",
);
const insertVote = db.prepare(
  "INSERT OR IGNORE INTO votes (motion, voter) VALUES (?, ?)",
);

// ── Baseline world (re-applied on every start) ───────────────────────────────
// [channel, author, body], in display order (oldest first per channel).
const SEED_MESSAGES: [string, string, string][] = [
  [
    "channel:tavern_board",
    "user:thrall",
    "Welcome, travelers! New recruits always wanted.",
  ],
  [
    "channel:tavern_board",
    "user:guest",
    "Heard Ironforge pays well. Where do I sign?",
  ],
  [
    "channel:general",
    "user:jaina",
    "Repair costs reimbursed from the bank this week.",
  ],
  ["channel:general", "user:arthas", "Who's tanking Molten Core? I'll DPS."],
  [
    "channel:war_council",
    "user:thrall",
    "Loot council: BiS first, alts last. No exceptions.",
  ],
  [
    "channel:pact_hall",
    "user:medivh",
    "Orgrimmar sends greetings to the Pact. 🤝",
  ],
  [
    "channel:orgrimmar_hall",
    "user:medivh",
    "Lok'tar! Orgrimmar war-room — for the Horde and the Pact.",
  ],

  // Public tavern board — open to all, including the banned and curious passers-by.
  [
    "channel:tavern_board",
    "user:thrall",
    "Talk to an officer, traveler. Bring coin for your own repair bills.",
  ],
  [
    "channel:tavern_board",
    "user:guest",
    "...how much are we talking, on these repair bills",
  ],
  [
    "channel:tavern_board",
    "user:guldan",
    "Don't bother. They work you to the bone and bench you anyway. ☠️",
  ],
  [
    "channel:tavern_board",
    "user:thrall",
    "Ignore the ghoul, friend. He's on the blocklist for a reason.",
  ],
  ["channel:tavern_board", "user:guest", "Is the reason... the way he types?"],

  // Members-only general — where the guild actually hangs out.
  [
    "channel:general",
    "user:rexxar",
    "I can offtank! Probably. I have a shield and everything. 🌱🛡️",
  ],
  [
    "channel:general",
    "user:arthas",
    "Rexxar 'probably' tanking is how we wiped on the trash pull last week 😂",
  ],
  [
    "channel:general",
    "user:jaina",
    "Be kind. Everyone pulls aggro their first raid. Some of us just keep doing it, Arthas.",
  ],
  [
    "channel:general",
    "user:arthas",
    "That was ONE time. The healers adore me.",
  ],
  [
    "channel:general",
    "user:thrall",
    "The healers FEAR you, Arthas. It is not the same thing.",
  ],
  [
    "channel:general",
    "user:rexxar",
    "Free repairs though? Count me in — my armor is held together with hope.",
  ],
  [
    "channel:general",
    "user:jaina",
    "Hope and a great deal of guild gold. Mind the bank, recruits. 👀",
  ],
  [
    "channel:general",
    "user:arthas",
    "Speaking of gold — the bank says I withdrew 500g. I did NOT withdraw 500g.",
  ],
  [
    "channel:general",
    "user:jaina",
    "You did. For 'raid consumables.' The ledger reads: Hearthstone toys, x40. 🧸",
  ],
  ["channel:general", "user:arthas", "Those are TACTICAL."],
  ["channel:general", "user:rexxar", "I want tactical toys 😔"],
  [
    "channel:general",
    "user:thrall",
    "Rexxar, you're a recruit — your withdrawal cap is 100g. You may afford one tactical toy.",
  ],
  ["channel:general", "user:rexxar", "🫡 One toy. Understood."],
  [
    "channel:general",
    "user:jaina",
    "Back on topic: Molten Core, Saturday, 8pm. Fire resist gear or you sit the bench.",
  ],
  [
    "channel:general",
    "user:arthas",
    "I'll bring fire resist AND my best-in-slot sword. 🗡️",
  ],
  [
    "channel:general",
    "user:thrall",
    "It is a one-handed sword, Arthas. We have discussed the hat situation.",
  ],
  ["channel:general", "user:rexxar", "...what hat situation"],
  [
    "channel:general",
    "user:jaina",
    "You're happier not knowing, recruit. Trust me.",
  ],

  // War council — officers only; they gossip about the raiders who can't read this.
  [
    "channel:war_council",
    "user:jaina",
    "Define 'BiS' before Arthas argues his sword is best-in-slot for every slot.",
  ],
  [
    "channel:war_council",
    "user:thrall",
    "Especially the helm. No, Arthas may not wear a greatsword as a hat.",
  ],
  [
    "channel:war_council",
    "user:jaina",
    "Assignments posted. Let's keep the new tank alive past phase one this time.",
  ],

  // Alliance hall — officers of any pact guild.
  [
    "channel:pact_hall",
    "user:thrall",
    "Greetings returned, Medivh. The hall stands open to the Pact.",
  ],
  [
    "channel:pact_hall",
    "user:medivh",
    "Generous of Ironforge. The mead is excellent, by the way. 🍷",
  ],

  // Shared pact general — every pact member reads AND posts. Cross-guild chaos.
  [
    "channel:pact_general",
    "user:medivh",
    "Pact business: who's covering the shared Onyxia lockout this week?",
  ],
  [
    "channel:pact_general",
    "user:jaina",
    "Ironforge brings healers and a tank. Or 'a tank,' as Arthas bills himself.",
  ],
  [
    "channel:pact_general",
    "user:arthas",
    "I can SEE this channel, Jaina. We share it. With Orgrimmar.",
  ],
  [
    "channel:pact_general",
    "user:medivh",
    "Ah, the famed Ironforge harmony. The Horde admires your... teamwork. 🤝",
  ],
  [
    "channel:pact_general",
    "user:rexxar",
    "Wait, we share loot with Orgrimmar? Nobody tell my bags.",
  ],

  // Orgrimmar's own hall — Ironforge can't read a word of this.
  [
    "channel:orgrimmar_hall",
    "user:medivh",
    "Ironforge can't read this one. Speak freely, Horde. 😏",
  ],
];

const SEED_BALANCES: [string, number][] = [
  ["vault:ironforge_bank", 18_500],
  ["vault:war_chest", 64_000],
  ["vault_tab:legendary", 9_200],
  ["vault_tab:materials", 3_100],
  ["vault_tab:treasury", 41_000],
];

const SEED_SIGNUPS: [string, string[]][] = [
  ["raid:molten_core", ["user:thrall", "user:arthas"]],
  ["raid:blackwing_lair", ["user:jaina", "user:arthas"]],
  ["raid:onyxia", [
    "user:thrall",
    "user:jaina",
    "user:arthas",
    "user:rexxar",
    "user:guldan",
    "user:medivh",
    "user:gamon",
  ]],
];

const SEED_MOTD =
  "⚔️ Molten Core this weekend — bring fire resist! Officers, post assignments in the War Council.";

// Muradin has already moved to depose Magni — the council awaits more votes.
const SEED_VOTES: [string, string[]][] = [
  ["kick_motion:depose_magni", ["user:muradin"]],
];

// Wipe and re-fill the world. Runs once per process start.
function reseed(): void {
  db.exec("BEGIN");
  db.exec(
    "DELETE FROM messages; DELETE FROM balances; DELETE FROM signups; " +
      "DELETE FROM withdrawals; DELETE FROM motd; DELETE FROM votes; " +
      "DELETE FROM sqlite_sequence WHERE name = 'messages';",
  );
  const now = Date.now();
  for (const [channel, author, body] of SEED_MESSAGES) {
    insertMessage.run(channel, author, body, now);
  }
  for (const [vault, gold] of SEED_BALANCES) upsertBalance.run(vault, gold);
  for (const [raid, actors] of SEED_SIGNUPS) {
    for (const actor of actors) insertSignup.run(raid, actor);
  }
  for (const [motion, voters] of SEED_VOTES) {
    for (const voter of voters) insertVote.run(motion, voter);
  }
  upsertMotd.run(SEED_MOTD);
  db.exec("COMMIT");
}

reseed();

// ── Messages ─────────────────────────────────────────────────────────────────
export function getMessages(channel: string): ForumMessage[] {
  const rows = selectMessages.all(channel) as {
    id: number | bigint;
    author: string;
    body: string;
    ts: number | bigint;
  }[];
  return rows.map((r) => ({
    id: String(r.id),
    author: r.author,
    body: r.body,
    ts: Number(r.ts),
  }));
}

export function addMessage(
  channel: string,
  author: string,
  body: string,
): ForumMessage {
  const ts = Date.now();
  const info = insertMessage.run(channel, author, body, ts);
  return { id: String(info.lastInsertRowid), author, body, ts };
}

export function deleteMessage(channel: string, id: string): boolean {
  const rowId = Number(id);
  if (!Number.isInteger(rowId)) return false;
  return Number(removeMessage.run(channel, rowId).changes) > 0;
}

// ── Bank ─────────────────────────────────────────────────────────────────────
export function getBalance(vault: string): number {
  const row = selectBalance.get(vault) as { gold: number | bigint } | undefined;
  return row ? Number(row.gold) : 0;
}

export function adjustBalance(vault: string, delta: number): number {
  const next = getBalance(vault) + delta;
  upsertBalance.run(vault, next);
  return next;
}

/** Last time `user` withdrew from `object` (ms since epoch), or 0 if never. */
export function getLastWithdrawal(user: string, object: string): number {
  const row = selectWithdrawal.get(user, object) as
    | { at: number | bigint }
    | undefined;
  return row ? Number(row.at) : 0;
}

export function recordWithdrawal(
  user: string,
  object: string,
  at: number,
): void {
  upsertWithdrawal.run(user, object, at);
}

// ── Raids ────────────────────────────────────────────────────────────────────
export function getSignups(raid: string): string[] {
  const rows = selectSignups.all(raid) as { actor: string }[];
  return rows.map((r) => r.actor);
}

export function isSignedUp(raid: string, user: string): boolean {
  return selectSignupOne.get(raid, user) !== undefined;
}

export function addSignup(raid: string, user: string): void {
  insertSignup.run(raid, user);
}

// ── MOTD ─────────────────────────────────────────────────────────────────────
export function getMotd(): string {
  const row = selectMotd.get() as { body: string } | undefined;
  return row?.body ?? "";
}

export function setMotd(body: string): void {
  upsertMotd.run(body);
}

// ── Council votes ─────────────────────────────────────────────────────────────
export function getVotes(motion: string): string[] {
  const rows = selectVotes.all(motion) as { voter: string }[];
  return rows.map((r) => r.voter);
}

export function addVote(motion: string, voter: string): void {
  insertVote.run(motion, voter);
}
