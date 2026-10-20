import { useQuery } from '@tanstack/react-query';
import { isTerminal, STATE_LABELS, type BookingState } from '@hmj/booking';
import { useAuth } from './auth';
import { queryClient } from './queries';
import { rpc } from './rpc';

export interface BookingDetail {
  id: string;
  state: BookingState;
  track: 'casual' | 'regulated';
  origin: 'applied' | 'invited';
  fast_path: boolean;
  role: 'junior' | 'parent' | 'employer' | 'admin';
  revealed: boolean;
  created_at: string;
  message: string | null;
  job: {
    id: string; title: string; category_id: string; rate_cents: number; pay_type: 'hourly' | 'fixed'; city: string;
    schedule_note: string | null; shifts: { id: string; start_at: string; end_at: string }[];
    address: { line: string; notes: string | null } | null;
  };
  junior: { id: string; name: string; age_band: string | null; phone: string | null; guardians: { name: string; phone: string | null }[] | null };
  employer: { id: string; name: string; kind: 'household' | 'business'; contact_name: string | null; phone: string | null; supervisor: { name: string; email: string } | null };
  trusted: boolean | null;
  can_trust: boolean | null;
  events: { event: string; actor_role: string; to_state: BookingState; reason: string | null; at: string }[];
}

export function useMyBookings() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['bookings', session?.user.id],
    enabled: !!session,
    queryFn: () => rpc('my_bookings'),
    refetchInterval: 20_000,
  });
}

export function useBookingDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    enabled: !!id,
    queryFn: async () => (await rpc('booking_detail', { booking_id: id! })) as unknown as BookingDetail,
    refetchInterval: 15_000,
  });
}

export function invalidateBookings() {
  return Promise.all(['bookings', 'booking', 'job', 'job-search', 'my-jobs'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
}

export const stateLabel = (s: BookingState) => STATE_LABELS[s];

/** Badge tone for a state: 3 = good, 2 = waiting, 1 = stopped. */
export function stateTone(s: BookingState): 1 | 2 | 3 {
  if (['confirmed', 'handed_off', 'closed', 'paid', 'payment_authorized', 'checked_in', 'in_progress', 'work_ended', 'captured'].includes(s)) return 3;
  if (isTerminal(s)) return 1;
  return 2;
}

export interface Step {
  title: string;
  subtitle: string;
  status: 'done' | 'active' | 'todo' | 'stopped';
}

const ORDER: BookingState[] = ['invited', 'applied', 'parent_review', 'parent_approved', 'employer_accepted', 'confirmed', 'handed_off'];

/**
 * Handshake progress for the prototype's numbered tracker ("Application sent → Waiting on parent
 * approval → Employer confirms you"), from the viewer's point of view.
 */
export function handshakeSteps(b: Pick<BookingDetail, 'state' | 'origin' | 'track' | 'events'>, viewer: 'junior' | 'parent' | 'employer', names: { junior: string; employer: string }): Step[] {
  const reached = new Set(b.events.map((e) => e.to_state));
  reached.add(b.state);
  const at = (s: BookingState) => reached.has(s) || ORDER.indexOf(b.state) > ORDER.indexOf(s);
  const finalState: BookingState = b.track === 'casual' ? 'confirmed' : 'handed_off';
  const teen = viewer === 'junior' ? 'you' : names.junior;
  const done = (s: BookingState) => at(s);

  const steps: { title: string; subtitle: string; reachedWhen: BookingState }[] =
    b.origin === 'applied'
      ? [
          { title: 'Application sent', subtitle: viewer === 'employer' ? 'You were notified' : `${names.employer} was notified`, reachedWhen: 'applied' },
          { title: viewer === 'parent' ? 'Your approval' : 'Parent approval', subtitle: viewer === 'junior' ? 'Your parent approves every job' : `A guardian approves ${teen === 'you' ? 'your' : teen + '’s'} jobs`, reachedWhen: 'parent_approved' },
          { title: `${viewer === 'employer' ? 'You confirm' : 'Employer confirms'} ${teen}`, subtitle: 'Last step before it’s on the calendar', reachedWhen: 'employer_accepted' },
        ]
      : [
          { title: `Request sent to ${viewer === 'junior' ? 'you' : names.junior}`, subtitle: `From ${names.employer}`, reachedWhen: 'invited' },
          { title: viewer === 'junior' ? 'You accept' : `Waiting for ${names.junior} to accept`, subtitle: viewer === 'junior' ? 'Say yes if it works for you' : 'They’ll see it in their app', reachedWhen: 'parent_review' },
          { title: 'Parent approval', subtitle: 'Final step before it’s confirmed', reachedWhen: 'parent_approved' },
        ];
  steps.push({
    title: b.track === 'casual' ? 'Confirmed' : 'Introduced',
    subtitle: b.track === 'casual' ? 'Address and contacts are shared' : 'Contact details are exchanged; the business takes it from here',
    reachedWhen: finalState,
  });

  const stopped = isTerminal(b.state) && b.state !== finalState;
  let activeGiven = false;
  return steps.map((s) => {
    if (done(s.reachedWhen)) return { title: s.title, subtitle: s.subtitle, status: 'done' as const };
    if (!activeGiven) {
      activeGiven = true;
      return { title: s.title, subtitle: stopped ? STATE_LABELS[b.state] : s.subtitle, status: stopped ? ('stopped' as const) : ('active' as const) };
    }
    return { title: s.title, subtitle: s.subtitle, status: 'todo' as const };
  });
}
