import { define } from "@/utils.ts";
import ForumLogin from "@/islands/ForumLogin.tsx";

export default define.page(function Try() {
  return (
    <div class="mx-auto max-w-3xl space-y-6">
      <section>
        <h1 class="text-2xl font-bold text-amber-100">Try it out</h1>
        <p class="mt-2 text-slate-300">
          The pages above <em>explain</em>{" "}
          the model. This is the real thing: a working{" "}
          <strong>Ironforge Guild Forum</strong>{" "}
          where what you can see and do is decided live by OpenFGA. Pick who to
          sign in as — the forum opens in a new tab, logged in as that persona.
        </p>
        <p class="mt-2 text-sm text-slate-400">
          Sign in as several personas (each opens its own tab) and feel the
          difference: <span class="text-amber-300">Thrall</span> runs the guild;
          {" "}
          <span class="text-amber-300">Gul'dan</span>{" "}
          is banned and sees only the public board;{" "}
          <span class="text-amber-300">Medivh</span>{" "}
          is from an allied guild and reaches just the shared spaces;{" "}
          <span class="text-amber-300">a Guest</span> barely gets in the door.
        </p>
      </section>

      <ForumLogin />

      <p class="text-xs text-slate-500">
        The forum enforces every action on the server with a real{" "}
        <code>Check</code>{" "}
        — hiding a button is only convenience. Forum content (posts, balances,
        signups) lives in memory for the demo; the authorization model is the
        source of truth.
      </p>
    </div>
  );
});
