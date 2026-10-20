// POST → starts the employer's background check (household: the employer themselves; business:
// the named on-site supervisor). Live: Checkr candidate + invitation (Checkr emails the candidate
// and collects SSN etc. itself — HMJ never sees it). Local: an e-mail to Mailpit, and an admin
// simulates the result from the review queue.
import { env, live } from '../_shared/env.ts';
import { handler, HttpError, json } from '../_shared/http.ts';
import { sendToMailpit } from '../_shared/mailpit.ts';
import { admin, requireCaller, svc } from '../_shared/supabase.ts';

async function checkr(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.checkr.com/v1/${path}`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${env.checkr.apiKey}:`)}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[checkr]', res.status, data);
    throw new HttpError(502, 'Could not start the background check. Please try again.');
  }
  return data;
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const caller = await requireCaller(req);
    if (caller.role !== 'employer') throw new HttpError(403, 'Only employers need a background check.');

    const { data: employer } = await admin.from('employers').select('*').eq('profile_id', caller.id).single();
    if (!employer) throw new HttpError(400, 'Finish your profile first.');
    const { data: idOk } = await admin.rpc('is_verified', { uid: caller.id, k: 'identity' });
    if (!idOk) throw new HttpError(400, 'Verify your identity first.');

    const business = employer.kind === 'business';
    const kind = business ? 'supervisor_check' : 'background_check';
    const name: string = business ? employer.supervisor_name : caller.full_name ?? '';
    const email: string = business ? employer.supervisor_email : caller.email ?? '';
    const [first, ...rest] = name.trim().split(/\s+/);
    const details = { name, email, subject: business ? 'supervisor' : 'employer' };

    if (live.checkr) {
      const candidate = await checkr('candidates', {
        first_name: first, last_name: rest.join(' ') || first, email,
        work_locations: [{ country: 'US', state: 'WA' }],
        custom_id: caller.id,
      });
      await checkr('invitations', { candidate_id: candidate.id, package: env.checkr.package, work_locations: [{ country: 'US', state: 'WA' }] });
      await svc('svc_start_verification', { uid: caller.id, k: kind, provider: 'checkr', provider_ref: candidate.id, status: 'processing', details });
      return json({ started: true, mode: 'live', email });
    }

    await svc('svc_start_verification', { uid: caller.id, k: kind, provider: 'mock_checkr', status: 'processing', details });
    await sendToMailpit(
      email,
      'Complete your background check for HireMyJunior',
      `Hi ${first},\n\n${business ? `${employer.display_name} named you as the on-site supervisor for teens they hire` : 'You asked to hire teens on HireMyJunior'}. ` +
        `In production, Checkr sends this e-mail with a secure link to enter your details.\n\n` +
        `(Simulated — an admin completes this check from the review queue. Set CHECKR_API_KEY in .env for real checks.)`,
      'Checkr (simulated)',
    );
    return json({ started: true, mode: 'mock', email });
  }),
);
