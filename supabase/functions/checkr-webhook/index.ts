// Checkr webhook. Verifies X-Checkr-Signature (hex HMAC-SHA256 of the raw body, keyed by the API key).
// "clear" → verified for a year. "consider" is NOT an automatic fail: FCRA requires individual
// assessment and an adverse-action process, so it goes to an admin (needs_review).
import { hmacHex, safeEqual } from '../_shared/crypto.ts';
import { env } from '../_shared/env.ts';
import { admin, svc } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const payload = await req.text();
  const sig = req.headers.get('x-checkr-signature') ?? '';
  if (!env.checkr.apiKey || !safeEqual(sig, await hmacHex(env.checkr.apiKey, payload))) {
    return new Response('invalid signature', { status: 400 });
  }
  const event = JSON.parse(payload);
  if (event.type !== 'report.completed') return new Response('ignored', { status: 200 });

  const report = event.data?.object;
  const { data: v } = await admin
    .from('verifications')
    .select('id')
    .eq('provider', 'checkr')
    .eq('provider_ref', report.candidate_id)
    .in('status', ['processing', 'pending'])
    .maybeSingle();
  if (!v) return new Response('unknown candidate', { status: 200 });

  if (report.status === 'clear') {
    await svc('svc_complete_verification', { verification_id: v.id, outcome: 'verified', valid_for: '1 year', extra_details: { report_id: report.id } });
  } else {
    await admin.from('verifications').update({ status: 'needs_review', details: { report_id: report.id, result: report.status } }).eq('id', v.id);
  }
  return new Response('ok', { status: 200 });
});
