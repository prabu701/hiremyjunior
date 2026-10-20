// A parent's invite link (/join/CODE) parks the code in a cookie so it survives the teen's
// sign-up and onboarding, then the link-parent page uses it automatically.
export const INVITE_COOKIE = 'hmj-invite';

export function readInviteCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${INVITE_COOKIE}=([A-Z0-9]{8})`));
  return m?.[1] ?? null;
}

export function clearInviteCookie() {
  document.cookie = `${INVITE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
