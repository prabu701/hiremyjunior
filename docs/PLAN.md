# HireMyJunior (HMJ) — Build Plan

## Context

Greenfield product (`/Users/arun/startup/hiremyjunior` is empty). HMJ is a two-sided marketplace
connecting 14–17 year olds with paid work, with a parent in the loop as guardian **and** as the
financial account holder. Pilot in Washington State.

The hard part of this product is not CRUD. It is that every transaction involves a minor, which
means identity, consent, labor law, safety, and money custody are all load-bearing from day one.
This plan is organized around those constraints.

**Decisions locked in:**

| Decision | Choice |
|---|---|
| Platform | React Native + Expo (iOS + Android) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions, RLS) |
| Pilot market | Washington State |
| Minimum junior age | 14 |
| **Track A — household jobs** | **Full product: discovery → booking → shift → payment** |
| **Track B — business jobs** | **Listing + acceptance handshake only. No payments in the app.** |
| Money | Real, Track A only, via Stripe Connect; **parent is payee of record** |
| Verification | Vendor-based (Stripe Identity, Checkr, Twilio Verify) |
| Parent approval | Per-job, with opt-in "trusted employer" auto-approval after first completed job |
| Pricing | Deliberately not fixed — implemented as a versioned policy table |
| Who builds | Claude Code writes the application |

---

## Why the two tracks are genuinely different products

Washington law splits your employer types, and the split maps cleanly onto the scope above.

**Track A — Casual (household employer).** WA exempts "casual labor" — work in or around a private
residence, not connected to a business. Babysitting for a neighbor, raking a private yard. No minor
work permit, no Parent/School Authorization form, and **no state hour caps**. HMJ can safely run the
whole lifecycle including payment, and take a cut. This is the real product.

**Track B — Regulated (business employer).** Before a teen's first shift a business must hold a
**Minor Work Permit Endorsement** on its business license, keep a **Parent/School Authorization**
form signed by **four parties** (employer, minor, parent, school official) that **expires every
September 30**, hold acceptable proof of age, and obey hard hour caps.

**Keeping payment out of Track B is the right call, and it is load-bearing.** If HMJ collected a
business's money and paid out a teen's wage, HMJ would start to look like a staffing agency or
employer of record — dragging in payroll tax, I-9, and WA's mandatory state-monopoly workers'
compensation. By stopping at the introduction, HMJ is a matching service and none of that attaches.
The business is the employer and carries every one of those obligations itself.

One residual exposure remains: HMJ shouldn't introduce minors to businesses that can't legally hire
them. Mitigation is cheap — **verify the Minor Work Permit Endorsement before a business may post**,
and surface the compliance checklist to both sides at handoff.

### WA hour rules (non-agricultural)

Relevant to **Track B only**, and only as **listing-time validation and advisory display** — HMJ
doesn't track Track B shifts, so it cannot and should not claim to enforce these.

| Age | Period | Daily | Weekly | Days/wk | Time window |
|---|---|---|---|---|---|
| 14–15 | School week | 3h (8h Sat–Sun) | 16h | 6 | 7am – 7pm |
| 14–15 | Non-school week | 8h | 40h | 6 | 7am – 7pm (9pm Jun 1–Labor Day) |
| 16–17 | School week | 4h (8h Fri–Sun) | 20h | 6 | 7am – 10pm (midnight Fri–Sat) |
| 16–17 | Non-school week | 8h | 48h | 6 | 5am – midnight |
| 16–17 | School week + variance | 6h (8h Fri–Sun) | 28h | 6 | 7am – 10pm (midnight Fri–Sat) |

Agricultural work has a separate table and is **out of scope** — gate it off at the category level.

For **Track A**, statutory caps don't apply. HMJ still applies its own **policy guardrails** (parent-
settable max hours, latest end time, max distance) — a product/trust feature, not a legal one, and
much simpler to build.

**All statutory values are seeded as data and must be re-verified against L&I at implementation
time, with the compliance design reviewed by a WA employment attorney before launch.** Nothing here
is legal advice.

---

## Architecture

