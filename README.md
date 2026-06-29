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

| Feature                               | Where                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Concentric roles (rank ladder)        | `guild`: guildmaster ▸ officer ▸ raider ▸ recruit                                                                                       |
| Blocklist (`but not`)                 | `guild.member: recruit but not banned`                                                                                                  |
| Parent → child → grandchild hierarchy | `vault_tab` ▸ `vault` ▸ `guild`                                                                                                         |
| Usersets / groups                     | `guild#officer`, `guild#member` on channels                                                                                             |
| Nested groups (userset of usersets)   | `alliance.member: member from guild`                                                                                                    |
| Public access                         | `channel:tavern_board` viewer `user:*`                                                                                                  |
| Intersection (`and`)                  | `raid.can_loot: attendee and raider from guild`                                                                                         |
| Union across sources (`or`)           | `raid.can_view: member from guild or member from alliance`                                                                              |
| Exclusion overrides attendance        | `raid.can_view_tactics: (attendee or leader) but not banned`                                                                            |
| Cross-org sharing (alliance raids)    | allied guilds' members view, sign up, and roll loot on shared raids                                                                     |
| ABAC condition (numeric)              | `withdrawal_within_limit` on the vault                                                                                                  |
| ABAC condition (temporal)             | `within_signup_window` on the raid                                                                                                      |
| ABAC time-based cooldown              | `cooldown_elapsed` — one withdrawal per window (app supplies `last_withdrawal`)                                                         |
| Majority vote (app-tallied)           | `kick_motion`: deposing a guildmaster needs a council majority; only another guildmaster (not the target) may execute it (`can_remove`) |

### Personas

|    | Persona                                        | Access                                                                       |
| -- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 👑 | **Thrall** — Guildmaster                       | everything                                                                   |
| 🛡️ | **Jaina** — Officer                            | manage members + bank, lead raids                                            |
| ⚔️ | **Arthas** — Raider                            | deposit, withdraw ≤ 500g, sign up                                            |
| 🌱 | **Rexxar** — Recruit                           | can't manage; can sign up + withdraw ≤ 100g                                  |
| ☠️ | **Gul'dan** — Banned                           | member perks revoked; public board still readable                            |
| 🤝 | **Medivh** — Guildmaster of Orgrimmar (allied) | leads his own guild; in Ironforge only the Pact hall + alliance-shared raids |
| 🚶 | **Wandering Adventurer** — Guest               | only the public tavern board                                                 |

> Ironforge also has two NPC co-guildmasters, **Magni** & **Muradin**. A guild
> can have several guildmasters, and deposing one takes a **majority council
> vote** — OpenFGA can't count, so the app tallies the votes and grants the
> `passed` relation that gates `can_remove` (see the Guild Council Lab).

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (+ Compose)
- [Deno](https://deno.com) 2.x

## Run it

```sh
# 1. Start OpenFGA (HTTP :8088, gRPC :8089, Playground :4000) + Postgres, and
#    auto-seed the `guildhall` store. A one-shot `seed` service compiles the
#    model and writes every tuple as soon as OpenFGA is up — no manual step.
docker compose up -d

# 2. Install deps (first time only)
deno install

# 3. Start the app (prints a localhost URL, e.g. http://localhost:5173)
deno task dev
```

> Host ports 8080/8081 are commonly taken (e.g. by SSH tunnels), so OpenFGA's
> HTTP API is mapped to **:8088**. Override with `FGA_API_URL` if you change it.

> The bundled **OpenFGA Playground** is enabled at
> **<http://localhost:4000/playground>**, but it's a _from-scratch authoring
> sandbox_: it embeds play.fga.dev, prompts you to **create a new store**, only
> runs on `localhost`, and (per OpenFGA's docs) shows up to 100 tuples while
> skipping conditional/contextual ones — so it does **not** load the live
> `guildhall` store. To explore guildhall itself, use the app's **Access
> Matrix**, **Tuple Graph**, and **Playground** pages — they run live `Check` /
> `ListObjects` calls against the seeded store.

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
- **Dashboard** (`/dashboard`) — resource cards grouped into **collapsible
  sections** (The Guild, Guild Bank, Guild Raids, Channels), each with a short
  description and a live access badge per action. Vaults render as panels with
  their tabs nested inside, so the vault ▸ tab hierarchy is visible at a glance.
- **Click any badge** for a popup explaining _why_: the relation's DSL rule, the
  ABAC condition (with the context used), the relevant tuples, and the Expand
  "rules graph" — powered by `/api/explain`.
- **Access Matrix** (`/explorer`) — every persona × action in one grid; each
  cell is a live `Check`, and ABAC cells (amber ring) use a default context.
- **🧪 Interactive Labs** (`/labs`) — a list of bite-sized **scenarios**, each a
  small story about the guilds and their heroes backed by one interactive lab.
  Open one for a focused, presenter-friendly page (with prev/next to walk a
  demo): the recruit's climb up the rank ladder, a member's fall to the
  blocklist, the vault withdrawal limit, the raid signup window, the withdrawal
  cooldown, a reachability (`ListObjects`) comparison, and the council's
  majority vote to depose a guildmaster.
- **Playground** (`/playground`) — run arbitrary queries: **Check**,
  **ListObjects**, **ListUsers** ("who can…?"), **Expand** (the rules graph),
  and **What-if** (a Check against hypothetical contextual tuples — simulate a
  promotion or ban without writing to the store).
- **Model** (`/model`) — the DSL, all seeded tuples, the persona legend, and the
  store/model ids.
- **🗺️ Legenda** (`/legenda`, the app's default landing) — Mermaid diagrams
  generated from the seeded tuples: guilds & members, the bank hierarchy, raids
  & attendance (shared across the alliance), the channel → rank audiences, and
  the rank ladder.

## How it fits together

```
docker-compose.yaml   OpenFGA + Postgres
lib/model.fga         the authorization model (DSL, source of truth)
data/seed.ts          every relationship tuple (incl. conditional/ABAC tuples)
data/personas.ts      the 7 demo personas
data/catalog.ts       resources × actions shown in the UI + tests
data/legenda.ts       Mermaid diagrams generated from the seed (the Legenda page)
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

`docker compose up` auto-seeds a fresh `guildhall` store via the one-shot `seed`
service (idempotent); `deno task seed` does the same against an already-running
stack. Each re-seed mints a new store id, so restart `deno task dev` afterwards
to pick it up. To wipe everything (including Postgres data):
`docker compose
down -v`.
