/** Maps GoTrue messages to copy a 14-year-old (or their parent) can act on. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('expired') || (m.includes('invalid') && m.includes('token'))) return 'That code is wrong or has expired. Check the latest email or resend.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Too many attempts — wait a few seconds and try again.';
  if (m.includes('invalid sign-up role') || m.includes('database error saving new user')) return "We couldn't create that account. Go back and pick Teen, Parent or Employer.";
  if (m.includes('signups not allowed') || m.includes('otp_disabled')) return 'No account with that email.';
  if (m.includes('fetch') || m.includes('network')) return "Can't reach HireMyJunior. Check your connection and try again.";
  return message;
}
