import { define } from "@/utils.ts";
import Mermaid from "@/islands/Mermaid.tsx";
import {
  bankChart,
  channelsChart,
  guildsChart,
  raidsChart,
  RANK_LADDER_CHART,
} from "@/data/legenda.ts";

export default define.page(function Legenda() {
  const sections = [
    {
      id: "guilds",
      title: "🏰 Guilds, alliance & members",
      desc:
        "Ironforge and allied Orgrimmar both belong to the Azeroth Pact. Each guild's members are shown with their rank — Gul'dan is on the blocklist.",
      chart: guildsChart(),
    },
    {
      id: "bank",
      title: "🏦 Vaults & tabs",
      desc:
        "The guild bank: each vault belongs to a guild, and each tab belongs to a vault (the three-level parent ▸ child hierarchy).",
      chart: bankChart(),
    },
    {
      id: "raids",
      title: "⚔️ Raids & attendance",
      desc:
        "Raids belong to a guild; Onyxia is shared with the whole alliance. Dotted lines show who actually attended.",
      chart: raidsChart(),
    },
    {
      id: "channels",
      title: "💬 Channels & their audiences",
      desc:
        "Who can read each board — from the public tavern (user:*) to guild groups, the alliance nested group, and Orgrimmar's own channel.",
      chart: channelsChart(),
    },
    {
      id: "ranks",
      title: "🪜 The rank ladder",
      desc:
        "Concentric ranks: each rank is also the one below it, all the way down to member — unless you're banned.",
      chart: RANK_LADDER_CHART,
    },
  ];

  return (
    <div class="space-y-8">
      <section>
        <h1 class="text-xl font-bold text-amber-100">🗺️ Legenda</h1>
        <p class="mt-1 text-sm text-slate-400">
          The seeded world at a glance — these diagrams are generated from the
          actual relationship tuples, so they always match the model.
        </p>
      </section>

      {sections.map((s) => (
        <section key={s.id} class="space-y-2">
          <div>
            <h2 class="text-lg font-bold text-amber-100">{s.title}</h2>
            <p class="text-sm text-slate-400">{s.desc}</p>
          </div>
          <Mermaid id={s.id} chart={s.chart} />
        </section>
      ))}
    </div>
  );
});
