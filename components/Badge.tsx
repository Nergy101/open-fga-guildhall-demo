/**
 * Live access result pill. When `user`/`relation`/`object` are provided it
 * renders as a clickable `.explain-chip` button (carrying the check coordinates
 * in data-* attributes) that the ExplainModal island turns into a "why?" popup.
 * Otherwise it renders as a plain span.
 */
export interface BadgeProps {
  allowed: boolean;
  abac?: boolean;
  user?: string;
  relation?: string;
  object?: string;
  context?: Record<string, unknown>;
  concept?: string;
}

export function Badge(props: BadgeProps) {
  const { allowed, abac, user, relation, object, context, concept } = props;
  const tone = allowed
    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
    : "bg-rose-500/15 text-rose-300 ring-rose-500/30";
  const base =
    `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${tone}`;
  const icon = abac ? "⏰" : allowed ? "✓" : "✕";
  const label = allowed
    ? (abac ? "Allowed*" : "Allowed")
    : (abac ? "Denied*" : "Denied");

  if (user && relation && object) {
    return (
      <button
        type="button"
        class={`explain-chip cursor-pointer transition hover:ring-2 hover:brightness-125 ${base}`}
        data-user={user}
        data-relation={relation}
        data-object={object}
        data-context={context ? JSON.stringify(context) : ""}
        data-concept={concept ?? ""}
        title="Click to see which OpenFGA rules decided this"
      >
        {icon} {label}
      </button>
    );
  }

  return (
    <span
      class={base}
      title={abac ? "ABAC result under the current context" : undefined}
    >
      {icon} {label}
    </span>
  );
}
