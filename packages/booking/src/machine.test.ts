import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderSql } from '../scripts/gen-sql';
import {
  allowedEvents, canTransition, IllegalTransition, isTerminal, ORIGINS, PAYMENT_STATES, reachableStates,
  STATES, SUCCESS_STATES, TERMINAL_STATES, transition, TRANSITIONS,
  type Actor, type BookingEvent, type BookingState, type Track,
} from './machine';
import { STATE_LABELS } from './labels';

const TRACKS: Track[] = ['casual', 'regulated'];
const ACTORS: Actor[] = ['junior', 'parent', 'employer', 'system'];
const EVENTS = [...new Set(TRANSITIONS.map((x) => x.event))] as BookingEvent[];

describe('transition()', () => {
  it('walks the Track A happy path', () => {
    let s: BookingState = 'applied';
    const steps: [BookingEvent, Actor][] = [
      ['submit', 'system'], ['parent_approve', 'parent'], ['employer_accept', 'employer'], ['confirm', 'system'],
      ['authorize_payment', 'system'], ['check_in', 'junior'], ['start_work', 'employer'], ['end_work', 'junior'],
      ['capture', 'system'], ['pay_out', 'system'], ['close', 'system'],
    ];
    for (const [e, a] of steps) s = transition(s, e, 'casual', a);
    expect(s).toBe('closed');
  });

  it('walks the Track B happy path to a terminal hand-off', () => {
    let s: BookingState = 'invited';
    for (const [e, a] of [['accept_invite', 'junior'], ['parent_approve', 'parent'], ['invite_preaccepted', 'system'], ['hand_off', 'system']] as [BookingEvent, Actor][]) {
      s = transition(s, e, 'regulated', a);
    }
    expect(s).toBe('handed_off');
    expect(isTerminal(s)).toBe(true);
  });

  it('exhaustively: every (state, event, track, actor) either matches exactly one row or throws', () => {
    let legal = 0;
    for (const s of STATES) for (const e of EVENTS) for (const tr of TRACKS) for (const a of ACTORS) {
      const rows = TRANSITIONS.filter((x) => x.from === s && x.event === e && x.tracks.includes(tr) && x.actors.includes(a));
      expect(rows.length).toBeLessThanOrEqual(1);
      if (rows.length) {
        expect(transition(s, e, tr, a)).toBe(rows[0]!.to);
        legal++;
      } else {
        expect(() => transition(s, e, tr, a)).toThrow(IllegalTransition);
        expect(canTransition(s, e, tr, a)).toBe(false);
      }
    }
    expect(legal).toBeGreaterThan(40);
  });

  it('a teen can never approve their own job', () => {
    for (const tr of TRACKS) {
      expect(() => transition('parent_review', 'parent_approve', tr, 'junior')).toThrow(IllegalTransition);
      expect(() => transition('parent_review', 'trusted_auto_approve', tr, 'junior')).toThrow(IllegalTransition);
    }
  });

  it('only a parent (or the trusted-employer system path) moves a booking past parent review', () => {
    const out = TRANSITIONS.filter((x) => x.from === 'parent_review' && x.to === 'parent_approved');
    expect(out.flatMap((x) => x.actors).sort()).toEqual(['parent', 'system']);
  });

  it('allowedEvents lists the buttons each party sees', () => {
    expect(allowedEvents('parent_review', 'casual', 'parent').sort()).toEqual(['cancel', 'parent_approve', 'parent_decline']);
    expect(allowedEvents('parent_approved', 'casual', 'employer').sort()).toEqual(['cancel', 'employer_accept', 'employer_decline']);
    expect(allowedEvents('invited', 'regulated', 'junior').sort()).toEqual(['accept_invite', 'cancel', 'decline_invite']);
  });
});

describe('structure', () => {
  it('Track B cannot reach any payment or shift state', () => {
    const reach = reachableStates('regulated');
    for (const s of [...PAYMENT_STATES, 'confirmed', 'checked_in', 'in_progress', 'work_ended', 'closed'] as BookingState[]) {
      expect(reach.has(s), s).toBe(false);
    }
  });

  it('Track A never hands off (that is the introduction-only ending)', () => {
    expect(reachableStates('casual').has('handed_off')).toBe(false);
  });

  it('every terminal state is reachable on some track', () => {
    const all = new Set([...reachableStates('casual'), ...reachableStates('regulated')]);
    for (const s of TERMINAL_STATES) expect(all.has(s), s).toBe(true);
  });

  it('every state is reachable on some track (no dead definitions)', () => {
    const all = new Set([...reachableStates('casual'), ...reachableStates('regulated')]);
    for (const s of STATES) expect(all.has(s), s).toBe(true);
  });

  it('terminal states have no way out', () => {
    for (const s of TERMINAL_STATES) expect(TRANSITIONS.some((x) => x.from === s), s).toBe(false);
  });

  it('every non-terminal reachable state can still reach a terminal state', () => {
    for (const tr of TRACKS) {
      for (const s of reachableStates(tr)) {
        if (isTerminal(s)) continue;
        const seen = new Set<BookingState>([s]);
        const q = [s];
        let ok = false;
        while (q.length && !ok) {
          const cur = q.shift()!;
          for (const x of TRANSITIONS.filter((y) => y.from === cur && y.tracks.includes(tr))) {
            if (isTerminal(x.to)) ok = true;
            if (!seen.has(x.to)) { seen.add(x.to); q.push(x.to); }
          }
        }
        expect(ok, `${tr}:${s}`).toBe(true);
      }
    }
  });

  it('origins and success states are consistent', () => {
    expect(Object.keys(ORIGINS).sort()).toEqual(['applied', 'invited']);
    for (const s of SUCCESS_STATES) expect(isTerminal(s)).toBe(true);
  });

  it('every state has a human label', () => {
    for (const s of STATES) expect(STATE_LABELS[s]).toBeTruthy();
  });
});

describe('database sync', () => {
  it('the generated migration matches this machine', () => {
    const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../supabase/migrations/20260929000500_booking_machine.sql');
    expect(readFileSync(file, 'utf8')).toBe(renderSql());
  });
});
