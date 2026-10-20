// POST { action: 'start', phone } → sends a code by SMS (Twilio Verify) or, locally, to Mailpit.
// POST { action: 'check', code }  → confirms it and marks the profile's phone verified.
import { randomDigits, safeEqual, sha256Hex } from '../_shared/crypto.ts';
import { env, live } from '../_shared/env.ts';
import { handler, HttpError, json, readJson } from '../_shared/http.ts';
import { sendToMailpit } from '../_shared/mailpit.ts';
import { admin, requireCaller, svc } from '../_shared/supabase.ts';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CHECKS = 5;
const MAX_SENDS_PER_HOUR = 5;

/** US numbers only for the WA pilot. Returns E.164 or throws. */
function normalizeUsPhone(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) throw new HttpError(400, 'Enter a 10-digit US mobile number.');
  return `+1${ten}`;
}

async function twilio(path: string, form: Record<string, string>) {
  const { accountSid, authToken, verifyServiceSid } = env.twilio;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/${path}`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error('[twilio]', res.status, body);
    throw new HttpError(res.status === 429 ? 429 : 400, body?.message ?? 'Could not send the code.');
  }
  return body;
}

async function livePhoneAttempt(uid: string) {
  const { data } = await admin
    .from('verifications')
    .select('*')
    .eq('subject_id', uid)
    .eq('kind', 'phone')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const caller = await requireCaller(req);
    const body = await readJson<{ action: 'start' | 'check'; phone?: string; code?: string }>(req);

    if (body.action === 'start') {
      const phone = normalizeUsPhone(body.phone ?? '');
      const { count } = await admin
        .from('verifications')
        .select('id', { count: 'exact', head: true })
        .eq('subject_id', caller.id)
        .eq('kind', 'phone')
        .gte('created_at', new Date(Date.now() - 3600_000).toISOString());
      if ((count ?? 0) >= MAX_SENDS_PER_HOUR) throw new HttpError(429, 'Too many codes requested. Try again in an hour.');

      if (live.twilio) {
        const v = await twilio('Verifications', { To: phone, Channel: 'sms' });
        await svc('svc_start_verification', { uid: caller.id, k: 'phone', provider: 'twilio', provider_ref: v.sid, details: { phone } });
        return json({ sent: true, mode: 'live' });
      }

      const code = randomDigits(6);
      await svc('svc_start_verification', {
        uid: caller.id, k: 'phone', provider: 'mock_twilio', details: { phone },
        secret: { code_hash: await sha256Hex(code), expires_at: Date.now() + CODE_TTL_MS, checks: 0 },
      });
      await sendToMailpit(
        caller.email ?? 'unknown@hiremyjunior.local',
        `SMS to ${phone}`,
        `Your HireMyJunior verification code is ${code}. It expires in 10 minutes.\n\n(Simulated SMS — set TWILIO_* in .env to send real texts.)`,
        'SMS simulator',
      );
      return json({ sent: true, mode: 'mock' });
    }

    if (body.action === 'check') {
      const code = (body.code ?? '').replace(/\D/g, '');
      if (code.length !== 6) throw new HttpError(400, 'Enter the 6-digit code.');
      const attempt = await livePhoneAttempt(caller.id);
      if (!attempt) throw new HttpError(400, 'Request a new code first.');
      const phone = attempt.details.phone as string;

      let ok = false;
      if (attempt.provider === 'twilio') {
        const check = await twilio('VerificationCheck', { To: phone, Code: code });
        ok = check.status === 'approved';
      } else {
        const secret = attempt.secret as { code_hash: string; expires_at: number; checks: number };
        if (Date.now() > secret.expires_at) throw new HttpError(400, 'That code expired. Request a new one.');
        if (secret.checks >= MAX_CHECKS) throw new HttpError(429, 'Too many wrong codes. Request a new one.');
        ok = safeEqual(await sha256Hex(code), secret.code_hash);
        if (!ok) await admin.from('verifications').update({ secret: { ...secret, checks: secret.checks + 1 } }).eq('id', attempt.id);
      }
      if (!ok) throw new HttpError(400, "That code isn't right. Check the latest text and try again.");

      await svc('svc_complete_verification', { verification_id: attempt.id, outcome: 'verified' });
      await svc('svc_mark_phone_verified', { uid: caller.id, verified_phone: phone });
      return json({ verified: true, phone });
    }

    throw new HttpError(400, 'Unknown action');
  }),
);
