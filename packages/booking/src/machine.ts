// The booking state machine — the single source of truth for both tracks.
//
// Track A (casual / household): the full lifecycle through shift, payment and close.
// Track B (regulated / business): an introduction only — ends at `handed_off`, and can never
// reach a payment state (HMJ must not look like an employer of record or staffing agency).
//
// The database enforces exactly these transitions: scripts/gen-sql.ts renders TRANSITIONS into
// a migration, and a test fails if that migration drifts from this file.

export type Track = 'casual' | 'regulated';
export type Actor = 'junior' | 'parent' | 'employer' | 'system';

export const STATES = [
  // handshake (both tracks)
  'invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted',
  // Track A
  'confirmed', 'payment_authorized', 'checked_in', 'in_progress', 'work_ended', 'captured', 'paid', 'closed',
  // Track B
  'handed_off',
  // exits
  'junior_declined', 'parent_declined', 'employer_declined', 'expired',
  'cancelled_by_junior', 'cancelled_by_parent', 'cancelled_by_employer',
  'no_show_junior', 'no_show_employer', 'disputed', 'refunded',
] as const;
export type BookingState = (typeof STATES)[number];

export type BookingEvent =
  | 'submit' | 'accept_invite' | 'decline_invite'
  | 'parent_approve' | 'parent_decline' | 'trusted_auto_approve'
  | 'employer_accept' | 'invite_preaccepted' | 'employer_decline'
  | 'confirm' | 'hand_off'
  | 'cancel' | 'expire'
  | 'authorize_payment' | 'check_in' | 'start_work' | 'end_work' | 'capture' | 'pay_out' | 'close'
  | 'no_show_junior' | 'no_show_employer' | 'dispute' | 'refund' | 'resolve_dispute';

/** How a booking begins (not transitions: they create the row). */
export const ORIGINS = { applied: 'junior', invited: 'employer' } as const satisfies Partial<Record<BookingState, Actor>>;

export interface Transition {
  from: BookingState;
  event: BookingEvent;
  to: BookingState;
  actors: readonly Actor[];
  tracks: readonly Track[];
}

const BOTH = ['casual', 'regulated'] as const;
const A = ['casual'] as const;
const B = ['regulated'] as const;

/** States in which people can still back out before any work happens. */
export const PRE_WORK_STATES = ['invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted', 'confirmed', 'payment_authorized'] as const satisfies readonly BookingState[];

const t = (from: BookingState, event: BookingEvent, to: BookingState, actors: readonly Actor[], tracks: readonly Track[] = BOTH): Transition =>
  ({ from, event, to, actors, tracks });

export const TRANSITIONS: readonly Transition[] = [
  // ── Handshake ─────────────────────────────────────────────────────────────
  t('applied', 'submit', 'parent_review', ['system']),
  t('invited', 'accept_invite', 'parent_review', ['junior']),
  t('invited', 'decline_invite', 'junior_declined', ['junior']),

  t('parent_review', 'parent_approve', 'parent_approved', ['parent']),
  t('parent_review', 'trusted_auto_approve', 'parent_approved', ['system']),
  t('parent_review', 'parent_decline', 'parent_declined', ['parent']),

  // Applications need the employer's yes; invitations already are one.
  t('parent_approved', 'employer_accept', 'employer_accepted', ['employer']),
  t('parent_approved', 'invite_preaccepted', 'employer_accepted', ['system']),
  ...(['applied', 'parent_review', 'parent_approved'] as const).map((s) => t(s, 'employer_decline', 'employer_declined', ['employer'])),

  t('employer_accepted', 'confirm', 'confirmed', ['system'], A),
  t('employer_accepted', 'hand_off', 'handed_off', ['system'], B),

  // ── Backing out ───────────────────────────────────────────────────────────
  ...(['invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted', 'confirmed', 'payment_authorized'] as const).flatMap((s) => {
    const tracks = s === 'confirmed' || s === 'payment_authorized' ? A : BOTH;
    return [
      t(s, 'cancel', 'cancelled_by_junior', ['junior'], tracks),
      t(s, 'cancel', 'cancelled_by_parent', ['parent'], tracks),
      t(s, 'cancel', 'cancelled_by_employer', ['employer'], tracks),
    ];
  }),
  ...(['invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted', 'confirmed'] as const).map((s) =>
    t(s, 'expire', 'expired', ['system'], s === 'confirmed' ? A : BOTH),
  ),

  // ── Track A: shift and money ─────────────────────────────────────────────
  t('confirmed', 'authorize_payment', 'payment_authorized', ['system'], A),
  t('payment_authorized', 'check_in', 'checked_in', ['junior'], A),
  t('checked_in', 'start_work', 'in_progress', ['employer', 'system'], A),
  t('in_progress', 'end_work', 'work_ended', ['junior', 'employer'], A),
  t('work_ended', 'capture', 'captured', ['system'], A),
  t('captured', 'pay_out', 'paid', ['system'], A),
  t('paid', 'close', 'closed', ['system'], A),

  t('payment_authorized', 'no_show_junior', 'no_show_junior', ['employer', 'system'], A),
  t('checked_in', 'no_show_employer', 'no_show_employer', ['junior', 'system'], A),

  ...(['work_ended', 'captured', 'paid'] as const).map((s) => t(s, 'dispute', 'disputed', ['junior', 'parent', 'employer'], A)),
  t('disputed', 'refund', 'refunded', ['system'], A),
  t('disputed', 'resolve_dispute', 'captured', ['system'], A),
];

