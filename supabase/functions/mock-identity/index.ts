// Local stand-in for Stripe Identity's hosted page. Reached only via the signed link from
// identity-start; lets a tester pass or fail the ID check. Disabled when Stripe keys are set.
import { hmacHex, safeEqual } from '../_shared/crypto.ts';
import { env, live } from '../_shared/env.ts';
import { admin, svc } from '../_shared/supabase.ts';

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{font:15px/1.5 -apple-system,system-ui,sans-serif;background:#f6f8fa;color:#1a1f36;margin:0;padding:24px;display:flex;justify-content:center}
  main{background:#fff;max-width:420px;width:100%;padding:28px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  h1{font-size:20px;margin:0 0 8px} p{color:#4f566b} .tag{display:inline-block;background:#fff4d6;color:#8a5a00;font-size:12px;padding:2px 8px;border-radius:99px}
  button{display:block;width:100%;padding:14px;border:0;border-radius:8px;font-size:15px;margin-top:12px;cursor:pointer}
  .pass{background:#635bff;color:#fff}.fail{background:#fff;color:#cd3d64;border:1px solid #e3e8ee}
  a{color:#635bff}
</style></head><body><main>${body}</main></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );

async function authorized(url: URL | URLSearchParams): Promise<string | null> {
  const params = url instanceof URL ? url.searchParams : url;
  const id = params.get('v') ?? '';
  const token = params.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return safeEqual(token, await hmacHex(env.jwtSecret, `mock-identity:${id}`)) ? id : null;
}

Deno.serve(async (req) => {
  if (live.stripeIdentity) return new Response('Not available when Stripe Identity is configured.', { status: 404 });
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = await authorized(url);
    if (!id) return page('Link expired', '<h1>This link is invalid</h1><p>Start ID verification again from the app.</p>');
    const { data: v } = await admin.from('verifications').select('status').eq('id', id).single();
    if (v?.status !== 'pending') return page('Already done', `<h1>Already finished</h1><p>You can return to <a href="${env.siteUrl}">HireMyJunior</a>.</p>`);
    return page(
      'Verify your identity',
      `<span class="tag">Simulated Stripe Identity</span>
       <h1>Verify your identity</h1>
       <p>In production this is where you photograph your driver's license and take a selfie. Locally, pick an outcome:</p>
       <form method="post"><input type="hidden" name="v" value="${id}"><input type="hidden" name="t" value="${url.searchParams.get('t')}">
         <button class="pass" name="outcome" value="verified">Simulate: ID verified</button>
         <button class="fail" name="outcome" value="failed">Simulate: document unreadable</button>
       </form>`,
    );
  }

  if (req.method === 'POST') {
    const form = new URLSearchParams(await req.text());
    const id = await authorized(form);
    if (!id) return page('Link expired', '<h1>This link is invalid</h1>');
    const outcome = form.get('outcome') === 'verified' ? 'verified' : 'failed';
    await svc('svc_complete_verification', {
      verification_id: id,
      outcome,
      reason: outcome === 'failed' ? "we couldn't read your document" : null,
    });
    return page(
      'Done',
      `<h1>${outcome === 'verified' ? 'Identity verified ✓' : 'Verification failed'}</h1>
       <p>${outcome === 'verified' ? 'You can close this tab and' : 'Close this tab and try again —'} return to <a href="${env.siteUrl}">HireMyJunior</a>.</p>`,
    );
  }

  return new Response('Method not allowed', { status: 405 });
});
