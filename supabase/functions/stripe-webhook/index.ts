// Stripe webhook (Identity events now; payment events join in Phase 9).
// Verifies the Stripe-Signature header (HMAC-SHA256 over "t.payload", 5-minute tolerance).
import { hmacHex, safeEqual } from '../_shared/crypto.ts';
import { env } from '../_shared/env.ts';
import { admin, svc } from '../_shared/supabase.ts';

const TOLERANCE_S = 300;

async function verifySignature(header: string | null, payload: string): Promise<boolean> {
  if (!header || !env.stripe.webhookSecret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  const v1s = header.split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  if (!t || !v1s.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;
  const expected = await hmacHex(env.stripe.webhookSecret, `${t}.${payload}`);
  return v1s.some((sig) => safeEqual(sig, expected));
}

const FAILURE_COPY: Record<string, string> = {
  document_expired: 'your ID has expired',
  document_unverified_other: "we couldn't verify your document",
  document_type_not_supported: 'that type of ID isn’t supported',
  selfie_face_mismatch: "the selfie didn't match the ID photo",
  selfie_document_missing_photo: 'the ID has no photo',
  consent_declined: 'consent was declined',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const payload = await req.text();
  if (!(await verifySignature(req.headers.get('stripe-signature'), payload))) {
    return new Response('invalid signature', { status: 400 });
  }
  const event = JSON.parse(payload);
  const session = event.data?.object;

  if (typeof event.type === 'string' && event.type.startsWith('identity.verification_session.')) {
    const { data: v } = await admin.from('verifications').select('id').eq('provider', 'stripe_identity').eq('provider_ref', session.id).maybeSingle();
    if (!v) return new Response('unknown session', { status: 200 }); // not ours / already cleaned up
    if (event.type === 'identity.verification_session.verified') {
      await svc('svc_complete_verification', { verification_id: v.id, outcome: 'verified' });
    } else if (event.type === 'identity.verification_session.requires_input') {
      const code = session.last_error?.code as string | undefined;
      await svc('svc_complete_verification', { verification_id: v.id, outcome: 'failed', reason: (code && FAILURE_COPY[code]) ?? 'the ID check could not be completed' });
    } else if (event.type === 'identity.verification_session.canceled') {
      await svc('svc_complete_verification', { verification_id: v.id, outcome: 'canceled' });
    }
  }
  return new Response('ok', { status: 200 });
});
