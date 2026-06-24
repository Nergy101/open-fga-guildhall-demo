import { define } from "@/utils.ts";
import { check } from "@/lib/fga.ts";
import { personaUser } from "@/data/personas.ts";
import { getLastWithdrawal, recordWithdrawal } from "@/lib/forumState.ts";
import { WITHDRAW_COOLDOWN_SECONDS } from "@/data/seed.ts";

// Server-authoritative cooldown for the Cooldown Lab's live rows. The last
// withdrawal time lives in lib/forumState (the same store the forum uses), so a
// member's cooldown survives a page reload — and is re-checked by OpenFGA on
// every attempt, not just hidden behind a disabled button.

const VAULT = "vault:ironforge_bank";
const ROWS = ["jaina", "arthas"];
const CD_MS = WITHDRAW_COOLDOWN_SECONDS * 1000;

function remainingFor(user: string): number {
  const last = getLastWithdrawal(user, VAULT);
  if (!last) return 0;
  return Math.max(0, Math.ceil((last + CD_MS - Date.now()) / 1000));
}

async function canWithdrawNow(user: string, lastMs: number): Promise<boolean> {
  return await check({
    user,
    relation: "can_withdraw_now",
    object: VAULT,
    context: {
      current_time: new Date().toISOString(),
      last_withdrawal: new Date(lastMs).toISOString(),
    },
  });
}

export const handler = define.handlers({
  // Current remaining cooldown (seconds) per row persona — used to restore the
  // countdown after a reload.
  GET() {
    const status: Record<string, number> = {};
    for (const id of ROWS) status[id] = remainingFor(personaUser(id));
    return Response.json({
      cooldownSeconds: WITHDRAW_COOLDOWN_SECONDS,
      status,
    });
  },

  // Attempt a gated withdrawal for one persona.
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => ({})) as { persona?: string };
    if (!body.persona || !ROWS.includes(body.persona)) {
      return Response.json({ ok: false, message: "Unknown persona." }, {
        status: 400,
      });
    }
    const user = personaUser(body.persona);
    const now = Date.now();
    const last = getLastWithdrawal(user, VAULT);

    if (!(await canWithdrawNow(user, last || 0))) {
      return Response.json({
        ok: false,
        remaining: remainingFor(user),
        message: "🔒 Still on cooldown.",
      });
    }

    // Allowed. Probe with last_withdrawal = now: a member is then blocked
    // (cooldown applies), an officer is still allowed (bypass, no cooldown).
    const cooldownApplies = !(await canWithdrawNow(user, now));
    if (cooldownApplies) recordWithdrawal(user, VAULT, now);

    return Response.json({
      ok: true,
      cooldownApplies,
      remaining: cooldownApplies ? WITHDRAW_COOLDOWN_SECONDS : 0,
      message: cooldownApplies
        ? "✓ Withdrew — cooldown started."
        : "✓ Withdrew — officers have no cooldown.",
    });
  },
});
