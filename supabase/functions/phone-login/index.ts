// Phone-number sign-in with a 4-digit code.
//   POST { action: 'start', phone }                         → { challenge_id, mode }
//   POST { action: 'verify', challenge_id, code?, role? }   → { session } | { needs_role: true }
//
// Code delivery, by configuration:
//   live — Twilio Verify (TWILIO_* set; configure the Verify service for 4-digit codes)
//   test — PHONE_LOGIN_TEST_CODE (e.g. 0000) accepted for every number; nothing is sent.
//          Only honoured when Twilio is NOT configured, so it can't become a production backdoor.
//   mock — a random code delivered to Mailpit (sms@hiremyjunior.local) as "SMS to +1…"
//
// After the code checks out, GoTrue issues a normal session: the account gets a fresh random
// password that is used once, here, for the password grant and never leaves this function.
import { createClient } from '@supabase/supabase-js';
import { randomDigits, safeEqual, sha256Hex, toHex } from '../_shared/crypto.ts';
import { env, live } from '../_shared/env.ts';
import { handler, HttpError, json, readJson } from '../_shared/http.ts';
import { sendToMailpit } from '../_shared/mailpit.ts';
import { admin, svc } from '../_shared/supabase.ts';

const MAX_STARTS_PER_HOUR = 5;
const MAX_CHECKS = 5;
const ROLES = ['junior', 'parent', 'employer'] as const;
type Role = (typeof ROLES)[number];

const mode = (): 'live' | 'test' | 'mock' => (live.twilio ? 'live' : env.phoneLoginTestCode ? 'test' : 'mock');

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
  if (!res.ok && res.status !== 404) {
    console.error('[twilio]', res.status, body);
    throw new HttpError(res.status === 429 ? 429 : 400, body?.message ?? 'Could not send the code.');
  }
  return res.ok ? body : null;
}

const randomPassword = () => toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);

/** Rotate the account's password and exchange it for a session (it never leaves this function). */
async function issueSession(userId: string, identity: { email?: string | null; phone?: string | null }) {
  const password = randomPassword();
  const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (upErr) throw new Error(`update password: ${upErr.message}`);
  const anon = createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = identity.email
    ? await anon.auth.signInWithPassword({ email: identity.email, password })
    : await anon.auth.signInWithPassword({ phone: identity.phone!, password });
  if (error || !data.session) throw new Error(`password grant: ${error?.message}`);
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'POST only');
    const body = await readJson<{ action: 'start' | 'verify'; phone?: string; challenge_id?: string; code?: string; role?: string }>(req);

    if (body.action === 'start') {
      const phone = normalizeUsPhone(body.phone ?? '');
      const m = mode();
      // Caps real messages per number. In test mode nothing is sent, so it would only get in the
      // way of testing; wrong guesses are still limited per code (MAX_CHECKS) in every mode.
      if (m !== 'test') {
        const { count } = await admin
          .from('phone_login_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('phone', phone)
          .gte('created_at', new Date(Date.now() - 3600_000).toISOString());
        if ((count ?? 0) >= MAX_STARTS_PER_HOUR) throw new HttpError(429, 'Too many codes requested for this number. Try again in an hour.');
      }

      let codeHash: string | null = null;
      if (m === 'live') {
        await twilio('Verifications', { To: phone, Channel: 'sms' });
      } else if (m === 'mock') {
        const code = randomDigits(4);
        codeHash = await sha256Hex(code);
        await sendToMailpit('sms@hiremyjunior.local', `SMS to ${phone}`, `Your HireMyJunior sign-in code is ${code}.\n\n(Simulated SMS.)`, 'SMS simulator');
      }
      const { data, error } = await admin
        .from('phone_login_challenges')
        .insert({ phone, provider: m === 'live' ? 'twilio' : m, code_hash: codeHash })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return json({ challenge_id: data.id, mode: m, phone });
    }

    if (body.action === 'verify') {
      const { data: ch } = await admin.from('phone_login_challenges').select('*').eq('id', body.challenge_id ?? '').maybeSingle();
      if (!ch || ch.consumed_at || new Date(ch.expires_at) < new Date()) throw new HttpError(400, 'That code expired. Request a new one.');

      if (!ch.verified_at) {
        if (ch.attempts >= MAX_CHECKS) throw new HttpError(429, 'Too many wrong codes. Request a new one.');
        const code = (body.code ?? '').replace(/\D/g, '');
        if (code.length !== 4) throw new HttpError(400, 'Enter the 4-digit code.');
        let ok = false;
        if (ch.provider === 'twilio') ok = (await twilio('VerificationCheck', { To: ch.phone, Code: code }))?.status === 'approved';
        else if (ch.provider === 'test') ok = !live.twilio && !!env.phoneLoginTestCode && safeEqual(code, env.phoneLoginTestCode);
        else ok = !!ch.code_hash && safeEqual(await sha256Hex(code), ch.code_hash);
        if (!ok) {
          await admin.from('phone_login_challenges').update({ attempts: ch.attempts + 1 }).eq('id', ch.id);
          throw new HttpError(400, "That code isn't right. Check it and try again.");
        }
        await admin.from('phone_login_challenges').update({ verified_at: new Date().toISOString() }).eq('id', ch.id);
      }

      const accounts = await svc<{ user_id: string; email: string | null; auth_phone: string | null; role: string; status: string }[]>(
        'svc_find_accounts_by_phone', { e164: ch.phone },
      );
      if (accounts.length > 1) throw new HttpError(409, 'This number is on more than one account. Sign in with your email instead.');

      let account = accounts[0];
      let created = false;
      if (!account) {
        const role = body.role as Role | undefined;
        if (!role) return json({ needs_role: true });
        if (!ROLES.includes(role)) throw new HttpError(400, 'Choose Teen, Parent or Employer.');
        const { data, error } = await admin.auth.admin.createUser({ phone: ch.phone, phone_confirm: true, user_metadata: { role } });
        if (error || !data.user) {
          console.error('[phone-login] createUser', error);
          throw new HttpError(409, 'We couldn’t create an account for this number. Try signing in with email.');
        }
        account = { user_id: data.user.id, email: null, auth_phone: data.user.phone ?? null, role, status: 'pending' };
        created = true;
      }
      if (account.status === 'suspended') throw new HttpError(403, 'This account is suspended. Contact support.');

      // Possession of the number is proven, so it counts as a verified phone for the account.
      await svc('svc_mark_phone_verified', { uid: account.user_id, verified_phone: ch.phone });
      const session = await issueSession(account.user_id, { email: account.email, phone: account.auth_phone ? `+${account.auth_phone.replace(/^\+/, '')}` : ch.phone });
      await admin.from('phone_login_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', ch.id);
      return json({ session, created });
    }

    throw new HttpError(400, 'Unknown action');
  }),
);
