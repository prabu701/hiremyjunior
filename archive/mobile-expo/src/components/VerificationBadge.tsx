import type { Enums } from '@hmj/shared';
import { Badge } from '@hmj/ui';

const COPY: Record<Enums<'verification_status'>, { label: string; tone: 1 | 2 | 3 }> = {
  pending: { label: 'Started', tone: 1 },
  processing: { label: 'In progress', tone: 2 },
  needs_review: { label: 'In review', tone: 2 },
  verified: { label: 'Verified', tone: 3 },
  failed: { label: "Didn't pass", tone: 1 },
  canceled: { label: 'Canceled', tone: 1 },
};

export function VerificationBadge({ status }: { status: Enums<'verification_status'> | null | undefined }) {
  if (!status) return <Badge label="Not started" tone={1} />;
  const c = COPY[status];
  return <Badge label={c.label} tone={c.tone} />;
}
