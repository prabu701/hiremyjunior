# HireMyJunior

Two-sided marketplace connecting 14–17 year olds with paid work, with a parent in the loop.
Build plan: [`docs/PLAN.md`](docs/PLAN.md). Design reference: `docs/HireMyJunior — Spark Prototype (1).html`.

**Built so far: Phases 1–5** — foundations, onboarding & guardianship, verification, jobs & search,
and the booking handshake for both tracks — delivered as a **web app** (Next.js) with a public
landing page. The earlier Expo app is kept in `archive/` for reference.

## Layout

```
apps/web            Next.js 16 website: landing page + the signed-in app for teens, parents,
                    employers and ops. Tailwind design tokens (4 themes) in src/app/globals.css.
                    Playwright end-to-end tests in apps/web/e2e.
packages/shared     Roles, zod input schemas, generated database types.
packages/booking    ⭐ Booking state machine (both tracks) — pure TS, exhaustively tested.
                    Generates the DB transition table (supabase/migrations/*_booking_machine.sql).
supabase/migrations SQL schema, RLS policies and RPCs, applied in filename order.
supabase/functions  Edge Functions: Twilio Verify, Stripe Identity, Checkr + webhooks (simulated
                    locally until keys are set).
supabase/tests      pgTAP tests (RLS, onboarding, verification, search, bookings).
supabase/seed.sql   Demo data (`pnpm db:seed`).
docker/             Gateway (nginx), DB init, migration runner, web image.
archive/            Retired Expo app (not built).
```

## Run it locally (Docker)

Prerequisites: Docker Desktop (≥ 6 GB memory), Node 22+, pnpm 9.

```sh
pnpm install
pnpm env:init                 # writes .env with random local secrets (never committed)
docker compose up -d --build  # first run: a few minutes
pnpm db:seed                  # demo families, employers and jobs (safe to re-run)
```

| What | URL |
|---|---|
| **The website** | http://localhost:4000 |
| Mail inbox — sign-in codes, simulated SMS & vendor e-mails | http://localhost:8025 |
| Supabase Studio (browse tables) | http://localhost:4001 |
| API gateway | http://localhost:8000 |

### Demo accounts (after `pnpm db:seed`)

**Sign in with a phone number and the code `0000`** (local test mode — `PHONE_LOGIN_TEST_CODE` in
`.env`; it's ignored once Twilio is configured). A new number creates a new account. Email sign-in
is still at `/sign-in/email` (code from the Mail inbox, or `pnpm code <email>`).
Every demo account is already verified.

| Role | Phone | E-mail | Notes |
|---|---|---|---|
| Teen, 15 | 425-555-0101 | `maya@demo.test` | Parent: Priya |
| Teen, 16 | 425-555-0102 | `jaden@demo.test` | Parent: Mark |
| Teen, 17 | 425-555-0103 | `sofia@demo.test` | Parent: Elena |
| Parent | 425-555-0201 / 0202 / 0203 | `priya@` / `mark@` / `elena@demo.test` | |
| Household employer | 425-555-0301 / 0302 / 0303 | `chen@` / `patel@` / `garcia@demo.test` | Track A |
| Business employer | 425-555-0401 / 0402 | `petsupply@` / `scoops@demo.test` | Track B |
| Admin | — | `ops@demo.test` | Email sign-in at `/sign-in/email?role=admin` |

### Everyday commands

```sh
docker compose up -d --build web   # rebuild the app after code changes
pnpm db:migrate && pnpm db:types   # apply new migrations, regenerate TS types
pnpm db:test                       # pgTAP suite
pnpm test && pnpm typecheck && pnpm lint
pnpm e2e                           # Playwright: real sign-ins and a full booking (needs db:seed)
pnpm code maya@demo.test           # print the latest code e-mailed to an address
pnpm admin:create ops@example.com  # provision another admin
docker compose down                # stop (keeps data)
docker compose down -v             # stop and wipe everything (then up + db:seed again)
```

For hot reload: keep Docker running, `cp apps/web/.env.example apps/web/.env.local` (paste
`ANON_KEY` from `.env`), then `pnpm dev:web` → http://localhost:3000 (or `-- --port 3005` if 3000 is taken).

## Verification vendors

Each runs for real once its keys are in `.env`; until then a local simulation stands in:

| Check | Real | Simulated |
|---|---|---|
| Phone | Twilio Verify (`TWILIO_*`) | Code arrives in the Mail inbox as "SMS to +1…" |
| Government ID + selfie | Stripe Identity (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | A local page with Pass / Fail buttons |
| Background check | Checkr (`CHECKR_API_KEY`) | Invitation e-mail in the inbox; an admin completes it from the review queue |
| Proof of age, WA business registration, Minor Work Permit Endorsement | Manual | Admin review queue |

## Security model

Row-level security plus explicit grants: clients can only SELECT (and only their own / linked
rows); every write goes through a security-definer RPC that validates the caller. Booking state
changes are checked against a transition table generated from `packages/booking`, and every
change is appended to `booking_events`. `supabase/tests/000_privileges.sql` fails the build if
any table ever becomes directly writable.
