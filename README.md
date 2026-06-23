<p align="center">
  <img src="static/favicon.svg" alt="GuildHall crest" width="120" height="120" />
</p>

<h1 align="center">GuildHall — an OpenFGA explorer</h1>

A hands-on demo of [OpenFGA](https://openfga.dev) (fine-grained,
relationship-based authorization) modeled as an **MMORPG guild manager**, with a
[Deno Fresh](https://fresh.deno.dev) frontend. Switch between personas and watch
access light up or grey out — every badge is a **live `Check` against a real
OpenFGA server**.

## What it demonstrates

The authorization model (`lib/model.fga`) is deliberately broad — it exercises
every major OpenFGA feature:

| Feature                               | Where                                                               |
| ------------------------------------- | ------------------------------------------------------------------- |
| Concentric roles (rank ladder)        | `guild`: guildmaster ▸ officer ▸ raider ▸ recruit                   |
| Blocklist (`but not`)                 | `guild.member: recruit but not banned`                              |
| Parent → child → grandchild hierarchy | `vault_tab` ▸ `vault` ▸ `guild`                                     |
| Usersets / groups                     | `guild#officer`, `guild#member` on channels                         |
| Nested groups (userset of usersets)   | `alliance.member: member from guild`                                |
| Public access                         | `channel:tavern_board` viewer `user:*`                              |
| Intersection (`and`)                  | `raid.can_loot: attendee and raider from guild`                     |
| Union across sources (`or`)           | `raid.can_view: member from guild or member from alliance`          |
| Exclusion overrides attendance        | `raid.can_view_tactics: (attendee or leader) but not banned`        |
| Cross-org sharing (alliance raids)    | allied guilds' members view, sign up, and roll loot on shared raids |
| ABAC condition (numeric)              | `withdrawal_within_limit` on the vault                              |
| ABAC condition (temporal)             | `within_signup_window` on the raid                                  |

### Personas

|    | Persona                          | Access                                                           |
| -- | -------------------------------- | ---------------------------------------------------------------- |
| 👑 | **Thrall** — Guildmaster         | everything                                                       |
| 🛡️ | **Jaina** — Officer              | manage members + bank, lead raids                                |
| ⚔️ | **Arthas** — Raider              | deposit, withdraw ≤ 500g, sign up                                |
| 🌱 | **Rexxar** — Recruit             | can't manage; can sign up + withdraw ≤ 100g                      |
| ☠️ | **Gul'dan** — Banned             | member perks revoked; public board still readable                |
| 🤝 | **Medivh** — Allied guild        | the Pact hall + alliance-shared raids; nothing else in Ironforge |
| 🚶 | **Wandering Adventurer** — Guest | only the public tavern board                                     |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (+ Compose)
- [Deno](https://deno.com) 2.x

## Run it

```sh
# 1. Start OpenFGA (HTTP :8088, gRPC :8089, Playground :3000) + Postgres
docker compose up -d

# 2. Install deps (first time only)
deno install

# 3. Compile the model, create the store, write the tuples
deno task seed

# 4. Start the app (prints a localhost URL, e.g. http://localhost:5173)
deno task dev
```

> Host ports 8080/8081 are commonly taken (e.g. by SSH tunnels), so OpenFGA's
> HTTP API is mapped to **:8088**. Override with `FGA_API_URL` if you change it.

### Verify

```sh
deno task test     # asserts the entire access matrix against the live server
```

## Pages

- **🎮 Try it out** (`/try`) — sign in as a persona and a **real, usable Guild
  Forum** opens in a new tab, logged in as that user. The left side-nav reveals
  only the sections you may reach, and every action (post, withdraw, sign up,
  roll loot, kick, edit MOTD…) is enforced **server-side** with a live `Check` —
  hiding a button is only convenience. Sign in as several personas to feel the
  difference: Thrall runs the guild; Gul'dan (banned) sees only the public
  Tavern board; Medivh (allied) reaches the shared raid and can roll loot; a
  Guest barely gets in the door.
- **Dashboard** (`/`) — resource cards grouped into sections (The Guild, Guild
  Bank, Guild Raids, Channels), each with a live access badge per action. Vaults
  render as panels with their tabs nested inside, so the vault ▸ tab hierarchy
  is visible at a glance.
- **Click any badge** for a popup explaining _why_: the relation's DSL rule, the
  ABAC condition (with the context used), the relevant tuples, and the Expand
  "rules graph" — powered by `/api/explain`.
- **Access Matrix** (`/explorer`) — every persona × action in one grid, plus
  four interactive **labs** that re-run live checks as you tweak inputs:
  - **ABAC Lab** — drag the withdrawal slider / flip the signup window and watch
    each persona's result change as conditions are evaluated at check time.
  - **🪜 Rank Ladder Lab** — promote a newcomer up the rank ladder (via a
    contextual tuple, no store mutation) and watch permissions unlock in tiers —
    concentric relations made visible.
  - **☠️ Ban Toggle Lab** — blocklist a member and watch every member-derived
    perk go dark at once (`member: recruit but not banned`), while the public
    board stays readable.
  - **🧭 Reachability Lab** — the reverse query: `ListObjects` shows which
    objects each persona can reach for a relation, side by side.
- **Playground** (`/playground`) — run arbitrary `Check` / `ListObjects` calls.
- **Model** (`/model`) — the DSL, all seeded tuples, the persona legend, and the
  store/model ids.

You can also poke the raw store in the bundled OpenFGA **Playground** at
[localhost:3000/playground](http://localhost:3000/playground).

## How it fits together

```
docker-compose.yaml   OpenFGA + Postgres
lib/model.fga         the authorization model (DSL, source of truth)
data/seed.ts          every relationship tuple (incl. conditional/ABAC tuples)
data/personas.ts      the 7 demo personas
data/catalog.ts       resources × actions shown in the UI + tests
scripts/seed.ts       DSL → JSON, create store, write model + tuples → fga.local.json
lib/fga.ts            tiny fetch-based client: Check / BatchCheck / ListObjects
lib/access.ts         builds the (persona × action) check set
routes/_middleware.ts resolves the persona cookie → ctx.state
routes/, islands/     the Fresh UI
tests/model_test.ts   the access matrix, asserted against live OpenFGA
routes/forum/*         the real Guild Forum (own side-nav + server-enforced actions)
routes/api/forum/act.ts every forum mutation, each gated by a live OpenFGA Check
lib/forumState.ts      in-memory forum content (messages, balances, signups)
```

The model is authored once in the readable FGA DSL and compiled to the API's
JSON form at seed time via `@openfga/syntax-transformer`. The Fresh app itself
has **no OpenFGA SDK dependency** — it talks to the server with plain `fetch`.

## Reset

Re-running `deno task seed` deletes and recreates the `guildhall` store
(idempotent). To wipe everything: `docker compose down -v`.