```
hiremyjunior/
├── apps/
│   ├── mobile/          # Expo (RN) — juniors, parents, employers in one app, role-switched
│   └── admin/           # Next.js — ops console: review queues, disputes, incidents, rule editing
├── packages/
│   ├── shared/          # zod schemas, generated DB types, shared constants
│   ├── rules/           # ⭐ guardrails (Track A) + WA statutory validation (Track B) — pure, tested
│   ├── booking/         # ⭐ booking state machine, both track variants — pure, tested
│   └── ui/              # design-system components (feeds from your Claude design work)
└── supabase/
    ├── migrations/      # SQL schema + RLS policies
    └── functions/       # Edge Functions: stripe-webhook, checkr-webhook, identity-webhook,
                         #   authorize-payment, capture-payment, auto-confirm-cron
```

`packages/rules` and `packages/booking` are pure and dependency-free **on purpose**. They are where
correctness actually matters, and keeping them free of Supabase/Stripe means they can be tested
exhaustively in milliseconds.

Toolchain: pnpm workspaces + Turborepo, TypeScript strict, Expo Router, TanStack Query,
`supabase gen types` for end-to-end type safety.

### Roles

One `auth.users` row per human. `profiles.role ∈ {junior, parent, employer, admin}`. A junior's
account is real and self-owned (they log in themselves) but **structurally dependent**: no junior can
transact without at least one `active` guardianship.

---

## Data model (core tables)

**Identity & relationships**
- `profiles` — 1:1 with `auth.users`; role, name, phone, email, avatar, status
- `juniors` — dob, school_id, bio, hourly_rate_default, service_area (PostGIS), availability
- `parents` — stripe_connect_account_id, payout_status, guardrail settings
- `employers` — kind (`household` | `business`), legal_name, ubi,
  minor_work_permit_endorsement_verified_at
- `guardianships` — (parent_id, junior_id, status, invite_code) — **many-to-many**; two parents, or
  split households, are the normal case, not an edge case
- `verifications` — (subject_type, subject_id, kind, provider, provider_ref, status, evidence_path,
  verified_at, expires_at) — one polymorphic table for every check, rather than columns sprinkled
  across role tables

**Supply & demand**
- `skills`, `junior_skills` (skill_id, rate_override, years)
- `jobs` — employer_id, **track** (`casual` | `regulated`), category_id, title, description,
  pay_type, rate, location (geography), address (revealed post-confirmation), status
- `job_images` — Supabase Storage refs
- `job_shifts` — job_id, start_at, end_at, timezone
- `job_categories` — name, **allowed_tracks**, min_age, hazardous flag

**Handshake (both tracks)**
- `applications` — junior→job (junior-initiated)
- `invitations` — employer→junior (employer-initiated)
- `bookings` — job_id, junior_id, track, state, fee_policy_id, amounts
- `booking_events` — append-only transition log **(actor, from, to, reason, at)**; non-negotiable,
  it is the evidence base for every dispute
- `trusted_employers` — (parent_id, junior_id, employer_id) — powers auto-approval

**Shift execution (Track A only)**
- `time_entries` — check_in/out timestamps + geo + confirmed_by_junior / confirmed_by_employer

**Money (Track A only)**
- `fee_policies` — (version, side, percent_bps, fixed_cents, minimum_cents, effective_from) —
  **pricing stays undecided by design**; bookings snapshot the active policy at confirmation
- `payments` — booking_id, setup_intent_id, payment_intent_id, transfer_id, authorized_cents,
  captured_cents, fee_cents, state
- `payout_attributions` — junior-facing "I earned $X" ledger. **Display only.** HMJ never holds a
  junior balance — stored value for a minor is a money-transmission problem.

**Reference data**
- `labor_rule_sets` — the WA table above, as rows (state, age_band, school_week, caps, windows,
  effective_from); drives Track B listing validation
- `school_calendars` — district term + holiday dates, to resolve "is this a school week?"

**Trust & safety**
- `threads`, `messages` (in-app, PII-masked pre-confirmation, parent-readable — disclosed in ToS)
- `reviews`, `disputes`, `incidents`, `panic_events`

**RLS is the security model, not an afterthought.** Every table gets explicit policies. The hardest
one: a parent can read their junior's bookings, messages, and payments through `guardianships`, but
only for juniors they actively guard. Write these policies alongside each migration and test them.

---

## Booking state machine

One machine, two variants, selected by `jobs.track`.

**Track A (full lifecycle).** The original spec confirmed start twice and end twice; collapsed here,
with the failure paths production actually needs:

```
draft → posted → applied|invited → parent_review → parent_approved
      → employer_accepted → confirmed
      → [T-24h] payment_authorized
      → checked_in (geofenced, mutual)
      → in_progress
      → work_ended (either party ends; other confirms)
      → captured → paid → closed
```

