import { env } from './env.ts';

/**
 * Local stand-in for SMS and vendor e-mails: delivers into Mailpit (http://localhost:8025) so a
 * tester sees exactly what a real person would receive. Never used when a vendor is live.
 */
export async function sendToMailpit(to: string, subject: string, text: string, fromName = 'HireMyJunior (simulated)') {
  const res = await fetch(`${env.mailpitUrl}/api/v1/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      From: { Email: 'simulator@hiremyjunior.local', Name: fromName },
      To: [{ Email: to }],
      Subject: subject,
      Text: text,
    }),
  });
  if (!res.ok) throw new Error(`mailpit send failed: ${res.status} ${await res.text()}`);
}
