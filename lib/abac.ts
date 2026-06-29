import { SIGNUP_WINDOW } from "@/data/seed.ts";

export type AbacWhen = "before" | "now" | "after";

/** The signup-window `current_time` for a preset, relative to the seeded window. */
export function signupTime(when: AbacWhen): string {
  const opensAt = new Date(SIGNUP_WINDOW.opens_at).getTime();
  const closesAt = new Date(SIGNUP_WINDOW.closes_at).getTime();
  const day = 86_400_000;
  if (when === "before") return new Date(opensAt - day).toISOString();
  if (when === "after") return new Date(closesAt + day).toISOString();
  return new Date().toISOString();
}

/**
 * The dashboard's configurable ABAC context, read from the request query
 * (`?amount=&when=`). Shared by the header controls (which display amount/when)
 * and the dashboard handler (which checks under `amount` + `currentTime`).
 */
export function parseAbacParams(
  params: URLSearchParams,
): { amount: number; when: AbacWhen; currentTime: string } {
  const raw = params.get("amount");
  const parsed = raw === null || raw.trim() === "" ? NaN : Number(raw);
  const amount = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), 0), 5000)
    : 250;
  const whenRaw = params.get("when");
  const when: AbacWhen = whenRaw === "before" || whenRaw === "after"
    ? whenRaw
    : "now";
  return { amount, when, currentTime: signupTime(when) };
}
