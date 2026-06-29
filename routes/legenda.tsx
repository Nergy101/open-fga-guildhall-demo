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
  const sections: {
    id: string;
    title: string;
    desc: string;
    chart: string;
    fill?: boolean;
  }[] = [
    {
      id: "ranks",
      title: "🪜 The rank ladder",
      desc:
        "Concentric ranks: each rank is also the one below it, all the way down to member — unless you're banned.",
      chart: RANK_LADDER_CHART,
    },
    {
      id: "guilds",
      title: "🏰 Guilds, alliance & members",
      desc:
        "Ironforge and allied Orgrimmar both belong to the Azeroth Pact. Each guild's members appear with their rank — Ironforge has three guildmasters (a majority must vote to depose one), Medivh leads Orgrimmar, and Gul'dan is on the blocklist.",
      chart: guildsChart(),
      fill: true,
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
        "The Azeroth Pact sits on top with both guilds beneath it. Ironforge owns its raids; Onyxia's Lair is shared, so Orgrimmar links into it too (that's how Medivh joins). Dotted lines show who attended, tagged with their guild.",
      chart: raidsChart(),
      fill: true,
    },
    {
      id: "channels",
      title: "💬 Channels & their audiences",
      desc:
        "Each channel belongs to a guild; the arrows show the rank needed to read or post (concentric — a higher rank inherits it). From the public tavern up to the officers-only war council, plus Orgrimmar's own board.",
      chart: channelsChart(),
      fill: true,
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
          <Mermaid id={s.id} chart={s.chart} fill={s.fill} />
        </section>
      ))}
    </div>
  );
});