export const TERMINAL_STATES: readonly BookingState[] = [
  'closed', 'handed_off', 'junior_declined', 'parent_declined', 'employer_declined', 'expired',
  'cancelled_by_junior', 'cancelled_by_parent', 'cancelled_by_employer', 'no_show_junior', 'no_show_employer', 'refunded',
];

/** Terminal states that count as a clean finish (e.g. for the trusted-employer fast path). */
export const SUCCESS_STATES: readonly BookingState[] = ['closed', 'handed_off'];

export const PAYMENT_STATES: readonly BookingState[] = ['payment_authorized', 'captured', 'paid', 'disputed', 'refunded'];

export class IllegalTransition extends Error {
  readonly state: BookingState;
  readonly event: BookingEvent;
  readonly track: Track;
  readonly actor: Actor;
  constructor(state: BookingState, event: BookingEvent, track: Track, actor: Actor) {
    super(`illegal transition: ${event} by ${actor} from ${state} (${track})`);
    this.name = 'IllegalTransition';
    this.state = state;
    this.event = event;
    this.track = track;
    this.actor = actor;
  }
}

export function isTerminal(state: BookingState): boolean {
  return TERMINAL_STATES.includes(state);
}

function find(state: BookingState, event: BookingEvent, track: Track, actor: Actor): Transition | undefined {
  return TRANSITIONS.find((x) => x.from === state && x.event === event && x.tracks.includes(track) && x.actors.includes(actor));
}

/** The next state, or IllegalTransition. Pure. */
export function transition(state: BookingState, event: BookingEvent, track: Track, actor: Actor): BookingState {
  const hit = find(state, event, track, actor);
  if (!hit) throw new IllegalTransition(state, event, track, actor);
  return hit.to;
}

export function canTransition(state: BookingState, event: BookingEvent, track: Track, actor: Actor): boolean {
  return !!find(state, event, track, actor);
}

/** Events this actor may fire from this state (for rendering buttons). */
export function allowedEvents(state: BookingState, track: Track, actor: Actor): BookingEvent[] {
  return [...new Set(TRANSITIONS.filter((x) => x.from === state && x.tracks.includes(track) && x.actors.includes(actor)).map((x) => x.event))];
}

/** Every state reachable from the origins on a track. */
export function reachableStates(track: Track): Set<BookingState> {
  const seen = new Set<BookingState>(Object.keys(ORIGINS) as BookingState[]);
  const queue = [...seen];
  while (queue.length) {
    const s = queue.shift()!;
    for (const x of TRANSITIONS) {
      if (x.from === s && x.tracks.includes(track) && !seen.has(x.to)) {
        seen.add(x.to);
        queue.push(x.to);
      }
    }
  }
  return seen;
}