**Track B (introduction only).**

```
draft → posted → applied|invited → parent_review → parent_approved
      → employer_accepted → handed_off   [terminal]
```

At `handed_off`: contact details are exchanged, and both parties get the WA compliance checklist —
permit endorsement, the four-signature authorization form and its Sept 30 expiry, proof of age, and
the hour caps for that junior's age band. HMJ keeps the message thread open and still collects a
review afterward (marketplace quality depends on it), but takes no further part in the job.

Escape hatches on both: `parent_declined`, `employer_declined`, `expired`,
`cancelled_by_{junior,parent,employer}`. Track A adds `no_show_*`, `disputed`, `refunded`.

Two rules that prevent the classic marketplace deadlock on Track A:
- **Auto-confirm on timeout.** If the counterparty doesn't confirm job end within 12h, auto-confirm
  and proceed to capture. Without this, payments hang forever and support drowns.
- **Trusted-employer fast path.** First booking with an employer always hits `parent_review`. Once
  it closes cleanly, the parent may mark them trusted; later bookings skip to `employer_accepted`
  with a push notification and a standing one-tap veto. Repeat bookings are where marketplace
  retention lives — a mandatory 4-step handshake every time will kill it.

---

## Payments (Track A only)

**Structure.** Parent onboards to a **Stripe Connect Express** account and is the payee of record —
no PSP will let a 14-year-old hold a payout account. The junior sees earnings attributed to them
in-app; that is a ledger view over payouts made to the parent, never a balance HMJ custodies.

**The card-hold expiry trap.** Stripe authorizations die in ~7 days, so authorizing at booking time
breaks for any job booked further out — which will be most of them.

Sequence that works:
1. **At booking:** `SetupIntent` — validate and vault the employer's card. No hold.
2. **T-24h before shift:** `PaymentIntent` with `capture_method: 'manual'` for
   `estimated_hours × rate × 1.25` (overtime buffer) + fee. A scheduled Edge Function drives this.
3. **At `work_ended`:** capture the true amount. If actual exceeds the authorization, capture the
   full hold and raise a second PaymentIntent for the remainder.
4. **Transfer** to the parent's connected account, less the snapshotted fee.

Failure handling at step 2 is a real product surface, not an edge case: card declined → notify
employer, 6h to fix, else auto-cancel and release the junior's slot.

**Money transmission.** Use Connect separate charges & transfers (or destination charges with
`on_behalf_of`) so HMJ is not taking custody of funds — this is the structure that keeps you out of
state money-transmitter licensing. **Confirm with counsel before launch.**

---

## Verification

| Subject | Checks |
|---|---|
| Parent | Twilio Verify (phone) → email magic link → **Stripe Identity** (gov ID + selfie) → Connect Express KYC |
| Junior | Phone + email → guardianship invite code from a verified parent → **DOB attested by the ID-verified parent** + proof-of-age document upload |
| Household employer (Track A) | Phone + email → **Stripe Identity** → **Checkr** background check — this is the check that matters most, since a stranger is hiring someone's 15-year-old |
| Business employer (Track B) | Stripe Identity on the signer → WA UBI / Secretary of State lookup → **Minor Work Permit Endorsement verification (gates posting)** → Checkr on the named on-site supervisor |

Age verification has no clean automated answer, and a school ID is a weak signal — easily faked and
frequently carries no DOB. The strongest cheap construction is the one above: the *parent* is
ID-verified, and the DOB attestation inherits that verified identity and carries their signature.

---

## Safety

Non-negotiable for a product that sends minors to strangers' homes. Applies to both tracks through
handoff; the shift-time items are Track A only.

- Exact addresses and full contact details revealed **only after** `confirmed` / `handed_off`.
  Search shows approximate location (ZIP centroid with jitter).
- In-app messaging only; phone/email/handles regex-stripped pre-confirmation. Parents can read their
  junior's threads, disclosed to both parties.
- *(Track A)* Geofenced check-in/out; parent push-notified on both.
- *(Track A)* Optional live location share with the parent during a shift — **default on under 16**.
- Panic button → parent + HMJ ops, with employer, address, and shift context attached.
- One-tap report; any incident auto-suspends the counterparty pending admin review.
- Every state transition is written to `booking_events`. Disputes are unwinnable without it.

---

