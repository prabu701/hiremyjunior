/** Roles a person can pick for themselves at sign-up. `admin` is granted by ops only. */
export const SELF_SERVE_ROLES = ['junior', 'parent', 'employer'] as const;
export type SelfServeRole = (typeof SELF_SERVE_ROLES)[number];
export type AppRole = SelfServeRole | 'admin';

export const ROLE_COPY: Record<SelfServeRole, { label: string; title: string; tagline: string }> = {
  junior: { label: 'Teen', title: "I'm a Teen", tagline: 'Find jobs near you' },
  parent: { label: 'Parent', title: "I'm a Parent", tagline: 'Approve and track jobs' },
  employer: { label: 'Employer', title: "I'm an Employer", tagline: 'Post jobs, hire teens' },
};

export function isSelfServeRole(value: unknown): value is SelfServeRole {
  return typeof value === 'string' && (SELF_SERVE_ROLES as readonly string[]).includes(value);
}
