import { define } from "@/utils.ts";
import PersonaSwitcher from "@/islands/PersonaSwitcher.tsx";
import ExplainModal from "@/islands/ExplainModal.tsx";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/explorer", label: "Access Matrix" },
  { href: "/labs", label: "Labs" },
  { href: "/playground", label: "Playground" },
  { href: "/model", label: "Model" },
  { href: "/try", label: "Try it out" },
];

export default define.page(function App({ Component, state, url }) {
  const persona = state.persona;
  const bare = url.pathname.startsWith("/forum");
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GuildHall · OpenFGA explorer</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body class="min-h-screen bg-slate-950 text-slate-200 antialiased">
        {bare ? <Component /> : (
          <>
            <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
              <div class="mx-auto max-w-6xl px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <img
                      src="/favicon.svg"
                      width="32"
                      height="32"
                      alt="GuildHall crest"
                      class="h-8 w-8"
                    />
                    <div>
                      <div class="font-bold tracking-tight text-amber-200">
                        GuildHall
                      </div>
                      <div class="text-[11px] text-slate-400">
                        A fine-grained authorization demo, powered by OpenFGA
                      </div>
                    </div>
                  </div>
                  <nav class="flex gap-1 text-sm">
                    {NAV.map((n) => {
                      const active = url.pathname === n.href;
                      const highlight = n.href === "/try";
                      return (
                        <a
                          key={n.href}
                          href={n.href}
                          class={`rounded-md px-3 py-1.5 transition-colors ${
                            active
                              ? "bg-amber-400/15 text-amber-100"
                              : highlight
                              ? "text-amber-200 hover:bg-amber-400/10"
                              : "text-slate-300 hover:bg-slate-800"
                          } ${highlight ? "ring-1 ring-amber-400/70" : ""}`}
                        >
                          {n.label}
                        </a>
                      );
                    })}
                  </nav>
                </div>

                <div class="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3">
                  <div class="flex items-center gap-2 text-xs text-slate-400">
                    <span>Acting as</span>
                    <span class="font-mono text-amber-300">
                      user:{persona.id}
                    </span>
                    <span class="text-slate-600">
                      — switch persona to watch access change:
                    </span>
                  </div>
                  <PersonaSwitcher current={persona.id} />
                </div>
              </div>
            </header>

            <main class="mx-auto max-w-6xl px-4 py-6">
              <Component />
            </main>

            <footer class="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-500">
              Every badge is a live OpenFGA{" "}
              <code>Check</code>. Run your own checks in the{" "}
              <a class="underline hover:text-slate-300" href="/playground">
                Playground
              </a>{" "}
              ·{" "}
              <a
                class="underline hover:text-slate-300"
                href="https://github.com/Nergy101/open-fga-guildhall-demo"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub ↗
              </a>.
            </footer>
            <ExplainModal />
          </>
        )}
      </body>
    </html>
  );
});
