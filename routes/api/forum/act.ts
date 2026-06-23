import { define } from "@/utils.ts";
import { check } from "@/lib/fga.ts";
import { forumPersona, personaUser } from "@/lib/forumSession.ts";
import {
  addMessage,
  addSignup,
  adjustBalance,
  deleteMessage,
  getBalance,
  setMotd,
} from "@/lib/forumState.ts";

const GUILD = "guild:ironforge";

const LOOT = [
  "🗡️ Thunderfury, Blessed Blade of the Windseeker",
  "🛡️ Aegis of the Blood God",
  "💍 Band of Accuria",
  "🧪 Flask of the Titans",
  "📜 Tome of the Lost",
  "🪙 120 gold",
];

interface Body {
  kind?: string;
  channel?: string;
  messageId?: string;
  vault?: string;
  raid?: string;
  amount?: number;
  body?: string;
  target?: string;
}

/**
 * Asks OpenFGA for the largest amount the user may move (binary-search over the
 * ABAC limit) so a denial can name the actual cap instead of a generic "no".
 * Returns 0 when there is no grant at all.
 */
async function maxAllowed(
  user: string,
  relation: string,
  object: string,
  ceiling: number,
): Promise<number> {
  if (
    !(await check({ user, relation, object, context: { requested_amount: 1 } }))
  ) {
    return 0;
  }
  let lo = 1;
  let hi = Math.max(1, Math.ceil(ceiling) - 1);
  let best = 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (
      await check({
        user,
        relation,
        object,
        context: { requested_amount: mid },
      })
    ) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * The one place forum mutations happen — and every one is gated by a live
 * OpenFGA Check for the logged-in user before any state changes. Hiding a
 * button in the UI is convenience; THIS is the authorization.
 */
export const handler = define.handlers({
  async POST(ctx) {
    const persona = forumPersona(ctx.req);
    if (!persona) {
      return Response.json({ ok: false, message: "Not signed in." }, {
        status: 401,
      });
    }
    const user = personaUser(persona.id);
    const b = await ctx.req.json().catch(() => ({})) as Body;

    // Resolve the action into a single Check + a mutation to run if allowed.
    let relation: string;
    let object: string;
    let context: Record<string, unknown> | undefined;
    let run: () => { message: string; balance?: number };

    switch (b.kind) {
      case "post": {
        const text = (b.body ?? "").trim();
        if (!b.channel || !text) {
          return Response.json({ ok: false, message: "Empty message." }, {
            status: 400,
          });
        }
        relation = "can_post";
        object = b.channel;
        run = () => {
          addMessage(object, user, text);
          return { message: "Posted." };
        };
        break;
      }
      case "deleteMessage": {
        if (!b.channel || !b.messageId) {
          return Response.json({ ok: false, message: "Bad request." }, {
            status: 400,
          });
        }
        relation = "can_moderate";
        object = b.channel;
        run = () => {
          const ok = deleteMessage(b.channel!, b.messageId!);
          return { message: ok ? "Message removed." : "Already gone." };
        };
        break;
      }
      case "withdraw": {
        const amount = Number(b.amount);
        if (!b.vault || !(amount > 0)) {
          return Response.json({ ok: false, message: "Enter an amount." }, {
            status: 400,
          });
        }
        relation = "can_withdraw";
        object = b.vault;
        context = { requested_amount: amount };
        run = () => {
          if (getBalance(object) < amount) {
            return {
              message: "Insufficient funds.",
              balance: getBalance(object),
            };
          }
          const left = adjustBalance(object, -amount);
          return { message: `Withdrew ${amount}g.`, balance: left };
        };
        break;
      }
      case "deposit": {
        const amount = Number(b.amount);
        if (!b.vault || !(amount > 0)) {
          return Response.json({ ok: false, message: "Enter an amount." }, {
            status: 400,
          });
        }
        relation = "can_deposit";
        object = b.vault;
        context = { requested_amount: amount };
        run = () => {
          const left = adjustBalance(object, amount);
          return { message: `Deposited ${amount}g.`, balance: left };
        };
        break;
      }
      case "signup": {
        if (!b.raid) {
          return Response.json({ ok: false, message: "Bad request." }, {
            status: 400,
          });
        }
        relation = "can_signup";
        object = b.raid;
        context = { current_time: new Date().toISOString() };
        run = () => {
          addSignup(object, user);
          return { message: "You're on the roster!" };
        };
        break;
      }
      case "loot": {
        if (!b.raid) {
          return Response.json({ ok: false, message: "Bad request." }, {
            status: 400,
          });
        }
        relation = "can_loot";
        object = b.raid;
        run = () => ({
          message: `🎲 You rolled and won: ${
            LOOT[Math.floor(Math.random() * LOOT.length)]
          }`,
        });
        break;
      }
      case "setMotd": {
        const text = (b.body ?? "").trim();
        if (!text) {
          return Response.json({ ok: false, message: "Empty MOTD." }, {
            status: 400,
          });
        }
        relation = "can_edit_motd";
        object = GUILD;
        run = () => {
          setMotd(text);
          return { message: "Message of the day updated." };
        };
        break;
      }
      case "invite": {
        relation = "can_invite";
        object = GUILD;
        run = () => ({ message: "Invitation sent. (demo — not persisted)" });
        break;
      }
      case "kick": {
        const target = b.target;
        if (!target) {
          return Response.json({ ok: false, message: "Bad request." }, {
            status: 400,
          });
        }
        // Guildmasters cannot be kicked — not even by an officer.
        const targetIsGm = await check({
          user: `user:${target}`,
          relation: "guildmaster",
          object: GUILD,
        });
        if (targetIsGm) {
          return Response.json({
            ok: false,
            message: "🔒 You can't kick a guildmaster.",
          }, { status: 403 });
        }
        relation = "can_kick";
        object = GUILD;
        run = () => ({
          message: `${b.body || "Member"} kicked. (demo — not persisted)`,
        });
        break;
      }
      case "manageRanks": {
        relation = "can_manage_ranks";
        object = GUILD;
        run = () => ({ message: "Rank changes saved. (demo — not persisted)" });
        break;
      }
      case "disband": {
        relation = "can_disband";
        object = GUILD;
        run = () => ({
          message: "💥 The guild is disbanded. (demo — not persisted)",
        });
        break;
      }
      default:
        return Response.json({ ok: false, message: "Unknown action." }, {
          status: 400,
        });
    }

    const allowed = await check({ user, relation, object, context });
    if (!allowed) {
      let message =
        `🔒 Denied — OpenFGA says ${relation} on ${object} is not allowed for ${user}.`;
      if (
        (b.kind === "withdraw" || b.kind === "deposit") &&
        typeof b.amount === "number"
      ) {
        const cap = await maxAllowed(user, relation, object, b.amount);
        message = cap > 0
          ? `🔒 Over the limit — ${persona.name} may ${b.kind} at most ${cap}g here (you asked for ${b.amount}g).`
          : `🔒 ${persona.name} has no ${b.kind} access here.`;
      }
      return Response.json({ ok: false, message }, { status: 403 });
    }

    const result = run();
    return Response.json({ ok: true, ...result });
  },
});
