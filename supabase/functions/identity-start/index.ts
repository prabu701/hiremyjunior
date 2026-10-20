// POST → starts a government-ID + selfie check and returns the URL to open.
// Live: Stripe Identity VerificationSession. Local: our simulated page (mock-identity).
import { hmacHex } from '../_shared/crypto.ts';
import { env, live } from '../_shared/env.ts';
import { handler, HttpError, json } from '../_shared/http.ts';
import { requireCaller, svc } from '../_shared/supabase.ts';

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const caller = await requireCaller(req);
    if (caller.role !== 'parent' && caller.role !== 'employer') throw new HttpError(403, 'Only parents and employers verify ID here.');
    if (!caller.onboarded_at) throw new HttpError(400, 'Finish your profile first.');

    if (live.stripeIdentity) {
      const form = new URLSearchParams({
        type: 'document',
        'options[document][require_matching_selfie]': 'true',
        'options[document][require_live_capture]': 'true',
        'metadata[subject_id]': caller.id,
        return_url: `${env.siteUrl}/verify-identity?returned=1`,
      });
      const res = await fetch('https://api.stripe.com/v1/identity/verification_sessions', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.stripe.secretKey}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const session = await res.json();
      if (!res.ok) {
        console.error('[stripe identity]', res.status, session);
        throw new HttpError(502, 'Could not start ID verification. Please try again.');
      }
      await svc('svc_start_verification', { uid: caller.id, k: 'identity', provider: 'stripe_identity', provider_ref: session.id });
      return json({ url: session.url, mode: 'live' });
    }

    const v = await svc<{ id: string }>('svc_start_verification', { uid: caller.id, k: 'identity', provider: 'mock_stripe_identity' });
    const token = await hmacHex(env.jwtSecret, `mock-identity:${v.id}`);
    return json({ url: `${env.publicUrl}/functions/v1/mock-identity?v=${v.id}&t=${token}`, mode: 'mock' });
  }),
);