## Phases

Sequenced by dependency. Each phase ends with something demonstrable.

| # | Phase | Contents | Est. |
|---|---|---|---|
| 0 | Foundations | Monorepo, Supabase project, migrations + RLS harness, Expo shell, auth, CI | 1 wk |
| 1 | Identity | 3 onboarding flows, Stripe Identity, Twilio Verify, Checkr, guardianship linking | 2 wk |
| 2 | Supply & demand | Junior profiles + skills + rates, job posting + images, PostGIS + full-text search | 2 wk |
| 3 | Handshake | Applications, invitations, parent approval, trusted employers, state machine (both tracks) | 1.5 wk |
| 4 | Rules & Track B handoff | `packages/rules`, WA ruleset seed, school calendars, listing validation, compliance checklist, endorsement gating | 1 wk |
| 5 | Shift execution (A) | Check-in/out, geofencing, messaging, safety features, notifications | 2 wk |
| 6 | **Payments (A)** | Connect onboarding, SetupIntent/PaymentIntent lifecycle, capture, transfers, fee policies, webhooks | 2.5 wk |
| 7 | Trust & safety | Reviews, disputes, incidents, admin console | 1.5 wk |
| 8 | Pilot hardening | Analytics, error tracking, ToS/privacy, app store submission, load testing | 1.5 wk |

≈14 weeks to a WA pilot. Track B is complete after Phase 4 and can go live early — it needs no
payment rails, so it's a way to build employer-side supply while Track A's payment work finishes.

Phase 6 carries the real remaining risk and shouldn't be compressed.

**Deferred (not in scope, flagged as the obvious Track B v2):** generating a pre-filled
Parent/School Authorization PDF at handoff, and routing it for the four signatures. That form is
genuinely painful today and automating it is the natural wedge to monetize Track B later — but it's
out of scope here.

---

## Verification & testing

- **`packages/rules`** — unit + property-based tests generating random (age, datetime, duration)
  tuples and asserting against the L&I table. Explicit fixtures for every boundary: the 3h
  school-day cap, the 7pm/9pm summer switch, the Fri–Sat midnight extension, week rollover
  across DST.
- **`packages/booking`** — exhaustive transition tests for both track variants; assert every illegal
  transition throws, that Track B cannot reach any payment state, and that every terminal state is
  reachable.
- **RLS** — pgTAP suite asserting cross-tenant denial: parent B cannot read junior A's data, an
  employer cannot read an unrelated booking, a junior cannot self-approve.
- **Payments** — Stripe test mode with fixture-driven webhooks; simulate expired auth, declined
  card, partial capture, over-capture, refund, and dispute.
- **E2E** — Maestro against Expo dev client. Track A: three signups → post job → apply → parent
  approves → employer accepts → authorize → check in → check out → capture → payout. Track B: post →
  apply → parent approves → accept → handoff, asserting no payment object is ever created.
- **Manual pilot gate** — one real end-to-end Track A booking in WA with real money and a real
  family, before any public launch.

---

## Open items to resolve before Phase 6

1. **WA employment attorney review** of the Track A casual-labor exemption reading, and confirmation
   that Track B's introduction-only model keeps HMJ clear of employer-of-record status.
2. **Money-transmitter confirmation** on the Connect flow structure.
3. **Insurance** — general liability, and whether HMJ or the household employer covers injury on
   Track A jobs.
4. **Minimum-wage floor** — seed WA state minimum plus Seattle/SeaTac/Tukwila local rates, and
   confirm the 85%-of-minimum provision for 14–15 year olds still stands. Validate posted rates at
   job-post time.
5. **Pricing** — deferred by design; `fee_policies` makes it a config change, not a migration.

---

## Sources

- [L&I — Hours of Work for Minors](https://www.lni.wa.gov/workers-rights/youth-employment/hours-of-work)
- [L&I — How to Hire Minors](https://www.lni.wa.gov/workers-rights/youth-employment/how-to-hire-minors)
- [L&I — Parent/School Authorization (F700-002-000)](https://www.lni.wa.gov/forms-publications/F700-002-000.pdf)
- [L&I — ES.C.4.1 School Week and Work Week for Minors](https://lni.wa.gov/workers-rights/_docs/esc4.1.pdf)
- [RCW 49.12.121 — Wages and working conditions of minors](https://app.leg.wa.gov/rcw/default.aspx?cite=49.12.121)
